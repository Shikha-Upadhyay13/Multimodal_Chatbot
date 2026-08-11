import { saveGeneratedFile } from "../../generators/fileRegistry";

export function saveAndDescribe(fileName: string, mimeType: string, buffer: Buffer, projectId?: string): string {
  const file = saveGeneratedFile(fileName, mimeType, buffer, projectId);
  // Relative, not absolute: this app is deployed as a single service (frontend + API
  // share one origin), and a hardcoded http://localhost link would be dead for anyone
  // viewing the deployed app — including the person who asked for the file, not just
  // remote collaborators once Projects are shareable. A relative path resolves against
  // whatever origin is actually viewing the page.
  const downloadUrl = `/api/documents/${file.id}/download`;
  return `Created "${fileName}". Download link: ${downloadUrl}`;
}

export const MIME_TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
} as const;
