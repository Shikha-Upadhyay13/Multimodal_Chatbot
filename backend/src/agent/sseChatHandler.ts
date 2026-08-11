import type { Response } from "express";
import type { AgentEvent } from "./agentLoop";

export function setSSEHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

/** Maps AgentEvent -> SSE wire format. Shared by /api/chat and /api/projects/.../messages
 *  so both routes stream identically to the client. */
export function createSSEEventHandler(res: Response): (evt: AgentEvent) => void {
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  return (evt) => {
    switch (evt.type) {
      case "text-delta":
        send("text-delta", { text: evt.text, round: evt.round });
        break;
      case "text-revert":
        send("text-revert", { text: evt.text, round: evt.round });
        break;
      case "tool-call":
        send("tool-call", { id: evt.id, name: evt.name, args: evt.args, round: evt.round });
        break;
      case "tool-result":
        send("tool-result", { id: evt.id, name: evt.name, result: evt.result, round: evt.round });
        break;
      case "done":
        send("done", {});
        break;
    }
  };
}

export function sendSSEError(res: Response, err: unknown): void {
  res.write(`event: error\ndata: ${JSON.stringify({ message: err instanceof Error ? err.message : String(err) })}\n\n`);
}
