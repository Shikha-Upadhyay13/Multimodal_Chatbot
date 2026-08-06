import { randomUUID } from "node:crypto";
import { parseUploadedFile } from "../parsers";
import { chunkText } from "./chunker";
import { embedText } from "./embedder";
import { insertDocument, insertChunks } from "./vectorStore";

export interface IngestResult {
  documentId: string;
  name: string;
  chunkCount: number;
  charCount: number;
}

/** Full RAG ingestion pipeline: parse -> chunk -> embed -> persist. */
export async function ingestFile(buffer: Buffer, originalName: string): Promise<IngestResult> {
  const text = await parseUploadedFile(buffer, originalName);
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`No extractable text found in "${originalName}".`);
  }

  const documentId = randomUUID();
  insertDocument({ id: documentId, name: originalName, uploadedAt: Date.now() });

  const pieces = chunkText(trimmed);
  const chunks = [];
  for (const piece of pieces) {
    const embedding = await embedText(piece);
    chunks.push({ id: randomUUID(), docId: documentId, docName: originalName, text: piece, embedding });
  }
  insertChunks(chunks);

  return { documentId, name: originalName, chunkCount: chunks.length, charCount: trimmed.length };
}
