import type Groq from "groq-sdk";
import { SYSTEM_PROMPT } from "./systemPrompt";
import type { AgentSession } from "./agentLoop";

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

const sessions = new Map<string, Message[]>();

export function getHistory(sessionId: string): Message[] {
  let history = sessions.get(sessionId);
  if (!history) {
    history = [{ role: "system", content: SYSTEM_PROMPT }];
    sessions.set(sessionId, history);
  }
  return history;
}

export function appendMessages(sessionId: string, messages: Message[]): void {
  getHistory(sessionId).push(...messages);
}

/** Called when a conversation is deleted, so its history doesn't linger in memory for the life of the process. */
export function deleteHistory(sessionId: string): void {
  sessions.delete(sessionId);
}

/** Builds the AgentSession for a regular (global, non-project) chat — unscoped tool
 *  access, in-memory history, matching today's behavior exactly. */
export function sessionFor(sessionId: string): AgentSession {
  return {
    getHistory: () => getHistory(sessionId),
    appendMessages: (messages) => appendMessages(sessionId, messages),
    toolContext: {},
  };
}
