import fs from "node:fs";
import { findDocumentByName } from "../rag/vectorStore";
import { findGeneratedFileByName } from "./fileRegistry";

export interface ResolvedFile {
  buffer: Buffer;
  fileName: string;
}

/**
 * Looks up an existing file by name for editing — checks previously uploaded documents
 * first (their original bytes were saved at ingestion time), then previously generated
 * documents. Used by the edit_* tools so the model can say "edit report.xlsx" and it
 * doesn't matter whether that file was uploaded by the user or created earlier in the
 * conversation.
 */
export function resolveExistingFile(name: string): ResolvedFile | null {
  const uploaded = findDocumentByName(name);
  if (uploaded?.filePath && fs.existsSync(uploaded.filePath)) {
    return { buffer: fs.readFileSync(uploaded.filePath), fileName: uploaded.name };
  }

  const generated = findGeneratedFileByName(name);
  if (generated) {
    return { buffer: generated.buffer, fileName: generated.fileName };
  }

  return null;
}
