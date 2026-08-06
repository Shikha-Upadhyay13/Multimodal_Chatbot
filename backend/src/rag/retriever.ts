import { embedText } from "./embedder";
import { getAllChunks } from "./vectorStore";

export interface RetrievedChunk {
  docName: string;
  text: string;
  score: number;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  // Both vectors are already L2-normalized (embedder uses normalize: true), so the dot
  // product alone equals cosine similarity — no need to divide by magnitudes.
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export async function retrieveRelevantChunks(query: string, topK = 5): Promise<RetrievedChunk[]> {
  const chunks = getAllChunks();
  if (chunks.length === 0) return [];

  const queryEmbedding = await embedText(query);

  return chunks
    .map((c) => ({ docName: c.docName, text: c.text, score: cosineSimilarity(queryEmbedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
