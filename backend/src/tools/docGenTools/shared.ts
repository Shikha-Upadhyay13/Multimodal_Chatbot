import { saveGeneratedFile } from "../../generators/fileRegistry";
import { env } from "../../config/env";

export function saveAndDescribe(fileName: string, mimeType: string, buffer: Buffer): string {
  const file = saveGeneratedFile(fileName, mimeType, buffer);
  const downloadUrl = `http://localhost:${env.PORT}/api/documents/${file.id}/download`;
  return `Created "${fileName}". Download link: ${downloadUrl}`;
}

export const MIME_TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
} as const;
