import type { ServerEvent } from "../types/chat.types";
import { streamSSEPost } from "./sseStream";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

export function streamChat(sessionId: string, message: string): AsyncGenerator<ServerEvent> {
  return streamSSEPost(`${API_BASE}/api/chat`, { sessionId, message });
}

/** Fire-and-forget from the caller's perspective: on any failure, callers should fall
 *  back to a client-derived title rather than surfacing an error or blocking the chat. */
export async function generateTitle(userText: string, assistantText: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat/title`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userText, assistantText }),
  });
  if (!res.ok) throw new Error(`Title generation failed: ${res.status}`);
  const data = await res.json();
  return data.title;
}

/** Best-effort cleanup of the backend's in-memory agent history for a deleted conversation. */
export function deleteConversationSession(sessionId: string): void {
  fetch(`${API_BASE}/api/chat/${sessionId}`, { method: "DELETE" }).catch(() => {});
}
