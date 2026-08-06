const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

export interface UploadedDoc {
  documentId?: string;
  id?: string;
  name: string;
  chunkCount?: number;
}

export async function uploadDocument(file: File): Promise<UploadedDoc> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Upload failed: ${res.status}`);
  return data;
}

export async function listDocuments(): Promise<UploadedDoc[]> {
  const res = await fetch(`${API_BASE}/api/upload`);
  if (!res.ok) throw new Error(`Failed to list documents: ${res.status}`);
  return res.json();
}
