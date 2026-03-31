// ============================================================
// Hybrid store: AsyncStorage for fast reads + Supabase for persistence
// All reads come from AsyncStorage; writes go to both AsyncStorage & Supabase
// On login, data is pulled from Supabase and cached locally
// Ported from Next.js localStorage version — same interface, different storage
// ============================================================
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Exercise,
  WorkoutGroup,
  WorkoutLog,
  BreakdownPreference,
  LocationConfig,
  WorkoutPlan,
  UserMemory,
  ShortTermInjury,
} from "./types";
import { defaultExercises, defaultWorkoutGroups } from "../data/exercises";
import {
  defaultBreakdownPreferences,
  defaultLocations,
  ALL_EQUIPMENT,
} from "../data/defaults";
import { createClient } from "./supabase";

// ---- AsyncStorage helpers (async reads, same API feel as localStorage) ----
export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function save<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("AsyncStorage save error:", e);
  }
}

// ---- Supabase helper: get current user id ----
async function getUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ---- DB 1A: Exercises (static seed data, kept local-only) ----
const EX_KEY = "workout_db1a_exercises";
export async function getExercises(): Promise<Exercise[]> {
  return load<Exercise[]>(EX_KEY, defaultExercises);
}
export async function saveExercises(data: Exercise[]): Promise<void> {
  await save(EX_KEY, data);
}

// ---- DB 1B: Workout Groups (static seed data, kept local-only) ----
const GR_KEY = "workout_db1b_groups";
export async function getWorkoutGroups(): Promise<WorkoutGroup[]> {
  return load<WorkoutGroup[]>(GR_KEY, defaultWorkoutGroups);
}
export async function saveWorkoutGroups(data: WorkoutGroup[]): Promise<void> {
  await save(GR_KEY, data);
}

// ---- DB 2: Tracking (persisted to Supabase) ----
const LOG_KEY = "workout_db2_logs";
export async function getWorkoutLogs(): Promise<WorkoutLog[]> {
  return load<WorkoutLog[]>(LOG_KEY, []);
}
export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  const logs = await getWorkoutLogs();
  logs.unshift(log);
  await save(LOG_KEY, logs);
  syncWorkoutLogToSupabase(log); // fire-and-forget
}
export async function saveAllWorkoutLogs(logs: WorkoutLog[]): Promise<void> {
  await save(LOG_KEY, logs);
}

export async function updateWorkoutLogById(
  id: string,
  patch: Partial<WorkoutLog>
): Promise<void> {
  const logs = await getWorkoutLogs();
  const idx = logs.findIndex((l) => l.id === id);
  if (idx < 0) return;
  logs[idx] = { ...logs[idx], ...patch };
  await save(LOG_KEY, logs);
}

async function syncWorkoutLogToSupabase(log: WorkoutLog): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from("workout_logs").upsert({
    id: log.id,
    user_id: userId,
    date: log.date,
    total_time_allotted_sec: log.totalTimeAllottedSec,
    total_time_elapsed_sec: log.totalTimeElapsedSec,
    location: log.location,
    equipment: log.equipment,
    exercises: log.exercises,
    voice_adjustments: log.voiceAdjustments ?? [],
    bio_status_flags: log.bioStatusFlags ?? [],
  });
}

// ---- DB 3A: Breakdown Preferences (persisted to Supabase) ----
const BP_KEY = "workout_db3a_breakdown";
export async function getBreakdownPreferences(): Promise<BreakdownPreference[]> {
  return load<BreakdownPreference[]>(BP_KEY, defaultBreakdownPreferences);
}
export async function saveBreakdownPreferences(
  data: BreakdownPreference[]
): Promise<void> {
  await save(BP_KEY, data);
  syncPreferencesToSupabase({ breakdown_preferences: data });
}

// ---- DB 3B: Locations & Equipment (persisted to Supabase) ----
const LOC_KEY = "workout_db3b_locations";
export async function getLocations(): Promise<LocationConfig[]> {
  return load<LocationConfig[]>(LOC_KEY, defaultLocations);
}
export async function saveLocations(data: LocationConfig[]): Promise<void> {
  await save(LOC_KEY, data);
  syncPreferencesToSupabase({ locations: data });
}

async function syncPreferencesToSupabase(fields: {
  breakdown_preferences?: BreakdownPreference[];
  locations?: LocationConfig[];
}): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, ...fields }, { onConflict: "user_id" });
}

// ---- Transient: Current Workout Plan ----
const PLAN_KEY = "workout_current_plan";
export async function getCurrentPlan(): Promise<WorkoutPlan | null> {
  return load<WorkoutPlan | null>(PLAN_KEY, null);
}
export async function saveCurrentPlan(plan: WorkoutPlan): Promise<void> {
  await save(PLAN_KEY, plan);
  const idx = await getCurrentExerciseIndex();
  syncCurrentPlanToSupabase(plan, idx);
}
export async function clearCurrentPlan(): Promise<void> {
  await AsyncStorage.removeItem(PLAN_KEY);
  clearCurrentPlanFromSupabase();
}

async function syncCurrentPlanToSupabase(
  plan: WorkoutPlan,
  exerciseIndex: number
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase
    .from("current_plan")
    .upsert(
      { user_id: userId, plan, exercise_index: exerciseIndex },
      { onConflict: "user_id" }
    );
}

async function clearCurrentPlanFromSupabase(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from("current_plan").delete().eq("user_id", userId);
}

// ---- Transient: Current exercise index ----
const IDX_KEY = "workout_current_idx";
export async function getCurrentExerciseIndex(): Promise<number> {
  return load<number>(IDX_KEY, 0);
}
export async function saveCurrentExerciseIndex(idx: number): Promise<void> {
  await save(IDX_KEY, idx);
  const supabase = createClient();
  const userId = await getUserId();
  if (!userId) return;
  await supabase
    .from("current_plan")
    .update({ exercise_index: idx })
    .eq("user_id", userId);
}

// ---- User Profile (AsyncStorage — Pinecone in full version) ----
const PROFILE_KEY = "workout_user_profile";

export async function getUserProfile(): Promise<UserMemory | null> {
  return load<UserMemory | null>(PROFILE_KEY, null);
}

export async function saveUserProfile(profile: UserMemory): Promise<void> {
  await save(PROFILE_KEY, profile);
}

export async function updateShortTermInjury(
  userId: string,
  injury: ShortTermInjury
): Promise<void> {
  const profile = await getUserProfile();
  if (!profile) return;
  const existing = profile.shortTermInjuries.findIndex(
    (i) => i.area === injury.area
  );
  if (existing >= 0) {
    profile.shortTermInjuries[existing] = injury;
  } else {
    profile.shortTermInjuries.push(injury);
  }
  await saveUserProfile(profile);
}

export async function resolveShortTermInjury(area: string): Promise<void> {
  const profile = await getUserProfile();
  if (!profile) return;
  const injury = profile.shortTermInjuries.find((i) => i.area === area);
  if (injury) {
    injury.status = "healed";
    injury.lastChecked = new Date().toISOString().split("T")[0];
  }
  await saveUserProfile(profile);
}

// ---- Utility: list all unique equipment across DB 1A & 1B ----
export async function getAllEquipment(): Promise<string[]> {
  const exercises = await getExercises();
  const groups = await getWorkoutGroups();
  const set = new Set<string>(ALL_EQUIPMENT);
  exercises.forEach((e) => e.equipment.forEach((eq) => set.add(eq)));
  groups.forEach((g) => g.equipment.forEach((eq) => set.add(eq)));
  return Array.from(set).sort();
}

// ============================================================
// Sync: Pull all user data from Supabase → AsyncStorage
// Called on login / app mount when authenticated
// ============================================================
export async function pullFromSupabase(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const supabase = createClient();

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (prefs) {
    if (prefs.breakdown_preferences) {
      await save(BP_KEY, prefs.breakdown_preferences);
    }
    if (prefs.locations) {
      await save(LOC_KEY, prefs.locations);
    }
  }

  const { data: logs } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (logs && logs.length > 0) {
    const mapped: WorkoutLog[] = logs.map((l) => ({
      id: l.id,
      date: l.date,
      totalTimeAllottedSec: l.total_time_allotted_sec,
      totalTimeElapsedSec: l.total_time_elapsed_sec,
      location: l.location,
      equipment: l.equipment as string[],
      exercises: l.exercises as WorkoutLog["exercises"],
      voiceAdjustments: l.voice_adjustments ?? [],
      bioStatusFlags: l.bio_status_flags ?? [],
    }));
    await save(LOG_KEY, mapped);
  }

  const { data: plan } = await supabase
    .from("current_plan")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (plan) {
    await save(PLAN_KEY, plan.plan);
    await save(IDX_KEY, plan.exercise_index);
  }
}
