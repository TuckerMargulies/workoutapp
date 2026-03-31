import { generateWorkout } from "../lib/generateWorkout";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultExercises, defaultWorkoutGroups } from "../data/exercises";
import {
  defaultBreakdownPreferences,
  defaultLocations,
} from "../data/defaults";
import type { BioStatus } from "../lib/types";

// Helper: load default data into mock AsyncStorage
function seedDefaults() {
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
    if (key.includes("exercises"))
      return Promise.resolve(JSON.stringify(defaultExercises));
    if (key.includes("groups"))
      return Promise.resolve(JSON.stringify(defaultWorkoutGroups));
    if (key.includes("logs")) return Promise.resolve(JSON.stringify([]));
    if (key.includes("breakdown"))
      return Promise.resolve(JSON.stringify(defaultBreakdownPreferences));
    if (key.includes("locations"))
      return Promise.resolve(JSON.stringify(defaultLocations));
    return Promise.resolve(null);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  seedDefaults();
});

describe("generateWorkout", () => {
  it("returns a workout plan with correct structure", async () => {
    const plan = await generateWorkout(1800, "Home", null, ["resistance"]);

    expect(plan).toHaveProperty("id");
    expect(plan).toHaveProperty("date");
    expect(plan).toHaveProperty("totalTimeSec");
    expect(plan).toHaveProperty("location", "Home");
    expect(plan).toHaveProperty("exercises");
    expect(Array.isArray(plan.exercises)).toBe(true);
  });

  it("generates plan with id starting with wp-", async () => {
    const plan = await generateWorkout(1800, "Home", null, ["resistance"]);
    expect(plan.id).toMatch(/^wp-/);
  });

  it("uses 90% of total time as usable time", async () => {
    const plan = await generateWorkout(2000, "Home", null, ["resistance"]);
    expect(plan.totalTimeSec).toBe(Math.floor(2000 * 0.9));
  });

  it("exercises have required fields", async () => {
    const plan = await generateWorkout(1800, "Home", null, []);
    for (const ex of plan.exercises) {
      expect(ex).toHaveProperty("exerciseId");
      expect(ex).toHaveProperty("name");
      expect(ex).toHaveProperty("timeBased");
      expect(ex).toHaveProperty("sets");
      expect(ex).toHaveProperty("reps");
      expect(ex).toHaveProperty("timeSec");
      expect(ex).toHaveProperty("description");
      expect(ex).toHaveProperty("bodyArea");
      expect(ex).toHaveProperty("type");
    }
  });

  it("does not include duplicate exercises", async () => {
    const plan = await generateWorkout(3600, "Home", null, ["resistance"]);
    const ids = plan.exercises.map((e) => e.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("total exercise time does not exceed usable time", async () => {
    const plan = await generateWorkout(1800, "Home", null, ["resistance"]);
    const totalExTime = plan.exercises.reduce((sum, e) => sum + e.timeSec, 0);
    expect(totalExTime).toBeLessThanOrEqual(plan.totalTimeSec);
  });

  it("handles equipment override", async () => {
    const plan = await generateWorkout(1800, "Home", ["kettlebell"], [
      "resistance",
    ]);
    expect(plan.equipment).toEqual(["kettlebell"]);
  });

  it("handles empty goals (auto-select)", async () => {
    const plan = await generateWorkout(1800, "Home", null, []);
    // Should still generate exercises from breakdown preferences
    expect(Array.isArray(plan.exercises)).toBe(true);
  });

  it("respects bio-status by filtering contraindicated exercises", async () => {
    const bio: BioStatus = {
      flaggedRegions: ["lower_back"],
    };
    const plan = await generateWorkout(1800, "Home", null, [], bio);

    // All exercises should not have lower back contraindications
    for (const ex of plan.exercises) {
      const fullEx = defaultExercises.find((e) => e.id === ex.exerciseId);
      if (fullEx) {
        expect(fullEx.contraindications).not.toContain("low_back_strain");
        expect(fullEx.contraindications).not.toContain("lower_back_pain");
      }
    }
  });

  it("handles very short time (30 seconds)", async () => {
    const plan = await generateWorkout(30, "Home", null, ["resistance"]);
    // May have no exercises — usable time is 27s
    expect(Array.isArray(plan.exercises)).toBe(true);
  });

  it("handles unknown location gracefully", async () => {
    const plan = await generateWorkout(1800, "Spaceship", null, [
      "resistance",
    ]);
    expect(plan.location).toBe("Spaceship");
    expect(plan.equipment).toEqual([]);
  });
});
