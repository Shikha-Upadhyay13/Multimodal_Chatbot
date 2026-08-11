import type { ServerEvent, ServerEventName } from "../types/chat.types";

/**
 * POSTs a JSON body and yields parsed SSE events as they arrive. Manual parsing is needed
 * (rather than EventSource) because EventSource can't send a POST body. Shared by
 * chatApi.ts (regular chats) and projectsApi.ts (project conversations) — same wire
 * format, different URL.
 */
export async function* streamSSEPost(url: string, body: unknown): AsyncGenerator<ServerEvent> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
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
