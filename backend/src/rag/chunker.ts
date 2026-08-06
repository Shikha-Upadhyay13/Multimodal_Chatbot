const CHUNK_SIZE_WORDS = 220;
const CHUNK_OVERLAP_WORDS = 40;

/**
 * Splits text into overlapping word-count chunks. Word count is a simple stand-in for a
 * real tokenizer — close enough for chunk sizing without needing a tokenizer dependency.
 */
export function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  const step = CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;

  for (let start = 0; start < words.length; start += step) {
    const chunk = words.slice(start, start + CHUNK_SIZE_WORDS).join(" ");
    if (chunk.trim()) chunks.push(chunk);
    if (start + CHUNK_SIZE_WORDS >= words.length) break;
  }

  return chunks;
}
