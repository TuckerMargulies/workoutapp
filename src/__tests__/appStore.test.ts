import { useAppStore } from "../lib/appStore";
import type { UserMemory, WorkoutPlan, BioStatus } from "../lib/types";

// Reset store between tests
beforeEach(() => {
  useAppStore.setState({
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
  });
});

describe("appStore", () => {
  // ---- Auth ----

  describe("auth", () => {
    it("starts unauthenticated", () => {
      const state = useAppStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.userId).toBeNull();
      expect(state.userEmail).toBeNull();
    });

    it("setAuth sets user info and isAuthenticated", () => {
      useAppStore.getState().setAuth("u1", "test@example.com");
      const state = useAppStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.userId).toBe("u1");
      expect(state.userEmail).toBe("test@example.com");
    });

    it("clearAuth resets auth and workout state", () => {
      useAppStore.getState().setAuth("u1", "test@example.com");
      useAppStore.getState().startWorkout();
      useAppStore.getState().clearAuth();

      const state = useAppStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.userId).toBeNull();
      expect(state.isWorkoutActive).toBe(false);
      expect(state.currentPlan).toBeNull();
      expect(state.userMemory).toBeNull();
    });
  });

  // ---- Workout state ----

  describe("workout", () => {
    it("setCurrentPlan stores plan", () => {
      const plan: WorkoutPlan = {
        id: "wp-1",
        date: "2026-03-31",
        totalTimeSec: 1800,
        location: "home",
        equipment: [],
        goals: [],
        exercises: [],
      };
      useAppStore.getState().setCurrentPlan(plan);
      expect(useAppStore.getState().currentPlan).toEqual(plan);
    });

    it("clearCurrentPlan resets plan and index", () => {
      useAppStore.getState().setExerciseIndex(5);
      useAppStore.getState().clearCurrentPlan();
      const state = useAppStore.getState();
      expect(state.currentPlan).toBeNull();
      expect(state.currentExerciseIndex).toBe(0);
    });

    it("startWorkout sets active and resets index", () => {
      useAppStore.getState().setExerciseIndex(3);
      useAppStore.getState().startWorkout();
      const state = useAppStore.getState();
      expect(state.isWorkoutActive).toBe(true);
      expect(state.currentExerciseIndex).toBe(0);
    });

    it("endWorkout clears active state", () => {
      useAppStore.getState().startWorkout();
      useAppStore.getState().endWorkout();
      const state = useAppStore.getState();
      expect(state.isWorkoutActive).toBe(false);
      expect(state.currentPlan).toBeNull();
    });

    it("setExerciseIndex updates index", () => {
      useAppStore.getState().setExerciseIndex(7);
      expect(useAppStore.getState().currentExerciseIndex).toBe(7);
    });

    it("setBioStatus updates status", () => {
      const bio: BioStatus = {
        flaggedRegions: ["lower_back"],
        notes: "sore from yesterday",
      };
      useAppStore.getState().setBioStatus(bio);
      expect(useAppStore.getState().bioStatus).toEqual(bio);
    });
  });

  // ---- Trainer / AI ----

  describe("trainer", () => {
    it("defaults trainer name to Coach", () => {
      expect(useAppStore.getState().trainerName).toBe("Coach");
    });

    it("setTrainerName updates name", () => {
      useAppStore.getState().setTrainerName("Sam");
      expect(useAppStore.getState().trainerName).toBe("Sam");
    });

    it("setUserMemory stores profile", () => {
      const memory: UserMemory = {
        userId: "u1",
        fitnessLevel: "advanced",
        goals: ["strength"],
        trainerName: "Coach Sam",
        voiceInputPreference: "push-to-talk",
        trainingDaysPerWeek: 5,
        locationProfiles: [],
        chronicInjuries: [],
        shortTermInjuries: [],
        recentSessionSummaries: [],
        totalSessionsCompleted: 50,
      };
      useAppStore.getState().setUserMemory(memory);
      expect(useAppStore.getState().userMemory).toEqual(memory);
    });

    it("setTrainerSpeaking toggles speaking state", () => {
      useAppStore.getState().setTrainerSpeaking(true);
      expect(useAppStore.getState().isTrainerSpeaking).toBe(true);
      useAppStore.getState().setTrainerSpeaking(false);
      expect(useAppStore.getState().isTrainerSpeaking).toBe(false);
    });
  });

  // ---- Voice ----

  describe("voice", () => {
    it("setListening toggles listening state", () => {
      useAppStore.getState().setListening(true);
      expect(useAppStore.getState().isListening).toBe(true);
      useAppStore.getState().setListening(false);
      expect(useAppStore.getState().isListening).toBe(false);
    });

    it("setLastTranscript stores transcript", () => {
      useAppStore.getState().setLastTranscript("Hello coach");
      expect(useAppStore.getState().lastTranscript).toBe("Hello coach");
    });
  });
});
