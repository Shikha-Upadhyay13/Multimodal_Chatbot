import { Router, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import {
  createProject,
  getProject,
  updateProjectInstructions,
  listProjectConversations,
  createProjectConversation,
  getProjectConversation,
  renameProjectConversation,
  touchProjectConversation,
  deleteProjectConversation,
} from "../projects/projectStore";
import { sessionFor, getRawMessages } from "../projects/projectMessageStore";
import { reconstructDisplayMessages } from "../projects/reconstructMessages";
import { runExclusive } from "../projects/conversationLock";
import { runAgentLoop, type AgentEvent } from "../agent/agentLoop";
import { setSSEHeaders, writeSSEEvent, toSSEFrame, sendSSEError } from "../agent/sseChatHandler";
import * as turnBroadcast from "../projects/turnBroadcast";
import { setTyping } from "../projects/typingTracker";
import { ingestFile } from "../rag/ingest";
import { listDocuments } from "../rag/vectorStore";
import { UnsupportedFileTypeError } from "../parsers";

export const projectsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const createProjectSchema = z.object({
  name: z.string().min(1),
  instructions: z.string().optional(),
});

/** Loads the project or responds 404. Returns undefined (having already responded) if not found. */
function requireProject(id: string, res: Response) {
  const project = getProject(id);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return undefined;
  }
  return project;
}

/** Loads a conversation and confirms it actually belongs to this project, or responds 404. */
function requireProjectConversation(projectId: string, conversationId: string, res: Response) {
  const conversation = getProjectConversation(conversationId);
  if (!conversation || conversation.projectId !== projectId) {
    res.status(404).json({ error: "Conversation not found in this project." });
    return undefined;
  }
  return conversation;
}

projectsRouter.post("/", (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const project = createProject(parsed.data.name, parsed.data.instructions);
  res.json(project);
});

projectsRouter.get("/:id", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;
  res.json(project);
});

projectsRouter.patch("/:id", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;

  const parsed = z.object({ instructions: z.string().nullable() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  updateProjectInstructions(project.id, parsed.data.instructions);
  res.json(getProject(project.id));
});

projectsRouter.get("/:id/conversations", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;
  res.json(listProjectConversations(project.id));
});

projectsRouter.post("/:id/conversations", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;
  res.json(createProjectConversation(project.id));
});

projectsRouter.delete("/:id/conversations/:cid", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;
  const conversation = requireProjectConversation(project.id, req.params.cid, res);
  if (!conversation) return;

  deleteProjectConversation(conversation.id);
  res.json({ status: "ok" });
});

projectsRouter.get("/:id/conversations/:cid/messages", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;
  const conversation = requireProjectConversation(project.id, req.params.cid, res);
  if (!conversation) return;

  res.json(reconstructDisplayMessages(getRawMessages(conversation.id)));
});

const chatTurnSchema = z.object({ message: z.string().min(1) });

projectsRouter.post("/:id/conversations/:cid/messages", async (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;
  const conversation = requireProjectConversation(project.id, req.params.cid, res);
  if (!conversation) return;

  const parsed = chatTurnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  setSSEHeaders(res);
  turnBroadcast.startTurn(conversation.id, parsed.data.message);
  const onEvent = (evt: AgentEvent) => {
    const frame = toSSEFrame(evt);
    writeSSEEvent(res, frame.event, frame.data);
    turnBroadcast.publish(conversation.id, frame);
  };

  try {
    await runExclusive(conversation.id, () =>
      runAgentLoop(parsed.data.message, onEvent, sessionFor(conversation.id, project.id)),
    );
    touchProjectConversation(conversation.id);
  } catch (err) {
    sendSSEError(res, err);
    turnBroadcast.publish(conversation.id, {
      event: "error",
      data: { message: err instanceof Error ? err.message : String(err) },
    });
  } finally {
    turnBroadcast.endTurn(conversation.id);
    res.end();
  }
});

/** Pure SSE subscribe endpoint — no request body, so the frontend can use a plain native
 *  EventSource here (unlike the POST chat-turn route above, which needs a hand-rolled
 *  fetch+ReadableStream reader since EventSource can't POST). Lets every participant in a
 *  shared project watch someone else's turn stream in live, not just the sender. */
projectsRouter.get("/:id/conversations/:cid/stream", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;
  const conversation = requireProjectConversation(project.id, req.params.cid, res);
  if (!conversation) return;

  setSSEHeaders(res);

  const active = turnBroadcast.getActiveTurn(conversation.id);
  if (active) {
    for (const frame of active.buffer) writeSSEEvent(res, frame.event, frame.data);
  }

  const unsubscribe = turnBroadcast.subscribe(conversation.id, (frame) => {
    writeSSEEvent(res, frame.event, frame.data);
  });
  req.on("close", unsubscribe);
});

const typingSchema = z.object({ participantId: z.string().min(1), isTyping: z.boolean() });

projectsRouter.post("/:id/conversations/:cid/typing", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;
  const conversation = requireProjectConversation(project.id, req.params.cid, res);
  if (!conversation) return;

  const parsed = typingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  setTyping(conversation.id, parsed.data.participantId, parsed.data.isTyping);
  res.status(204).end();
});

projectsRouter.patch("/:id/conversations/:cid", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;
  const conversation = requireProjectConversation(project.id, req.params.cid, res);
  if (!conversation) return;

  const parsed = z.object({ title: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  renameProjectConversation(conversation.id, parsed.data.title);
  res.json({ status: "ok" });
});

projectsRouter.post("/:id/upload", upload.single("file"), async (req, res) => {
  const project = requireProject(String(req.params.id), res);
  if (!project) return;

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded (expected multipart field 'file')." });
    return;
  }

  try {
    const result = await ingestFile(req.file.buffer, req.file.originalname, project.id);
    res.json(result);
  } catch (err) {
    if (err instanceof UnsupportedFileTypeError) {
      res.status(415).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

projectsRouter.get("/:id/documents", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;
  res.json(listDocuments(project.id));
});
