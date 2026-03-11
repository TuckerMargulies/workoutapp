// ============================================================
// Core Workout Generation Algorithm
// Ported from Next.js app — now async (AsyncStorage-backed store)
// Bio-filter step added (Phase 3 — contraindications filter)
// ============================================================
import {
  Exercise,
  WorkoutGroup,
  WorkoutPlan,
  PlannedExercise,
  WorkoutLog,
  BreakdownPreference,
  LocationConfig,
  BioStatus,
} from "./types";
import {
  getExercises,
  getWorkoutGroups,
  getWorkoutLogs,
  getBreakdownPreferences,
  getLocations,
} from "./store";

/**
 * Generate a workout based on user selections.
 *
 * @param totalTimeSec       Total time available in seconds
 * @param locationName       Selected location name
 * @param equipmentOverride  If customized, the list of available equipment; null = use location defaults
 * @param selectedGoals      List of goal types selected (empty = "Plan For Me")
 * @param bioStatus          Optional: body regions flagged as sore/injured today
 */
export async function generateWorkout(
  totalTimeSec: number,
  locationName: string,
  equipmentOverride: string[] | null,
  selectedGoals: string[],
  bioStatus?: BioStatus
): Promise<WorkoutPlan> {
  const usableTime = Math.floor(totalTimeSec * 0.9); // 90% cap

  const allExercises = await getExercises();
  const allGroups = await getWorkoutGroups();
  const logs = await getWorkoutLogs();
  const breakdownPrefs = await getBreakdownPreferences();
  const locations = await getLocations();

  // Resolve equipment
  const loc = locations.find((l) => l.name === locationName);
  const availableEquipment: string[] =
    equipmentOverride ??
    (loc
      ? Object.entries(loc.equipment)
          .filter(([, v]) => v)
          .map(([k]) => k)
      : []);

  // Filter exercises by location setting + available equipment
  let eligible = allExercises.filter((ex) => {
    if (
      ex.setting !== "any" &&
      ex.setting.toLowerCase() !== locationName.toLowerCase()
    ) {
      return false;
    }
    if (ex.equipment.length > 0) {
      return ex.equipment.every((eq) => availableEquipment.includes(eq));
    }
    return true;
  });

  // Phase 3: Bio-status filter — remove contraindicated exercises
  if (bioStatus && bioStatus.flaggedRegions.length > 0) {
    eligible = applyBioFilter(eligible, bioStatus, allExercises);
  }

  // Decide what types to include
  let targetTypes: { type: string; weight: number }[] = [];

  if (selectedGoals.length > 0) {
    targetTypes = selectedGoals.map((g) => ({ type: g, weight: 1 }));
  } else {
    targetTypes = await pickTypesFromHistory(breakdownPrefs, logs);
  }

  // Collect candidate exercises per target type
  const selected: PlannedExercise[] = [];
  let remainingTime = usableTime;

  for (const target of targetTypes) {
    if (remainingTime <= 0) break;

    const t = target.type.toLowerCase();

    const matchingGroup = allGroups.find((g) => {
      const matchType = g.types.some((gt) => gt === t);
      const matchApp = g.applications.some((a) => a.toLowerCase() === t);
      return matchType || matchApp;
    });

    let candidateExercises: Exercise[] = [];

    if (matchingGroup) {
      candidateExercises = matchingGroup.exerciseIds
        .map((id) => eligible.find((e) => e.id === id))
        .filter((e): e is Exercise => !!e);
    }

    if (candidateExercises.length === 0) {
      candidateExercises = eligible.filter(
        (e) =>
          e.type === t || e.applications.some((a) => a.toLowerCase() === t)
      );
    }

    shuffleArray(candidateExercises);

    for (const ex of candidateExercises) {
      if (remainingTime <= 0) break;
      if (selected.some((s) => s.exerciseId === ex.id)) continue;

      const exTime = ex.defaultTimeSec;
      if (exTime > remainingTime) continue;

      selected.push({
        exerciseId: ex.id,
        name: ex.name,
        timeBased: ex.timeBased,
        sets: ex.timeBased ? 1 : 3,
        reps: ex.defaultReps,
        timeSec: ex.timeBased ? ex.defaultTimeSec : ex.defaultTimeSec * 3,
        description: ex.description,
        bodyArea: ex.bodyArea,
        type: ex.type,
      });

      remainingTime -= ex.timeBased
        ? ex.defaultTimeSec
        : ex.defaultTimeSec * 3;
    }
  }

  // Pad with mobility if time left
  if (remainingTime > 60) {
    const fillers = eligible.filter(
      (e) =>
        e.type === "mobility" && !selected.some((s) => s.exerciseId === e.id)
    );
    shuffleArray(fillers);
    for (const ex of fillers) {
      if (remainingTime <= 60) break;
      const t = ex.defaultTimeSec;
      if (t > remainingTime) continue;
      selected.push({
        exerciseId: ex.id,
        name: ex.name,
        timeBased: ex.timeBased,
        sets: 1,
        reps: ex.defaultReps,
        timeSec: t,
        description: ex.description,
        bodyArea: ex.bodyArea,
        type: ex.type,
      });
      remainingTime -= t;
    }
  }

  return {
    id: `wp-${Date.now()}`,
    date: new Date().toISOString(),
    totalTimeSec: usableTime,
    location: locationName,
    equipment: availableEquipment,
    goals: selectedGoals,
    exercises: selected,
  };
}

// ---- Phase 3: Bio-filter + smart substitution ----

/**
 * Remove exercises where contraindications overlap with the user's flagged body regions.
 * The flagged region names are mapped to contraindication strings.
 */
function applyBioFilter(
  exercises: Exercise[],
  bioStatus: BioStatus,
  _allExercises: Exercise[]
): Exercise[] {
  // Map BodyRegion values to contraindication strings used in exercise data
  const contraindicationMap: Record<string, string[]> = {
    lower_back: ["low_back_strain", "lower_back_pain"],
    upper_back: ["upper_back_pain"],
    left_knee: ["knee_pain", "left_knee_pain"],
    right_knee: ["knee_pain", "right_knee_pain"],
    left_shoulder: ["shoulder_impingement", "left_shoulder_pain"],
    right_shoulder: ["shoulder_impingement", "right_shoulder_pain"],
    left_hip: ["left_hip_pain", "hip_pain"],
    right_hip: ["right_hip_pain", "hip_pain"],
    left_ankle: ["left_ankle_pain", "ankle_pain"],
    right_ankle: ["right_ankle_pain", "ankle_pain"],
    neck: ["neck_pain"],
    wrists: ["wrist_pain"],
    core: [],
  };

  // Build the set of active contraindications from flagged regions
  const activeContraindications = new Set<string>();
  for (const region of bioStatus.flaggedRegions) {
    const mapped = contraindicationMap[region] ?? [];
    mapped.forEach((c) => activeContraindications.add(c));
  }

  if (activeContraindications.size === 0) return exercises;

  return exercises.filter((ex) => {
    return !ex.contraindications.some((c) => activeContraindications.has(c));
  });
}

// ---- Helpers ----

async function pickTypesFromHistory(
  prefs: BreakdownPreference[],
  logs: WorkoutLog[]
): Promise<{ type: string; weight: number }[]> {
  const now = Date.now();
  const dayMs = 86_400_000;
  const exercises = await getExercises();

  return prefs
    .map((p) => {
      const intervalDays = 7 / p.frequency;
      let lastDone = 0;
      for (const log of logs) {
        const logDate = new Date(log.date).getTime();
        const hasType = log.exercises.some((e) => {
          const ex = exercises.find((x) => x.id === e.exerciseId);
          if (!ex) return false;
          return (
            ex.type === p.type ||
            ex.applications.some(
              (a) => a.toLowerCase() === p.type.toLowerCase()
            )
          );
        });
        if (hasType && logDate > lastDone) lastDone = logDate;
      }
      const daysSinceLast =
        lastDone === 0 ? 999 : (now - lastDone) / dayMs;
      const overdueFactor = daysSinceLast / intervalDays;
      return { type: p.type, weight: overdueFactor };
    })
    .sort((a, b) => b.weight - a.weight);
}

function shuffleArray<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
