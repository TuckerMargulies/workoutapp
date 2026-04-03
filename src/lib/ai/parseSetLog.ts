// ============================================================
// Set Log Parser — voice transcript → ActualSet[]
// Fast regex first, Claude Haiku fallback for complex phrases
// Handles: "8 reps at 80kg", "got 12", "3×10 at 60", "7 then 6 then 5"
// ============================================================
import Anthropic from "@anthropic-ai/sdk";
import { ActualSet } from "../types";

export interface ParsedSet {
  reps: number;
  weightKg?: number;
  note?: string;
}

// ---- Unit converters ----
function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.4536 * 2) / 2; // round to nearest 0.5kg
}

// ---- Fast regex parse (zero latency) ----
function fastParse(transcript: string, lastKnownWeightKg: number | null): ParsedSet[] | null {
  const t = transcript.toLowerCase().trim();

  // Extract weight (kg or lbs)
  let weightKg: number | undefined;
  const kgMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo(?:gram)?s?)/);
  const lbsMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:lb(?:s)?|pound(?:s)?)/);
  if (kgMatch) weightKg = parseFloat(kgMatch[1]);
  else if (lbsMatch) weightKg = lbsToKg(parseFloat(lbsMatch[1]));
  else if (lastKnownWeightKg && /same|again|that weight/.test(t)) weightKg = lastKnownWeightKg;

  // "X sets of Y" or "X×Y" → repeat Y reps X times
  const setsOfMatch = t.match(/(\d+)\s*(?:sets?\s+of|[x×])\s*(\d+)/);
  if (setsOfMatch) {
    const numSets = parseInt(setsOfMatch[1]);
    const reps = parseInt(setsOfMatch[2]);
    if (numSets >= 1 && numSets <= 20 && reps >= 1 && reps <= 100) {
      return Array.from({ length: numSets }, () => ({ reps, weightKg }));
    }
  }

  // "X then Y then Z" → multiple sets with descending/varying reps
  const thenMatch = t.match(/(\d+)\s*(?:then|,|and)\s*(\d+)(?:\s*(?:then|,|and)\s*(\d+))?/);
  if (thenMatch) {
    const sets: ParsedSet[] = [{ reps: parseInt(thenMatch[1]), weightKg }];
    if (thenMatch[2]) sets.push({ reps: parseInt(thenMatch[2]), weightKg });
    if (thenMatch[3]) sets.push({ reps: parseInt(thenMatch[3]), weightKg });
    if (sets.every(s => s.reps >= 1 && s.reps <= 100)) return sets;
  }

  // Single rep count: "got 8", "did 6", "8 reps", "8", "only managed 5", "hit 10"
  const repsPatterns = [
    /(?:got|did|managed|completed?|hit|only|just)\s+(\d+)/,
    /(\d+)\s*(?:rep(?:s)?|time(?:s)?|clean)/,
    /^(\d+)$/, // bare number
  ];
  for (const re of repsPatterns) {
    const m = t.match(re);
    if (m) {
      const reps = parseInt(m[1]);
      if (reps >= 1 && reps <= 100) {
        const note = /fail(?:ed)?/.test(t) ? "failed" : /easy|light/.test(t) ? "easy" : undefined;
        return [{ reps, weightKg, note }];
      }
    }
  }

  return null; // couldn't parse fast
}

// ---- Claude Haiku fallback ----
async function claudeParse(
  transcript: string,
  lastKnownWeightKg: number | null
): Promise<ParsedSet[]> {
  try {
    const client = new Anthropic({
      apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "",
      dangerouslyAllowBrowser: true,
    });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: `You parse workout set logs from voice. Return ONLY a JSON array of sets.
Each set: {"reps": number, "weightKg": number|null, "note": string|null}
Rules:
- "lbs"/"pounds" → convert to kg (×0.4536, round to 0.5kg)
- If weight not mentioned and last known weight is provided, use it
- "3 sets of 10 at 80kg" → 3 objects with reps:10, weightKg:80
- "failed" → note:"failed", "easy" → note:"easy"
- If you can't determine reps, return []
Last known weight: ${lastKnownWeightKg ?? "unknown"}kg`,
      messages: [{ role: "user", content: `Parse: "${transcript}"` }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const parsed = JSON.parse(text.replace(/```json?|```/g, "").trim());
    if (Array.isArray(parsed)) return parsed as ParsedSet[];
    return [];
  } catch {
    return [];
  }
}

// ---- Public API ----

/** Parse a voice transcript into one or more ActualSets. Returns [] if unparseable. */
export async function parseSetLog(
  transcript: string,
  lastKnownWeightKg: number | null,
  startSetNumber: number = 1
): Promise<ActualSet[]> {
  const fast = fastParse(transcript, lastKnownWeightKg);
  const parsed = fast ?? (await claudeParse(transcript, lastKnownWeightKg));

  return parsed.map((p, i) => ({
    setNumber: startSetNumber + i,
    reps: p.reps,
    weightKg: p.weightKg ?? undefined,
    note: p.note ?? undefined,
  }));
}

/** Parse "I did bench press 80kg 3×8, squats 100kg 3×6" for end-of-workout bulk logging.
 *  Returns a map of exerciseName → ActualSet[].
 *  Uses Claude to match against the provided exercise names. */
export async function parseBulkWorkoutLog(
  transcript: string,
  exerciseNames: string[]
): Promise<Record<string, ActualSet[]>> {
  if (!transcript.trim() || exerciseNames.length === 0) return {};
  try {
    const client = new Anthropic({
      apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "",
      dangerouslyAllowBrowser: true,
    });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: `You extract workout set data from a post-workout voice log.
Exercise names in this session: ${exerciseNames.join(", ")}
Return ONLY a JSON object: { "ExerciseName": [{"setNumber":1,"reps":8,"weightKg":80},...] }
Rules:
- Match to the nearest exercise name in the list (fuzzy match)
- "lbs"/"pounds" → convert to kg (×0.4536, round to 0.5kg)
- "3 sets of 10 at 80kg" → 3 objects with setNumber 1,2,3
- Only include exercises mentioned. Return {} if nothing parseable.`,
      messages: [{ role: "user", content: `Parse: "${transcript}"` }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    return JSON.parse(text.replace(/```json?|```/g, "").trim()) as Record<string, ActualSet[]>;
  } catch {
    return {};
  }
}
