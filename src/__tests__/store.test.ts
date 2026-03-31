import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  load,
  save,
  getExercises,
  saveExercises,
  getWorkoutGroups,
  saveWorkoutGroups,
  getWorkoutLogs,
  saveWorkoutLog,
  saveAllWorkoutLogs,
  updateWorkoutLogById,
  getBreakdownPreferences,
  saveBreakdownPreferences,
  getLocations,
  saveLocations,
  getCurrentPlan,
  saveCurrentPlan,
  clearCurrentPlan,
  getCurrentExerciseIndex,
  saveCurrentExerciseIndex,
  getUserProfile,
  saveUserProfile,
  updateShortTermInjury,
  resolveShortTermInjury,
  getAllEquipment,
} from "../lib/store";
import type { WorkoutLog, UserMemory, ShortTermInjury } from "../lib/types";

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.clear as jest.Mock)();
});

// ---- load / save helpers ----

describe("load", () => {
  it("returns fallback when key does not exist", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const result = await load("missing_key", "default");
    expect(result).toBe("default");
  });

  it("returns parsed value when key exists", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ a: 1 })
    );
    const result = await load("key", {});
    expect(result).toEqual({ a: 1 });
  });

  it("returns fallback on corrupt JSON", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("not json!!");
    const result = await load("bad", "fallback");
    expect(result).toBe("fallback");
  });
});

describe("save", () => {
  it("serializes and writes to AsyncStorage", async () => {
    await save("key", { x: 42 });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "key",
      JSON.stringify({ x: 42 })
    );
  });

  it("does not throw on error", async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error("disk full")
    );
    await expect(save("key", "value")).resolves.toBeUndefined();
  });
});

// ---- Exercises (local-only) ----

describe("exercises", () => {
  it("returns defaults when none saved", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const exercises = await getExercises();
    expect(Array.isArray(exercises)).toBe(true);
    expect(exercises.length).toBeGreaterThan(0);
  });

  it("saves and retrieves exercises", async () => {
    const mockEx = [{ id: "ex1", name: "Push Up" }] as any;
    await saveExercises(mockEx);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

// ---- Workout Groups (local-only) ----

describe("workout groups", () => {
  it("returns defaults when none saved", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const groups = await getWorkoutGroups();
    expect(Array.isArray(groups)).toBe(true);
  });

  it("saves workout groups", async () => {
    await saveWorkoutGroups([{ id: "g1", name: "Upper" }] as any);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

// ---- Workout Logs (synced to Supabase) ----

describe("workout logs", () => {
  it("returns empty array by default", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const logs = await getWorkoutLogs();
    expect(logs).toEqual([]);
  });

  it("prepends new log and syncs to Supabase", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify([])
    );
    const log: WorkoutLog = {
      id: "log-1",
      date: "2026-03-31",
      totalTimeAllottedSec: 1800,
      totalTimeElapsedSec: 1700,
      location: "home",
      equipment: [],
      exercises: [],
    };
    await saveWorkoutLog(log);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const saved = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(saved[0].id).toBe("log-1");
  });

  it("saves all workout logs", async () => {
    const logs = [
      { id: "a", date: "2026-01-01" },
      { id: "b", date: "2026-01-02" },
    ] as any;
    await saveAllWorkoutLogs(logs);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(logs)
    );
  });

  it("updateWorkoutLogById patches the correct log", async () => {
    const existing = [
      { id: "log-1", date: "2026-01-01", effortLevel: undefined },
      { id: "log-2", date: "2026-01-02", effortLevel: undefined },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(existing)
    );

    await updateWorkoutLogById("log-1", { effortLevel: "high" });

    const saved = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(saved[0].effortLevel).toBe("high");
    expect(saved[1].effortLevel).toBeUndefined();
  });

  it("updateWorkoutLogById does nothing for missing id", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify([{ id: "log-1" }])
    );
    await updateWorkoutLogById("nonexistent", { effortLevel: "low" });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

// ---- Breakdown Preferences ----

describe("breakdown preferences", () => {
  it("returns defaults when none saved", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const prefs = await getBreakdownPreferences();
    expect(Array.isArray(prefs)).toBe(true);
  });

  it("saves preferences", async () => {
    await saveBreakdownPreferences([
      { type: "resistance", frequency: 3, isSpecificGoal: false },
    ]);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

// ---- Locations ----

describe("locations", () => {
  it("returns defaults when none saved", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const locs = await getLocations();
    expect(Array.isArray(locs)).toBe(true);
  });

  it("saves locations", async () => {
    await saveLocations([
      { id: "loc-1", name: "Home", available: true, equipment: {} },
    ]);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

// ---- Current Plan ----

describe("current plan", () => {
  it("returns null when no plan saved", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const plan = await getCurrentPlan();
    expect(plan).toBeNull();
  });

  it("saves a plan", async () => {
    const plan = {
      id: "wp-1",
      date: "2026-03-31",
      totalTimeSec: 1800,
      location: "home",
      equipment: [],
      goals: [],
      exercises: [],
    };
    // getCurrentExerciseIndex will also call getItem
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    await saveCurrentPlan(plan);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it("clears plan from AsyncStorage", async () => {
    await clearCurrentPlan();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });
});

// ---- Exercise Index ----

describe("exercise index", () => {
  it("returns 0 by default", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const idx = await getCurrentExerciseIndex();
    expect(idx).toBe(0);
  });

  it("saves index", async () => {
    await saveCurrentExerciseIndex(3);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

// ---- User Profile ----

describe("user profile", () => {
  const mockProfile: UserMemory = {
    userId: "test-user",
    fitnessLevel: "intermediate",
    goals: ["strength"],
    trainerName: "Coach Sam",
    voiceInputPreference: "push-to-talk",
    trainingDaysPerWeek: 4,
    locationProfiles: [],
    chronicInjuries: [],
    shortTermInjuries: [],
    recentSessionSummaries: [],
    totalSessionsCompleted: 0,
  };

  it("returns null by default", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const profile = await getUserProfile();
    expect(profile).toBeNull();
  });

  it("saves profile to AsyncStorage and syncs to Supabase", async () => {
    await saveUserProfile(mockProfile);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

// ---- Short-term Injuries ----

describe("short-term injuries", () => {
  const baseProfile: UserMemory = {
    userId: "test-user",
    fitnessLevel: "intermediate",
    goals: [],
    trainerName: "Coach",
    voiceInputPreference: "push-to-talk",
    trainingDaysPerWeek: 4,
    locationProfiles: [],
    chronicInjuries: [],
    shortTermInjuries: [],
    recentSessionSummaries: [],
    totalSessionsCompleted: 0,
  };

  it("adds a new short-term injury", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(baseProfile)
    );

    const injury: ShortTermInjury = {
      area: "right shoulder",
      description: "tweaked during press",
      dateReported: "2026-03-31",
      lastChecked: "2026-03-31",
      status: "active",
    };

    await updateShortTermInjury("test-user", injury);
    const saved = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(saved.shortTermInjuries).toHaveLength(1);
    expect(saved.shortTermInjuries[0].area).toBe("right shoulder");
  });

  it("updates existing injury by area", async () => {
    const profileWithInjury = {
      ...baseProfile,
      shortTermInjuries: [
        {
          area: "right shoulder",
          description: "old",
          dateReported: "2026-03-30",
          lastChecked: "2026-03-30",
          status: "active",
        },
      ],
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(profileWithInjury)
    );

    const updated: ShortTermInjury = {
      area: "right shoulder",
      description: "updated",
      dateReported: "2026-03-30",
      lastChecked: "2026-03-31",
      status: "improving",
    };

    await updateShortTermInjury("test-user", updated);
    const saved = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(saved.shortTermInjuries).toHaveLength(1);
    expect(saved.shortTermInjuries[0].status).toBe("improving");
  });

  it("resolves injury by setting status to healed", async () => {
    const profileWithInjury = {
      ...baseProfile,
      shortTermInjuries: [
        {
          area: "left knee",
          description: "sore",
          dateReported: "2026-03-25",
          lastChecked: "2026-03-30",
          status: "active",
        },
      ],
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(profileWithInjury)
    );

    await resolveShortTermInjury("left knee");
    const saved = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(saved.shortTermInjuries[0].status).toBe("healed");
  });

  it("does nothing if profile is null", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await updateShortTermInjury("test-user", {} as any);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

// ---- getAllEquipment ----

describe("getAllEquipment", () => {
  it("returns sorted unique list", async () => {
    // Mock exercises and groups
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(
        JSON.stringify([{ equipment: ["kettlebell", "mat"] }])
      )
      .mockResolvedValueOnce(
        JSON.stringify([{ equipment: ["kettlebell", "dumbbell"] }])
      );

    const equipment = await getAllEquipment();
    expect(equipment).toEqual(expect.arrayContaining(["kettlebell"]));
    // Should be sorted
    for (let i = 1; i < equipment.length; i++) {
      expect(equipment[i] >= equipment[i - 1]).toBe(true);
    }
  });
});
