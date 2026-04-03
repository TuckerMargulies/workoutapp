// ============================================================
// AI Trainer Brain — Phase 1
// Claude API integration with full user profile injection
// ============================================================
import Anthropic from "@anthropic-ai/sdk";
import { UserMemory, WorkoutPlan, LongTermPlan, Exercise } from "../types";

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

// ---- Build system prompt from user profile ----
export function buildSystemPrompt(profile: UserMemory | null): string {
  const base = `You are ${profile?.trainerName ?? "Coach"}, an expert personal fitness trainer.
You speak with warmth, directness, and genuine care. You know this person personally.
Keep responses concise — 1-3 sentences for mid-workout cues, 3-5 sentences for explanations.
Always speak conversationally, as if talking directly to the person.

SAFETY RULES (non-negotiable):
- If the user reports ANY pain or injury during a workout, ask clarifying questions before continuing.
- Default recommendation when in doubt: end the workout and rest.
- Never push through injury signals. The app's liability depends on this.
- Pain scale: green = encourage, yellow = modify exercise, red = stop immediately.`;

  if (!profile) return base;

  const chronic =
    profile.chronicInjuries.length > 0
      ? `\nCHRONIC CONDITIONS (always avoid/work around):\n${profile.chronicInjuries
          .map((i) => `- ${i.area}: ${i.description}`)
          .join("\n")}`
      : "";

  const shortTerm =
    profile.shortTermInjuries.filter((i) => i.status !== "healed").length > 0
      ? `\nACTIVE SHORT-TERM INJURIES (adjust today's workout):\n${profile.shortTermInjuries
          .filter((i) => i.status !== "healed")
          .map((i) => `- ${i.area}: ${i.description} (reported ${i.dateReported})`)
          .join("\n")}`
      : "";

  const locationEquipment =
    profile.locationProfiles.length > 0
      ? `\nLOCATIONS & EQUIPMENT:\n${profile.locationProfiles
          .map((l) =>
            l.equipment.length > 0
              ? `- ${l.name}: ${l.equipment.join(", ")}`
              : `- ${l.name}: bodyweight only`
          )
          .join("\n")}`
      : "\nEQUIPMENT: bodyweight only";

  const goals =
    profile.goals.length > 0
      ? `\nUSER GOALS: ${profile.goals.join(", ")}`
      : "";

  const level = `\nFITNESS LEVEL: ${profile.fitnessLevel}`;

  const locations = ""; // now embedded in locationEquipment

  const history =
    profile.recentSessionSummaries.length > 0
      ? `\nRECENT SESSIONS:\n${profile.recentSessionSummaries
          .slice(0, 3)
          .map((s, i) => `- Session ${i + 1}: ${s}`)
          .join("\n")}`
      : "";

  return [base, level, goals, locationEquipment, chronic, shortTerm, history]
    .filter(Boolean)
    .join("\n");
}

// ---- Build workout context string ----
export function buildWorkoutContext(plan: WorkoutPlan | null): string {
  if (!plan) return "";
  const exercises = plan.exercises
    .map(
      (e, i) =>
        `${i + 1}. ${e.name} — ${e.sets} sets x ${e.timeBased ? `${e.timeSec}s` : `${e.reps} reps`}`
    )
    .join("\n");
  return `\nTODAY'S WORKOUT (${plan.location}, ${Math.round(plan.totalTimeSec / 60)} min):\n${exercises}`;
}

// ---- Session start greeting ----
export async function getTrainerGreeting(
  profile: UserMemory | null,
  plan: WorkoutPlan | null
): Promise<string> {
  const systemPrompt = buildSystemPrompt(profile);
  const workoutContext = buildWorkoutContext(plan);

  const userMessage = plan
    ? `Give me a brief, energizing greeting to start today's workout. Mention the plan briefly.${workoutContext}`
    : `Give me a brief, energizing greeting. Ask what kind of workout I'm looking to do today.`;

  return getTrainerResponse(userMessage, systemPrompt);
}

// ---- Short-term injury check-in (session start) ----
export async function getInjuryCheckIn(
  injuryArea: string,
  profile: UserMemory | null
): Promise<string> {
  const systemPrompt = buildSystemPrompt(profile);
  const message = `Ask me how my ${injuryArea} is feeling today before we start. Keep it brief and caring.`;
  return getTrainerResponse(message, systemPrompt);
}

// ---- Mid-workout response (voice Q&A between sets) ----
export async function getTrainerResponse(
  userMessage: string,
  systemPrompt?: string,
  conversationHistory?: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [];

  // Include conversation history for context within a session
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach((m) =>
      messages.push({ role: m.role, content: m.content })
    );
  }

  messages.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: systemPrompt ?? buildSystemPrompt(null),
    messages,
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// ---- Build UserMemory from onboarding Q&A ----
export async function extractProfileFromInterview(
  qa: { question: string; answer: string }[],
  userId: string
): Promise<UserMemory> {
  const transcript = qa
    .map((q) => `Q: ${q.question}\nA: ${q.answer}`)
    .join("\n\n");

  const message = `Parse this onboarding interview into a structured user profile.

${transcript}

Return valid JSON matching this exact shape:
{
  "userId": "${userId}",
  "fitnessLevel": "beginner" | "intermediate" | "advanced",
  "goals": ["goal1", "goal2"],
  "trainerName": "name the user chose for their trainer",
  "voiceInputPreference": "push-to-talk" | "wake-word",
  "trainingDaysPerWeek": 4,
  "locationProfiles": [
    {
      "name": "home gym",
      "equipment": ["1x 20kg kettlebell", "resistance bands", "dumbbells"]
    },
    {
      "name": "park",
      "equipment": []
    }
  ],
  "chronicInjuries": [
    { "area": "area name", "description": "details", "dateAdded": "${new Date().toISOString().split("T")[0]}", "isRehabGoal": false }
  ],
  "shortTermInjuries": [],
  "recentSessionSummaries": [],
  "totalSessionsCompleted": 0
}

Rules:
- If no trainer name mentioned, use "Coach"
- If no voice preference mentioned, default to "push-to-talk"
- If trainingDaysPerWeek not mentioned, default to 4
- Create one locationProfile per location mentioned. Be specific with equipment (include quantities if mentioned)
- Empty equipment array = bodyweight only
- Parse injuries carefully — only include as chronic if clearly long-term
- Return only valid JSON, no markdown`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system:
      "You are a fitness profile parser. Extract structured data from onboarding interviews. Return only valid JSON.",
    messages: [{ role: "user", content: message }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    return JSON.parse(text) as UserMemory;
  } catch {
    // Fallback profile if parsing fails
    return {
      userId,
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
  }
}

// ---- Post-workout debrief extraction ----
export async function extractSessionSummary(
  voiceDebrief: string,
  plan: WorkoutPlan | null
): Promise<{
  summary: string;
  effortLevel: "low" | "moderate" | "high";
  painNotes: string[];
  completedExercises: string[];
  skippedExercises: string[];
}> {
  const workoutContext = buildWorkoutContext(plan);
  const message = `The user said this after their workout: "${voiceDebrief}"
${workoutContext}

Extract the following as JSON:
- summary: one sentence describing the session
- effortLevel: "low", "moderate", or "high"
- painNotes: array of any pain or discomfort mentioned
- completedExercises: array of exercise names mentioned as completed
- skippedExercises: array of exercise names mentioned as skipped or not finished

Respond with only valid JSON, no markdown.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system:
      "You are a fitness data extractor. Parse voice debriefs into structured data. Return only valid JSON.",
    messages: [{ role: "user", content: message }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text);
  } catch {
    return {
      summary: voiceDebrief,
      effortLevel: "moderate",
      painNotes: [],
      completedExercises: [],
      skippedExercises: [],
    };
  }
}

// ---- Generate long-term periodized training plan from interview answers ----
export async function generateLongTermPlan(
  answers: { question: string; answer: string }[],
  userId: string
): Promise<import("../types").LongTermPlan> {
  const today = new Date().toISOString().split("T")[0];

  const interviewText = answers
    .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
    .join("\n\n");

  const prompt = `You are a world-class strength and conditioning coach. Build a detailed periodized training plan based on this athlete interview.

Today's date: ${today}

INTERVIEW:
${interviewText}

Create a comprehensive plan as JSON with EXACTLY this structure:
{
  "title": "compelling motivating plan name",
  "targetEvent": "event name or null",
  "targetDate": "YYYY-MM-DD or null",
  "phases": [
    {
      "name": "Phase name (e.g. Recovery, Rebuild, Strength, Peak, Taper)",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "focus": "1-2 sentences on what this phase develops and why",
      "weeklyStructure": "e.g. 3× strength, 2× mobility, 1× cardio",
      "keyMilestones": ["specific measurable outcome", "specific measurable outcome"]
    }
  ]
}

Rules:
- Create 4-7 phases that flow logically from current state to goal
- Phases must be sequential with no gaps, starting from today
- Be SPECIFIC about the athlete's actual constraints and injuries — don't be generic
- keyMilestones should be measurable and concrete
- If a target date was given, the final phase should end on or before it
- Return ONLY valid JSON, no markdown, no explanation`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: "You are a strength and conditioning coach. Return only valid JSON.",
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    const parsed = JSON.parse(text);
    return {
      id: `ltp-${Date.now()}`,
      title: parsed.title ?? "My Training Plan",
      goal: answers[0]?.answer ?? "",
      targetEvent: parsed.targetEvent ?? undefined,
      targetDate: parsed.targetDate ?? undefined,
      limitations: answers.find((a) => a.question.toLowerCase().includes("constraint") || a.question.toLowerCase().includes("limitation"))?.answer ?? "",
      blockers: answers.find((a) => a.question.toLowerCase().includes("held you back") || a.question.toLowerCase().includes("blocked"))?.answer ?? "",
      phases: parsed.phases ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    throw new Error("Failed to parse plan from AI response. Please try again.");
  }
}

// ---- Research personalized exercises for a long-term plan ----
// Called once when a plan is created. Returns 25-35 exercises tailored to
// the user's sport, goals, equipment, and injuries.
export async function researchExercisesForGoal(
  plan: LongTermPlan,
  userMemory: UserMemory | null
): Promise<Exercise[]> {
  const equipmentStr = userMemory?.locationProfiles
    .map((l) => (l.equipment.length > 0 ? l.equipment.join(", ") : "bodyweight only"))
    .join("; ") ?? "bodyweight only";

  const injuryStr = userMemory?.chronicInjuries
    .map((i) => `${i.area}: ${i.description}`)
    .join("; ") ?? "none";

  const phaseStr = plan.phases
    .map((p) => `${p.name} (${p.weeklyStructure}): ${p.focus}`)
    .join("\n");

  const prompt = `You are a sports science expert and strength & conditioning coach.

Generate a curated exercise library for this specific athlete. These exercises will be used to build all their workouts for the next several months.

ATHLETE:
- Primary goal: ${plan.goal}
- Sport/event: ${plan.targetEvent ?? "general fitness"}
- Fitness level: ${userMemory?.fitnessLevel ?? "intermediate"}
- Equipment available: ${equipmentStr}
- Injuries to avoid: ${injuryStr}

TRAINING PLAN PHASES:
${phaseStr}

REQUIREMENTS:
- Generate exactly 30 exercises
- Cover all movement patterns: push, pull, hinge, squat, carry, rotation, gait/locomotion
- Include exercises directly applicable to ${plan.targetEvent ?? plan.goal}
- Include variety across types: resistance, mobility, cardio, stability, agility
- Respect the injury constraints strictly — set contraindications correctly
- Mix time-based (timeBased: true) and rep-based (timeBased: false) exercises
- defaultTimeSec = total time one set takes in seconds (including brief transition, NOT rest between sets)
- For rep-based: defaultTimeSec = defaultReps × timePerRepSec

Return ONLY a valid JSON array. No markdown, no explanation. Each object must match:
{
  "id": "custom-[unique-kebab-slug]",
  "name": "Exercise Name",
  "bodyArea": "upper body push" | "upper body pull" | "lower body" | "core" | "full body",
  "type": "resistance" | "mobility" | "cardio" | "agility" | "stability" | "rehabilitation",
  "equipment": ["bodyweight"] or ["dumbbells"] or ["kettlebells", "mat/floor"] etc,
  "setting": "any" | "gym" | "outdoors",
  "timeBased": true | false,
  "defaultTimeSec": 30,
  "defaultReps": 10,
  "timePerRepSec": 3,
  "applications": ["${plan.targetEvent ?? plan.goal}"],
  "description": "Clear 2-sentence form cue. Start position then movement.",
  "groupIds": [],
  "primaryMuscles": ["muscle1", "muscle2"],
  "contraindications": [],
  "videoAssetUrl": "",
  "audioCueUrl": "",
  "impactLevel": "low" | "medium" | "high",
  "jointLoad": {}
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    system: "You are a strength and conditioning expert. Return only a valid JSON array of exercises. No markdown, no explanation.",
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed as Exercise[] : [];
  } catch {
    return [];
  }
}

// ---- Trainer check-in: user reports how they feel → adjustments ----
export async function trainerCheckIn(
  userMessage: string,
  currentPlan: import("../types").LongTermPlan | null,
  todaySessionType: string | null,
  userMemory: import("../types").UserMemory | null
): Promise<{
  adjustWorkoutType: string | null;  // suggested workout type change, or null
  workoutNote: string;               // note to show user about today's session
  planAdjustment: string | null;     // if the plan itself should change, explain
  trainerResponse: string;           // conversational response to show/speak
}> {
  const context = [
    currentPlan ? `Current training phase: ${currentPlan.phases.find(p => {
      const today = new Date().toISOString().split("T")[0];
      return p.startDate <= today && p.endDate >= today;
    })?.name ?? "unknown"}` : "No long-term plan set.",
    todaySessionType ? `Today's planned session: ${todaySessionType}` : "No session planned for today.",
    userMemory ? `Athlete: ${userMemory.fitnessLevel} level, goals: ${userMemory.goals.join(", ")}` : "",
    userMemory?.chronicInjuries?.length ? `Chronic injuries: ${userMemory.chronicInjuries.map(i => i.area).join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: `You are a caring, direct personal trainer. The athlete is checking in about how they feel. Respond with empathy but practical advice. Return JSON only.`,
    messages: [{
      role: "user",
      content: `CONTEXT:\n${context}\n\nATHLETE SAYS: "${userMessage}"\n\nRespond as JSON:\n{\n  "adjustWorkoutType": "mobility" | "strength" | "hiit" | "cardio" | "rest" | null,\n  "workoutNote": "brief note about what to do today",\n  "planAdjustment": "if the coming week should be adjusted, explain how. null if no change needed",\n  "trainerResponse": "conversational response to speak/show the athlete (2-3 sentences, warm but direct)"\n}`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text);
  } catch {
    return {
      adjustWorkoutType: null,
      workoutNote: "Listen to your body today.",
      planAdjustment: null,
      trainerResponse: "Got it — let's make sure today's session works for how you're feeling.",
    };
  }
}
