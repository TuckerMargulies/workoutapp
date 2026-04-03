// ============================================================
// Voice Command Parser — Fast keyword parse + Claude fallback
// Translates transcripts into typed actions dispatched globally
// ============================================================
import Anthropic from "@anthropic-ai/sdk";

export type VoiceCommandAction =
  | { type: "next_exercise" }
  | { type: "prev_exercise" }
  | { type: "pause" }
  | { type: "play" }
  | { type: "skip_rest" }
  | { type: "finish_workout" }
  | { type: "reschedule_session" }
  | { type: "navigate"; screen: "home" | "plan" | "profile" | "workout" }
  | { type: "check_in"; message: string }
  | { type: "adjust_timer"; deltaSec: number }
  | { type: "unknown"; original: string };

// ---- Fast keyword parse (no latency) ----
function keywordParse(transcript: string): VoiceCommandAction | null {
  const t = transcript.toLowerCase().trim();

  if (/\b(next exercise|skip exercise|move on|next one|next)\b/.test(t))
    return { type: "next_exercise" };
  if (/\b(previous exercise|go back|last exercise|prev exercise)\b/.test(t))
    return { type: "prev_exercise" };
  if (/\b(pause|stop timer|hold on)\b/.test(t)) return { type: "pause" };
  if (/\b(play|resume|start timer|let's go|go)\b/.test(t)) return { type: "play" };
  if (/\b(skip rest|end rest|done resting|skip the rest)\b/.test(t))
    return { type: "skip_rest" };
  if (/\b(finish workout|end workout|done working out|i'm done)\b/.test(t))
    return { type: "finish_workout" };
  if (/\b(go home|home screen|back home)\b/.test(t))
    return { type: "navigate", screen: "home" };
  if (/\b(go to plan|open plan|my plan|view plan)\b/.test(t))
    return { type: "navigate", screen: "plan" };
  if (/\b(add.*second|more time|extend time)\b/.test(t))
    return { type: "adjust_timer", deltaSec: 30 };
  if (/\b(less time|remove.*second|cut.*time)\b/.test(t))
    return { type: "adjust_timer", deltaSec: -30 };
  if (/\b(reschedule|missed.*workout|skip today|move.*workout|postpone)\b/.test(t))
    return { type: "reschedule_session" };

  return null;
}

// ---- Claude fallback for ambiguous commands ----
export async function parseVoiceCommand(transcript: string): Promise<VoiceCommandAction> {
  // Try fast path first
  const quick = keywordParse(transcript);
  if (quick) return quick;

  // Claude Haiku for low-latency classification
  try {
    const client = new Anthropic({
      apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "",
      dangerouslyAllowBrowser: true,
    });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      system: `You are a voice command classifier for a workout app. Return ONLY a valid JSON object.
Valid types and shapes:
{"type":"next_exercise"}
{"type":"prev_exercise"}
{"type":"pause"}
{"type":"play"}
{"type":"skip_rest"}
{"type":"finish_workout"}
{"type":"reschedule_session"}
{"type":"navigate","screen":"home"|"plan"|"profile"}
{"type":"adjust_timer","deltaSec":number}
{"type":"check_in","message":"<original transcript>"}
{"type":"unknown","original":"<original transcript>"}
If it sounds like a question or comment about training, health, or how to do an exercise, use check_in.`,
      messages: [{ role: "user", content: `Classify this voice input: "${transcript}"` }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json = text.replace(/```json?|```/g, "").trim();
    return JSON.parse(json) as VoiceCommandAction;
  } catch {
    // Fallback: treat as check-in
    return { type: "check_in", message: transcript };
  }
}
