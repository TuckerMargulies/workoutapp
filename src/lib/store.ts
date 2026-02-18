// ============================================================
// Local-storage-backed store for all databases
// Client-side only — will migrate to Supabase/Firebase later
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

// ---- helpers ----
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

// ---- DB 1A: Exercises ----
const EX_KEY = "workout_db1a_exercises";
export function getExercises(): Exercise[] {
  return load<Exercise[]>(EX_KEY, defaultExercises);
}
export function saveExercises(data: Exercise[]) {
  save(EX_KEY, data);
}

// ---- DB 1B: Workout Groups ----
const GR_KEY = "workout_db1b_groups";
export function getWorkoutGroups(): WorkoutGroup[] {
  return load<WorkoutGroup[]>(GR_KEY, defaultWorkoutGroups);
}
export function saveWorkoutGroups(data: WorkoutGroup[]) {
  save(GR_KEY, data);
}

// ---- DB 2: Tracking ----
const LOG_KEY = "workout_db2_logs";
export function getWorkoutLogs(): WorkoutLog[] {
  return load<WorkoutLog[]>(LOG_KEY, []);
}
export function saveWorkoutLog(log: WorkoutLog) {
  const logs = getWorkoutLogs();
  logs.unshift(log);
  save(LOG_KEY, logs);
}
export function saveAllWorkoutLogs(logs: WorkoutLog[]) {
  save(LOG_KEY, logs);
}

// ---- DB 3A: Breakdown Preferences ----
const BP_KEY = "workout_db3a_breakdown";
export function getBreakdownPreferences(): BreakdownPreference[] {
  return load<BreakdownPreference[]>(BP_KEY, defaultBreakdownPreferences);
}
export function saveBreakdownPreferences(data: BreakdownPreference[]) {
  save(BP_KEY, data);
}

// ---- DB 3B: Locations & Equipment ----
const LOC_KEY = "workout_db3b_locations";
export function getLocations(): LocationConfig[] {
  return load<LocationConfig[]>(LOC_KEY, defaultLocations);
}
export function saveLocations(data: LocationConfig[]) {
  save(LOC_KEY, data);
}

// ---- Transient: Current Workout Plan ----
const PLAN_KEY = "workout_current_plan";
export function getCurrentPlan(): WorkoutPlan | null {
  return load<WorkoutPlan | null>(PLAN_KEY, null);
}
export function saveCurrentPlan(plan: WorkoutPlan) {
  save(PLAN_KEY, plan);
}
export function clearCurrentPlan() {
  if (typeof window !== "undefined") localStorage.removeItem(PLAN_KEY);
}

// ---- Transient: Current exercise index ----
const IDX_KEY = "workout_current_idx";
export function getCurrentExerciseIndex(): number {
  return load<number>(IDX_KEY, 0);
}
export function saveCurrentExerciseIndex(idx: number) {
  save(IDX_KEY, idx);
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
