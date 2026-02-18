// ============================================================
// Workout App — Core Type Definitions
// ============================================================

// ---------- Database 1A: Exercise Library ----------
export interface Exercise {
  id: string;
  name: string;
  bodyArea: string; // e.g. "upper body pull", "lower body", "core", "full body"
  type: ExerciseType;
  equipment: string[]; // e.g. ["kettlebells","mat/floor"]
  setting: string; // e.g. "any", "pool", "outdoors", "gym"
  timeBased: boolean; // true = time-based, false = rep-based
  defaultTimeSec: number; // estimated total time in seconds (including setup)
  defaultReps: number; // goal reps (or approx reps for HIIT time-based)
  defaultDistance?: string; // for cardio: e.g. "1 mile"
  timePerRepSec: number; // seconds per rep estimate
  applications: string[]; // e.g. ["back pain","surfing"]
  description: string;
  groupIds: string[]; // which workout groups this belongs to
}

export type ExerciseType =
  | "resistance"
  | "mobility"
  | "cardio"
  | "breath hold"
  | "agility"
  | "stability"
  | "rehabilitation";

// ---------- Database 1B: Workout Groups ----------
export interface WorkoutGroup {
  id: string;
  name: string;
  bodyAreas: string[];
  types: ExerciseType[];
  equipment: string[];
  applications: string[];
  exerciseIds: string[];
}

// ---------- Database 2: Tracking ----------
export interface WorkoutLog {
  id: string;
  date: string; // ISO date
  totalTimeAllottedSec: number;
  totalTimeElapsedSec: number;
  location: string;
  equipment: string[];
  exercises: WorkoutExerciseLog[];
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  exerciseName: string;
  timeSec: number; // time actually spent
  reps: number; // reps completed (0 for time-based)
  timePerRepSec: number; // calculated
  completed: boolean;
}

// ---------- Database 3A: Breakdown Preferences ----------
export interface BreakdownPreference {
  type: string; // exercise type or specific goal name
  frequency: number; // 1-7 (times per week)
  isSpecificGoal: boolean;
}

// ---------- Database 3B: Locations & Equipment ----------
export interface LocationConfig {
  id: string;
  name: string;
  available: boolean;
  equipment: Record<string, boolean>; // equipment name => checked
}

// ---------- Workout Plan (transient, used during a workout) ----------
export interface WorkoutPlan {
  id: string;
  date: string;
  totalTimeSec: number;
  location: string;
  equipment: string[];
  goals: string[]; // selected goal types
  exercises: PlannedExercise[];
}

export interface PlannedExercise {
  exerciseId: string;
  name: string;
  timeBased: boolean;
  sets: number;
  reps: number;
  timeSec: number;
  description: string;
  bodyArea: string;
  type: ExerciseType;
}
