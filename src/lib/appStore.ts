// ============================================================
// Zustand global app state
// Lightweight runtime state — persisted data lives in AsyncStorage via store.ts
// ============================================================
import { create } from "zustand";
import { WorkoutPlan, BioStatus, UserMemory } from "./types";

interface AppState {
  // Auth
  userId: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;

  // Active workout
  currentPlan: WorkoutPlan | null;
  currentExerciseIndex: number;
  isWorkoutActive: boolean;
  bioStatus: BioStatus | null;

  // Trainer / AI
  trainerName: string;
  userMemory: UserMemory | null;
  isTrainerSpeaking: boolean;

  // Voice
  isListening: boolean;
  lastTranscript: string;

  // Actions
  setAuth: (userId: string, email: string) => void;
  clearAuth: () => void;
  setCurrentPlan: (plan: WorkoutPlan) => void;
  clearCurrentPlan: () => void;
  setExerciseIndex: (idx: number) => void;
  setBioStatus: (status: BioStatus) => void;
  setTrainerName: (name: string) => void;
  setUserMemory: (memory: UserMemory) => void;
  setTrainerSpeaking: (speaking: boolean) => void;
  setListening: (listening: boolean) => void;
  setLastTranscript: (transcript: string) => void;
  startWorkout: () => void;
  endWorkout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  userId: null,
  userEmail: null,
  isAuthenticated: false,

  currentPlan: null,
  currentExerciseIndex: 0,
  isWorkoutActive: false,
  bioStatus: null,

  trainerName: "Coach",
  userMemory: null,
  isTrainerSpeaking: false,

  isListening: false,
  lastTranscript: "",

  // Actions
  setAuth: (userId, email) =>
    set({ userId, userEmail: email, isAuthenticated: true }),

  clearAuth: () =>
    set({
      userId: null,
      userEmail: null,
      isAuthenticated: false,
      currentPlan: null,
      currentExerciseIndex: 0,
      isWorkoutActive: false,
      userMemory: null,
    }),

  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  clearCurrentPlan: () => set({ currentPlan: null, currentExerciseIndex: 0 }),

  setExerciseIndex: (idx) => set({ currentExerciseIndex: idx }),

  setBioStatus: (status) => set({ bioStatus: status }),

  setTrainerName: (name) => set({ trainerName: name }),

  setUserMemory: (memory) => set({ userMemory: memory }),

  setTrainerSpeaking: (speaking) => set({ isTrainerSpeaking: speaking }),

  setListening: (listening) => set({ isListening: listening }),

  setLastTranscript: (transcript) => set({ lastTranscript: transcript }),

  startWorkout: () => set({ isWorkoutActive: true, currentExerciseIndex: 0 }),

  endWorkout: () =>
    set({
      isWorkoutActive: false,
      currentPlan: null,
      currentExerciseIndex: 0,
      bioStatus: null,
    }),
}));
