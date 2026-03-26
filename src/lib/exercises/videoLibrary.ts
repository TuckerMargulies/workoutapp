// ============================================================
// Exercise Video Library — Phase 5b
// Fetches exercise images from wger.de (free, no API key)
// Falls back gracefully if no match found
// ============================================================

const WGER_BASE = "https://wger.de/api/v2";

interface WgerSearchResult {
  suggestions: {
    value: string;
    data: { id: number; base_id: number };
  }[];
}

interface WgerImageResult {
  results: { image: string; is_main: boolean }[];
}

// In-memory cache — avoid repeat fetches within a session
const cache = new Map<string, string | null>();

export async function getExerciseImageUrl(
  exerciseName: string
): Promise<string | null> {
  const key = exerciseName.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    // Step 1: search for the exercise
    const searchRes = await fetch(
      `${WGER_BASE}/exercise/search/?term=${encodeURIComponent(key)}&language=english&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!searchRes.ok) { cache.set(key, null); return null; }

    const searchData: WgerSearchResult = await searchRes.json();
    const match = searchData.suggestions[0];
    if (!match) { cache.set(key, null); return null; }

    // Step 2: get images for the matched exercise base
    const imgRes = await fetch(
      `${WGER_BASE}/exerciseimage/?exercise_base=${match.data.base_id}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!imgRes.ok) { cache.set(key, null); return null; }

    const imgData: WgerImageResult = await imgRes.json();
    const main = imgData.results.find((r) => r.is_main) ?? imgData.results[0];
    const url = main?.image ?? null;

    cache.set(key, url);
    return url;
  } catch {
    cache.set(key, null);
    return null;
  }
}
