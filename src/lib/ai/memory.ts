// ============================================================
// Pinecone Memory — Phase 1
// User-namespaced vector storage for long-term trainer memory
// ============================================================

// TODO Phase 1: Implement Pinecone operations
// - storeMemory(userId, text, metadata)
// - retrieveRelevantMemory(userId, query, topK)
// - updateInjuryHistory(userId, injury)

export async function storeMemory(
  _userId: string,
  _text: string,
  _metadata: Record<string, unknown>
): Promise<void> {
  throw new Error("Phase 1 not yet implemented");
}

export async function retrieveRelevantMemory(
  _userId: string,
  _query: string,
  _topK = 5
): Promise<string[]> {
  throw new Error("Phase 1 not yet implemented");
}
