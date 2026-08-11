import { Router } from "express";
import { z } from "zod";
import { runAgentLoop } from "../agent/agentLoop";
import { generateTitle } from "../agent/titleGenerator";
import { deleteHistory, sessionFor } from "../agent/messageStore";
import { setSSEHeaders, createSSEEventHandler, sendSSEError } from "../agent/sseChatHandler";

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

  setSSEHeaders(res);
  const onEvent = createSSEEventHandler(res);

  try {
    await runAgentLoop(message, onEvent, sessionFor(sessionId));
  } catch (err) {
    sendSSEError(res, err);
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
