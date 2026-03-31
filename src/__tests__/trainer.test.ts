import {
  buildSystemPrompt,
  buildWorkoutContext,
} from "../lib/ai/trainer";
import type { UserMemory, WorkoutPlan } from "../lib/types";

const baseProfile: UserMemory = {
  userId: "u1",
  fitnessLevel: "intermediate",
  goals: ["build strength", "lose weight"],
  trainerName: "Coach Sam",
  voiceInputPreference: "push-to-talk",
  trainingDaysPerWeek: 4,
  locationProfiles: [
    { name: "home gym", equipment: ["kettlebell", "resistance bands"] },
    { name: "park", equipment: [] },
  ],
  chronicInjuries: [
    {
      area: "left knee",
      description: "ACL surgery 2022",
      dateAdded: "2026-01-01",
      isRehabGoal: true,
    },
  ],
  shortTermInjuries: [
    {
      area: "right shoulder",
      description: "tweaked last session",
      dateReported: "2026-03-30",
      lastChecked: "2026-03-30",
      status: "active",
    },
    {
      area: "left ankle",
      description: "healed sprain",
      dateReported: "2026-03-01",
      lastChecked: "2026-03-15",
      status: "healed",
    },
  ],
  recentSessionSummaries: ["Great workout, hit all lifts", "Legs felt good"],
  totalSessionsCompleted: 12,
};

const basePlan: WorkoutPlan = {
  id: "wp-1",
  date: "2026-03-31",
  totalTimeSec: 2700,
  location: "home gym",
  equipment: ["kettlebell"],
  goals: ["strength"],
  exercises: [
    {
      exerciseId: "ex1",
      name: "Goblet Squat",
      timeBased: false,
      sets: 3,
      reps: 12,
      timeSec: 360,
      description: "Hold KB at chest, squat",
      bodyArea: "lower body",
      type: "resistance",
    },
    {
      exerciseId: "ex2",
      name: "Plank",
      timeBased: true,
      sets: 1,
      reps: 0,
      timeSec: 60,
      description: "Hold plank position",
      bodyArea: "core",
      type: "stability",
    },
  ],
};

// ---- buildSystemPrompt ----

describe("buildSystemPrompt", () => {
  it("returns base prompt when profile is null", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("Coach");
    expect(prompt).toContain("SAFETY RULES");
  });

  it("includes trainer name from profile", () => {
    const prompt = buildSystemPrompt(baseProfile);
    expect(prompt).toContain("Coach Sam");
  });

  it("includes fitness level", () => {
    const prompt = buildSystemPrompt(baseProfile);
    expect(prompt).toContain("intermediate");
  });

  it("includes goals", () => {
    const prompt = buildSystemPrompt(baseProfile);
    expect(prompt).toContain("build strength");
    expect(prompt).toContain("lose weight");
  });

  it("includes location and equipment info", () => {
    const prompt = buildSystemPrompt(baseProfile);
    expect(prompt).toContain("home gym");
    expect(prompt).toContain("kettlebell");
    expect(prompt).toContain("park");
    expect(prompt).toContain("bodyweight only");
  });

  it("includes chronic injuries", () => {
    const prompt = buildSystemPrompt(baseProfile);
    expect(prompt).toContain("left knee");
    expect(prompt).toContain("ACL surgery 2022");
  });

  it("includes active short-term injuries and excludes healed", () => {
    const prompt = buildSystemPrompt(baseProfile);
    expect(prompt).toContain("right shoulder");
    expect(prompt).not.toContain("left ankle");
  });

  it("includes recent session summaries", () => {
    const prompt = buildSystemPrompt(baseProfile);
    expect(prompt).toContain("Great workout");
    expect(prompt).toContain("Legs felt good");
  });

  it("always includes safety rules", () => {
    const prompt = buildSystemPrompt(baseProfile);
    expect(prompt).toContain("non-negotiable");
    expect(prompt).toContain("Pain scale");
  });

  it("handles profile with no injuries", () => {
    const clean = {
      ...baseProfile,
      chronicInjuries: [],
      shortTermInjuries: [],
    };
    const prompt = buildSystemPrompt(clean);
    expect(prompt).not.toContain("CHRONIC CONDITIONS");
    expect(prompt).not.toContain("ACTIVE SHORT-TERM");
  });

  it("handles profile with no locations", () => {
    const noLoc = { ...baseProfile, locationProfiles: [] };
    const prompt = buildSystemPrompt(noLoc);
    expect(prompt).toContain("bodyweight only");
  });

  it("handles profile with empty goals", () => {
    const noGoals = { ...baseProfile, goals: [] };
    const prompt = buildSystemPrompt(noGoals);
    expect(prompt).not.toContain("USER GOALS");
  });

  it("handles profile with no session history", () => {
    const noHistory = { ...baseProfile, recentSessionSummaries: [] };
    const prompt = buildSystemPrompt(noHistory);
    expect(prompt).not.toContain("RECENT SESSIONS");
  });
});

// ---- buildWorkoutContext ----

describe("buildWorkoutContext", () => {
  it("returns empty string when plan is null", () => {
    expect(buildWorkoutContext(null)).toBe("");
  });

  it("includes location and time from plan", () => {
    const ctx = buildWorkoutContext(basePlan);
    expect(ctx).toContain("home gym");
    expect(ctx).toContain("45 min");
  });

  it("lists exercises with sets and reps", () => {
    const ctx = buildWorkoutContext(basePlan);
    expect(ctx).toContain("Goblet Squat");
    expect(ctx).toContain("3 sets x 12 reps");
  });

  it("formats time-based exercises correctly", () => {
    const ctx = buildWorkoutContext(basePlan);
    expect(ctx).toContain("Plank");
    expect(ctx).toContain("60s");
  });

  it("numbers exercises sequentially", () => {
    const ctx = buildWorkoutContext(basePlan);
    expect(ctx).toContain("1.");
    expect(ctx).toContain("2.");
  });
});
