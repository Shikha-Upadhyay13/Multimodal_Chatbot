import { API_BASE } from "./base";

export interface DocumentPreviewPayload {
  fileName: string;
  mimeType: string;
  kind: "pdf" | "docx" | "xlsx" | "pptx" | "unknown";
  html?: string;
  sheets?: { name: string; rows: string[][] }[];
}

export async function fetchDocumentPreview(id: string): Promise<DocumentPreviewPayload> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/preview`);
  if (!res.ok) throw new Error(`Preview failed: ${res.status}`);
  return res.json();
}

export function documentInlineUrl(id: string): string {
  return `${API_BASE}/api/documents/${id}/inline`;
}
