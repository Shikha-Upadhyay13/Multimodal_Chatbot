import { Router } from "express";
import { z } from "zod";
import { runAgentLoop } from "../agent/agentLoop";
import { generateTitle } from "../agent/titleGenerator";
import { deleteHistory } from "../agent/messageStore";

export const chatRouter = Router();

const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
});

const titleRequestSchema = z.object({
  userText: z.string().min(1),
  assistantText: z.string().min(1),
});

chatRouter.post("/", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { sessionId, message } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runAgentLoop(sessionId, message, (evt) => {
      switch (evt.type) {
        case "text-delta":
          send("text-delta", { text: evt.text });
          break;
        case "text-revert":
          send("text-revert", { text: evt.text });
          break;
        case "tool-call":
          send("tool-call", { name: evt.name, args: evt.args });
          break;
        case "tool-result":
          send("tool-result", { name: evt.name, result: evt.result });
          break;
        case "done":
          send("done", {});
          break;
      }
    });
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : String(err) });
  } finally {
    res.end();
  }
});

chatRouter.post("/title", async (req, res) => {
  const parsed = titleRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const title = await generateTitle(parsed.data.userText, parsed.data.assistantText);
    res.json({ title });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

chatRouter.delete("/:sessionId", (req, res) => {
  deleteHistory(req.params.sessionId);
  res.json({ status: "ok" });
});
