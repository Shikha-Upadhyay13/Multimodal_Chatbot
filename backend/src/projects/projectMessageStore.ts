import type Groq from "groq-sdk";
import { randomUUID } from "node:crypto";
import { db } from "../storage/db";
import { SYSTEM_PROMPT } from "../agent/systemPrompt";
import type { AgentSession } from "../agent/agentLoop";

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

db.exec(`
  CREATE TABLE IF NOT EXISTS project_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES project_conversations(id),
    role TEXT NOT NULL,
    content TEXT,
    tool_calls TEXT,
    tool_call_id TEXT,
    created_at INTEGER NOT NULL
  );
`);

interface RawRow {
  role: string;
  content: string | null;
  tool_calls: string | null;
  tool_call_id: string | null;
}

function rowToMessage(row: RawRow): Message {
  if (row.role === "tool") {
    return { role: "tool", content: row.content ?? "", tool_call_id: row.tool_call_id! };
  }
  if (row.role === "assistant") {
    const toolCalls = row.tool_calls ? JSON.parse(row.tool_calls) : undefined;
    return { role: "assistant", content: row.content, tool_calls: toolCalls };
  }
  // user / system
  return { role: row.role, content: row.content ?? "" } as Message;
}

function messageToRow(id: string, conversationId: string, message: Message) {
  const toolCalls = "tool_calls" in message && message.tool_calls ? JSON.stringify(message.tool_calls) : null;
  const toolCallId = "tool_call_id" in message ? message.tool_call_id : null;
  return {
    id,
    conversationId,
    role: message.role,
    content: typeof message.content === "string" ? message.content : null,
    toolCalls,
    toolCallId,
    createdAt: Date.now(),
  };
}

/** Raw persisted rows for a conversation, in insertion order (rowid), never including a
 *  stored system-prompt row — see getHistory(), which synthesizes it fresh every time. */
function getPersistedMessages(conversationId: string): Message[] {
  const rows = db
    .prepare(
      "SELECT role, content, tool_calls, tool_call_id FROM project_messages " +
        "WHERE conversation_id = ? ORDER BY rowid ASC",
    )
    .all(conversationId) as RawRow[];
  return rows.map(rowToMessage);
}

function appendRaw(conversationId: string, messages: Message[]): void {
  const insert = db.prepare(
    "INSERT INTO project_messages (id, conversation_id, role, content, tool_calls, tool_call_id, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  for (const message of messages) {
    const row = messageToRow(randomUUID(), conversationId, message);
    insert.run(row.id, row.conversationId, row.role, row.content, row.toolCalls, row.toolCallId, row.createdAt);
  }
}

/** System prompt is never written as a row — synthesized fresh on every read from the
 *  project's *current* instructions, so editing instructions later affects the very next
 *  turn instead of being frozen at conversation-creation time. */
function buildSystemMessage(conversationId: string): Message {
  const project = db
    .prepare(
      "SELECT p.instructions as instructions FROM project_conversations pc " +
        "JOIN projects p ON pc.project_id = p.id WHERE pc.id = ?",
    )
    .get(conversationId) as { instructions: string | null } | undefined;

  const content = project?.instructions
    ? `${SYSTEM_PROMPT}\n\nThis conversation is inside a shared project with its own custom instructions from the user — follow these too:\n${project.instructions}`
    : SYSTEM_PROMPT;

  return { role: "system", content };
}

/** Builds the AgentSession for a project conversation — persisted (SQLite) history,
 *  scoped to this project's documents/generated files. */
export function sessionFor(conversationId: string, projectId: string): AgentSession {
  return {
    getHistory: () => [buildSystemMessage(conversationId), ...getPersistedMessages(conversationId)],
    appendMessages: (messages) => appendRaw(conversationId, messages),
    toolContext: { projectId },
  };
}

/** For "someone opens the link" hydration — the raw persisted messages, without the
 *  synthesized system prompt (never shown to the user anyway). */
export function getRawMessages(conversationId: string): Message[] {
  return getPersistedMessages(conversationId);
}
