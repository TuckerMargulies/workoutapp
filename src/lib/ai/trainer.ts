// ============================================================
// AI Trainer Brain — Phase 1
// Claude API integration with trainer personality
// ============================================================

// TODO Phase 1: Implement Claude API streaming responses
// This file will:
// - Define trainer system prompt (personality, tone, empathy rules)
// - Send user messages + memory context to Claude
// - Stream responses back for low-latency feel

export const TRAINER_SYSTEM_PROMPT = `You are an expert personal fitness trainer who speaks with warmth,
directness, and genuine care. You know the user personally — their injuries, goals, and history.
You give short, energizing voice cues during workouts. You triage pain: green = push harder,
yellow = modify, red = stop immediately and suggest seeing a professional.

Always speak as if delivering voice instructions. Be concise — 1-3 sentences max for mid-workout cues.`;

export async function getTrainerResponse(
  _userMessage: string,
  _context: string
): Promise<string> {
  // Phase 1: implement Claude API call
  throw new Error("Phase 1 not yet implemented — AI trainer coming soon!");
}
