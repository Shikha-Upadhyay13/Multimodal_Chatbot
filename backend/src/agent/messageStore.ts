import type Groq from "groq-sdk";
import { SYSTEM_PROMPT } from "./systemPrompt";

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
