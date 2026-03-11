// ============================================================
// Safety Triage — Phase 3
// Green / Yellow / Red keyword classification
// ============================================================

export type TriageZone = "green" | "yellow" | "red";

// Keywords that trigger each zone
const RED_KEYWORDS = [
  "sharp pain", "can't breathe", "chest pain", "dizzy", "nauseous",
  "can't move", "numbness", "tingling", "shooting pain", "blacking out",
];

const YELLOW_KEYWORDS = [
  "hurts", "sore", "uncomfortable", "tight", "stiff", "aching",
  "too hard", "modify", "easier", "can't do this",
];

const GREEN_KEYWORDS = [
  "easy", "too easy", "more", "harder", "push", "feeling good", "great",
];

export function triageTranscript(transcript: string): TriageZone {
  const lower = transcript.toLowerCase();

  if (RED_KEYWORDS.some((kw) => lower.includes(kw))) return "red";
  if (YELLOW_KEYWORDS.some((kw) => lower.includes(kw))) return "yellow";
  if (GREEN_KEYWORDS.some((kw) => lower.includes(kw))) return "green";

  return "green"; // default: continue
}

export const RED_DISCLAIMER =
  "I'm stopping the workout. If you're experiencing serious pain or symptoms, " +
  "please stop activity and consult a healthcare professional. This is not medical advice.";
