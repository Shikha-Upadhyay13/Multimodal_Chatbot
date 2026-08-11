import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { parseUploadedFile } from "../parsers";
import { chunkText } from "./chunker";
import { embedText } from "./embedder";
import { insertDocument, insertChunks } from "./vectorStore";
import { FILES_DIR } from "../storage/db";

export interface IngestResult {
  documentId: string;
  name: string;
  chunkCount: number;
  charCount: number;
}

/**
 * Full RAG ingestion pipeline: parse -> chunk -> embed -> persist. The original file
 * bytes are also saved to disk (not just the extracted text) so an edit_excel_document /
 * edit_pdf_document tool call can later load the real file back in for a true
 * load-modify-save edit, rather than only having searchable text.
 */
export async function ingestFile(buffer: Buffer, originalName: string, projectId?: string): Promise<IngestResult> {
  const text = await parseUploadedFile(buffer, originalName);
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`No extractable text found in "${originalName}".`);
  }

  const documentId = randomUUID();
  const filePath = path.join(FILES_DIR, `${documentId}${path.extname(originalName)}`);
  fs.writeFileSync(filePath, buffer);

  insertDocument({ id: documentId, name: originalName, uploadedAt: Date.now(), fullText: trimmed, filePath, projectId });

  const pieces = chunkText(trimmed);
  const chunks = [];
  for (const piece of pieces) {
    const embedding = await embedText(piece);
    chunks.push({ id: randomUUID(), docId: documentId, docName: originalName, text: piece, embedding });
  }
  insertChunks(chunks, projectId);

  return { documentId, name: originalName, chunkCount: chunks.length, charCount: trimmed.length };
}
