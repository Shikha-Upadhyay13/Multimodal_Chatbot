const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

export async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, "speech.webm");

  const res = await fetch(`${API_BASE}/api/voice/transcribe`, { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Transcription failed: ${res.status}`);
  return data.text;
}
