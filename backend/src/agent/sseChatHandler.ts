import type { Response } from "express";
import type { AgentEvent } from "./agentLoop";

export interface SSEFrame {
  event: string;
  data: unknown;
}

export function setSSEHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

export function writeSSEEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Maps AgentEvent -> SSE wire format. This is the single source of truth for that
 *  mapping, used both to write directly to a requester's own response and — for shared
 *  Projects — to broadcast the identical frame to other live viewers (see
 *  projects/turnBroadcast.ts), so the two paths can never drift apart. */
export function toSSEFrame(evt: AgentEvent): SSEFrame {
  switch (evt.type) {
    case "text-delta":
      return { event: "text-delta", data: { text: evt.text, round: evt.round } };
    case "text-revert":
      return { event: "text-revert", data: { text: evt.text, round: evt.round } };
    case "tool-call":
      return { event: "tool-call", data: { id: evt.id, name: evt.name, args: evt.args, round: evt.round } };
    case "tool-result":
      return { event: "tool-result", data: { id: evt.id, name: evt.name, result: evt.result, round: evt.round } };
    case "done":
      return { event: "done", data: {} };
  }
}

/** Maps AgentEvent -> SSE wire format. Shared by /api/chat and /api/projects/.../messages
 *  so both routes stream identically to the client. */
export function createSSEEventHandler(res: Response): (evt: AgentEvent) => void {
  return (evt) => {
    const frame = toSSEFrame(evt);
    writeSSEEvent(res, frame.event, frame.data);
  };
}

export function sendSSEError(res: Response, err: unknown): void {
  writeSSEEvent(res, "error", { message: err instanceof Error ? err.message : String(err) });
}
