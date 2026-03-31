// ============================================================
// Workout Trainer — Core Type Definitions
// Expanded from Next.js app with voice, video, and memory fields
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

  // ---- Phase 3+ additions ----
  primaryMuscles: string[]; // e.g. ["quadriceps", "glutes"]
  contraindications: string[]; // e.g. ["knee_pain", "low_back_strain"]
  videoAssetUrl: string; // AI-generated clip URL (Veo/Kling) — empty until Phase 5
  audioCueUrl: string; // ElevenLabs pre-generated form cue — empty until Phase 6
  impactLevel: "low" | "medium" | "high";
  jointLoad: Record<string, "low" | "medium" | "high">; // { knee: "high", ankle: "medium" }
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
  voiceAdjustments?: VoiceAdjustment[]; // Phase 2+
  bioStatusFlags?: string[]; // Phase 3+: reported issues this session
  // Phase 5+: post-workout debrief
  debriefTranscript?: string;
  debriefSummary?: string;
  effortLevel?: "low" | "moderate" | "high";
  painNotes?: string[];
  completedExerciseNames?: string[];
  skippedExerciseNames?: string[];
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  exerciseName: string;
  timeSec: number; // time actually spent
  reps: number; // reps completed (0 for time-based)
  timePerRepSec: number; // calculated
  completed: boolean;
}

// ---- Phase 2+: Voice adjustment during workout ----
export interface VoiceAdjustment {
  timestamp: string;
  userSaid: string;
  zone: "green" | "yellow" | "red";
  action: "encourage" | "substitute" | "stop";
  exerciseSwapped?: { from: string; to: string };
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

export type WorkoutType = "strength" | "hiit" | "cardio" | "mobility" | "combined";

// ---------- Workout Plan (transient, used during a workout) ----------
export interface WorkoutPlan {
  id: string;
  date: string;
  totalTimeSec: number;
  location: string;
  equipment: string[];
  goals: string[]; // selected goal types
  exercises: PlannedExercise[];
  title: string;
  workoutType: WorkoutType;
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

// ---- Phase 1+: Injury Classification ----
export interface ChronicInjury {
  area: string; // e.g. "left knee", "lower back"
  description: string; // e.g. "ACL surgery 2022, avoid deep knee flexion"
  dateAdded: string; // ISO date
  isRehabGoal: boolean; // true = include rehab exercises targeting this area
}

export interface ShortTermInjury {
  area: string; // e.g. "right shoulder"
  description: string; // e.g. "tweaked during workout on 2026-03-26"
  dateReported: string; // ISO date
  lastChecked: string; // ISO date — updated each session check-in
  status: "active" | "improving" | "healed";
}

// ---- Phase 1+: Location + Equipment Profile ----
export interface LocationProfile {
  name: string; // e.g. "home gym", "commercial gym", "park"
  equipment: string[]; // equipment available at this specific location
  // e.g. ["1x 20kg kettlebell", "resistance bands", "dumbbells"]
  // e.g. ["full gym — barbells, cables, machines, dumbbells"]
  // e.g. [] = bodyweight only
}

// ---- Phase 1+: User Profile (stored in AsyncStorage, Pinecone in full version) ----
export interface UserMemory {
  userId: string;
  // Profile
  fitnessLevel: "beginner" | "intermediate" | "advanced";
  goals: string[]; // e.g. ["build strength", "lose weight", "rehab knee"]
  trainerName: string; // user's chosen name for their AI trainer
  voiceInputPreference: "push-to-talk" | "wake-word"; // set during onboarding
  trainingDaysPerWeek: number; // e.g. 4
  defaultLocation?: string; // primary workout location
  // Locations + equipment per location
  locationProfiles: LocationProfile[];
  // Injuries
  chronicInjuries: ChronicInjury[]; // permanent — always factored into workouts
  shortTermInjuries: ShortTermInjury[]; // active until user confirms healed
  // Session history
  recentSessionSummaries: string[]; // last 5 session summaries
  totalSessionsCompleted: number;
}

// ---- Phase 3+: Bio-status before a workout ----
export type BodyRegion =
  | "lower_back"
  | "upper_back"
  | "left_knee"
  | "right_knee"
  | "left_shoulder"
  | "right_shoulder"
  | "left_hip"
  | "right_hip"
  | "left_ankle"
  | "right_ankle"
  | "neck"
  | "wrists"
  | "core";

export interface BioStatus {
  flaggedRegions: BodyRegion[];
  notes?: string; // free-text from voice input
}
