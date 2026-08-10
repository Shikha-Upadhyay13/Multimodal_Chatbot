import type { ServerEvent, ServerEventName } from "../types/chat.types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

/**
 * POSTs a chat message and yields parsed SSE events as they arrive. Manual parsing is
 * needed (rather than EventSource) because EventSource can't send a POST body.
 */
export async function* streamChat(sessionId: string, message: string): AsyncGenerator<ServerEvent> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed: ${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const event = parseEvent(part);
      if (event) yield event;
    }
  }
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

function parseEvent(rawBlock: string): ServerEvent | null {
  let eventName: ServerEventName | null = null;
  let dataLine: string | null = null;

  for (const line of rawBlock.split("\n")) {
    if (line.startsWith("event: ")) eventName = line.slice("event: ".length) as ServerEventName;
    else if (line.startsWith("data: ")) dataLine = line.slice("data: ".length);
  }

  if (!eventName || dataLine === null) return null;
  try {
    return { event: eventName, data: JSON.parse(dataLine) };
  } catch {
    return null;
  }
}
