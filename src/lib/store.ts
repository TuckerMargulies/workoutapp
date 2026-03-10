// ============================================================
// Hybrid store: localStorage for fast reads + Supabase for persistence
// All reads come from localStorage; writes go to both localStorage & Supabase
// On login, data is pulled from Supabase and cached locally
// ============================================================
import {
  Exercise,
  WorkoutGroup,
  WorkoutLog,
  BreakdownPreference,
  LocationConfig,
  WorkoutPlan,
} from "./types";
import { defaultExercises, defaultWorkoutGroups } from "../data/exercises";
import {
  defaultBreakdownPreferences,
  defaultLocations,
  ALL_EQUIPMENT,
} from "../data/defaults";
import { createClient } from "./supabase/client";

// ---- localStorage helpers (unchanged — fast, synchronous reads) ----
function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---- Supabase helper: get current user id ----
async function getUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ---- DB 1A: Exercises (static seed data, kept local-only) ----
const EX_KEY = "workout_db1a_exercises";
export function getExercises(): Exercise[] {
  return load<Exercise[]>(EX_KEY, defaultExercises);
}
export function saveExercises(data: Exercise[]) {
  save(EX_KEY, data);
}

// ---- DB 1B: Workout Groups (static seed data, kept local-only) ----
const GR_KEY = "workout_db1b_groups";
export function getWorkoutGroups(): WorkoutGroup[] {
  return load<WorkoutGroup[]>(GR_KEY, defaultWorkoutGroups);
}
export function saveWorkoutGroups(data: WorkoutGroup[]) {
  save(GR_KEY, data);
}

// ---- DB 2: Tracking (persisted to Supabase) ----
const LOG_KEY = "workout_db2_logs";
export function getWorkoutLogs(): WorkoutLog[] {
  return load<WorkoutLog[]>(LOG_KEY, []);
}
export function saveWorkoutLog(log: WorkoutLog) {
  const logs = getWorkoutLogs();
  logs.unshift(log);
  save(LOG_KEY, logs);
  // Async persist to Supabase
  syncWorkoutLogToSupabase(log);
}
export function saveAllWorkoutLogs(logs: WorkoutLog[]) {
  save(LOG_KEY, logs);
}

async function syncWorkoutLogToSupabase(log: WorkoutLog) {
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
  });
}

// ---- DB 3A: Breakdown Preferences (persisted to Supabase) ----
const BP_KEY = "workout_db3a_breakdown";
export function getBreakdownPreferences(): BreakdownPreference[] {
  return load<BreakdownPreference[]>(BP_KEY, defaultBreakdownPreferences);
}
export function saveBreakdownPreferences(data: BreakdownPreference[]) {
  save(BP_KEY, data);
  syncPreferencesToSupabase({ breakdown_preferences: data });
}

// ---- DB 3B: Locations & Equipment (persisted to Supabase) ----
const LOC_KEY = "workout_db3b_locations";
export function getLocations(): LocationConfig[] {
  return load<LocationConfig[]>(LOC_KEY, defaultLocations);
}
export function saveLocations(data: LocationConfig[]) {
  save(LOC_KEY, data);
  syncPreferencesToSupabase({ locations: data });
}

async function syncPreferencesToSupabase(
  fields: { breakdown_preferences?: BreakdownPreference[]; locations?: LocationConfig[] }
) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from("user_preferences").upsert(
    { user_id: userId, ...fields },
    { onConflict: "user_id" }
  );
}

// ---- Transient: Current Workout Plan (persisted to Supabase) ----
const PLAN_KEY = "workout_current_plan";
export function getCurrentPlan(): WorkoutPlan | null {
  return load<WorkoutPlan | null>(PLAN_KEY, null);
}
export function saveCurrentPlan(plan: WorkoutPlan) {
  save(PLAN_KEY, plan);
  syncCurrentPlanToSupabase(plan);
}
export function clearCurrentPlan() {
  if (typeof window !== "undefined") localStorage.removeItem(PLAN_KEY);
  clearCurrentPlanFromSupabase();
}

async function syncCurrentPlanToSupabase(plan: WorkoutPlan) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from("current_plan").upsert(
    { user_id: userId, plan, exercise_index: getCurrentExerciseIndex() },
    { onConflict: "user_id" }
  );
}

async function clearCurrentPlanFromSupabase() {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from("current_plan").delete().eq("user_id", userId);
}

// ---- Transient: Current exercise index ----
const IDX_KEY = "workout_current_idx";
export function getCurrentExerciseIndex(): number {
  return load<number>(IDX_KEY, 0);
}
export function saveCurrentExerciseIndex(idx: number) {
  save(IDX_KEY, idx);
  syncExerciseIndexToSupabase(idx);
}

async function syncExerciseIndexToSupabase(idx: number) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase
    .from("current_plan")
    .update({ exercise_index: idx })
    .eq("user_id", userId);
}

// ---- Utility: list all unique equipment across DB 1A & 1B ----
export function getAllEquipment(): string[] {
  const exercises = getExercises();
  const groups = getWorkoutGroups();
  const set = new Set<string>(ALL_EQUIPMENT);
  exercises.forEach((e) => e.equipment.forEach((eq) => set.add(eq)));
  groups.forEach((g) => g.equipment.forEach((eq) => set.add(eq)));
  return Array.from(set).sort();
}

// ============================================================
// Sync: Pull all user data from Supabase → localStorage
// Called on login / app mount when authenticated
// ============================================================
export async function pullFromSupabase(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const supabase = createClient();

  // Pull preferences
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (prefs) {
    if (prefs.breakdown_preferences) {
      save(BP_KEY, prefs.breakdown_preferences);
    }
    if (prefs.locations) {
      save(LOC_KEY, prefs.locations);
    }
  }

  // Pull workout logs
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
    }));
    save(LOG_KEY, mapped);
  }

  // Pull current plan
  const { data: plan } = await supabase
    .from("current_plan")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (plan) {
    save(PLAN_KEY, plan.plan);
    save(IDX_KEY, plan.exercise_index);
  }
}
