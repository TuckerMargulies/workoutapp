// ============================================================
// AI Trainer Brain — Phase 1
// Claude API integration with full user profile injection
// ============================================================
import Anthropic from "@anthropic-ai/sdk";
import { UserMemory, WorkoutPlan } from "../types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
