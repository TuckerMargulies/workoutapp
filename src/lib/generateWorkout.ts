// ============================================================
// Core Workout Generation Algorithm
// ============================================================
import {
  Exercise,
  WorkoutGroup,
  WorkoutPlan,
  PlannedExercise,
  WorkoutLog,
  BreakdownPreference,
  LocationConfig,
  ExerciseType,
} from "./types";
import {
  getExercises,
  getWorkoutGroups,
  getWorkoutLogs,
  getBreakdownPreferences,
  getLocations,
} from "./store";

/**
 * Generate a workout based on the user's selections on Screen 1a.
 *
 * @param totalTimeSec   Total time available in seconds
 * @param locationName   Selected location name
 * @param equipmentOverride  If customized, the list of available equipment; null = use location defaults
 * @param selectedGoals  List of goal types selected (empty = "Plan For Me")
 */
export function generateWorkout(
  totalTimeSec: number,
  locationName: string,
  equipmentOverride: string[] | null,
  selectedGoals: string[]
): WorkoutPlan {
  const usableTime = Math.floor(totalTimeSec * 0.9); // 90% cap

  // Load databases
  const allExercises = getExercises();
  const allGroups = getWorkoutGroups();
  const logs = getWorkoutLogs();
  const breakdownPrefs = getBreakdownPreferences();
  const locations = getLocations();

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
  const eligible = allExercises.filter((ex) => {
    // Check setting
    if (
      ex.setting !== "any" &&
      ex.setting.toLowerCase() !== locationName.toLowerCase()
    ) {
      return false;
    }
    // Check equipment — every required piece must be available OR exercise needs none
    if (ex.equipment.length > 0) {
      return ex.equipment.every((eq) => availableEquipment.includes(eq));
    }
    return true;
  });

  // Decide what types to include
  let targetTypes: { type: string; weight: number }[] = [];

  if (selectedGoals.length > 0) {
    // User explicitly picked goals — supersede DB 3A
    targetTypes = selectedGoals.map((g) => ({ type: g, weight: 1 }));
  } else {
    // "Plan For Me" — use breakdown prefs cross-referenced with history
    targetTypes = pickTypesFromHistory(breakdownPrefs, logs);
  }

  // Collect candidate exercises per target type
  const selected: PlannedExercise[] = [];
  let remainingTime = usableTime;

  for (const target of targetTypes) {
    if (remainingTime <= 0) break;

    const t = target.type.toLowerCase();

    // Try to find a matching group first (to keep groups together)
    const matchingGroup = allGroups.find((g) => {
      const matchType = g.types.some((gt) => gt === t);
      const matchApp = g.applications.some((a) => a.toLowerCase() === t);
      return matchType || matchApp;
    });

    let candidateExercises: Exercise[] = [];

    if (matchingGroup) {
      // Use all exercises from the group that are eligible
      candidateExercises = matchingGroup.exerciseIds
        .map((id) => eligible.find((e) => e.id === id))
        .filter((e): e is Exercise => !!e);
    }

    // Fallback: pick from eligible by type or application
    if (candidateExercises.length === 0) {
      candidateExercises = eligible.filter(
        (e) =>
          e.type === t || e.applications.some((a) => a.toLowerCase() === t)
      );
    }

    // Shuffle and pick exercises that fit in remaining time
    shuffleArray(candidateExercises);

    for (const ex of candidateExercises) {
      if (remainingTime <= 0) break;
      if (selected.some((s) => s.exerciseId === ex.id)) continue; // no dupes

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

      remainingTime -= ex.timeBased ? ex.defaultTimeSec : ex.defaultTimeSec * 3;
    }
  }

  // If there's still time, pad with mobility/stretching
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

// ---- Helpers ----

/**
 * Decide which exercise types are "due" based on frequency prefs + history.
 * Returns types sorted by how overdue they are.
 */
function pickTypesFromHistory(
  prefs: BreakdownPreference[],
  logs: WorkoutLog[]
): { type: string; weight: number }[] {
  const now = Date.now();
  const dayMs = 86_400_000;

  return prefs
    .map((p) => {
      const intervalDays = 7 / p.frequency; // e.g. 3x/week = every 2.33 days
      // Find most recent workout that included this type
      let lastDone = 0;
      for (const log of logs) {
        const logDate = new Date(log.date).getTime();
        const hasType = log.exercises.some((e) => {
          const ex = getExercises().find((x) => x.id === e.exerciseId);
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
      const overdueFactor = daysSinceLast / intervalDays; // >1 means overdue
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
