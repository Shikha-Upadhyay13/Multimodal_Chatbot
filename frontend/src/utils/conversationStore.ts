import type { ConversationMeta } from "../types/conversation.types";
import type { ChatMessage } from "../types/chat.types";

const CONVERSATIONS_KEY = "chatbot:conversations";
const messagesKey = (id: string) => `chatbot:messages:${id}`;

// Every localStorage call is wrapped — private-browsing mode and quota-exceeded both
// throw synchronously on setItem, and a crashed persistence call shouldn't take the
// chat UI down with it.
function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to persist "${key}" to localStorage:`, err);
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Failed to remove "${key}" from localStorage:`, err);
  }
}

export function listConversations(): ConversationMeta[] {
  return safeGet<ConversationMeta[]>(CONVERSATIONS_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveConversationMeta(meta: ConversationMeta): void {
  const all = safeGet<ConversationMeta[]>(CONVERSATIONS_KEY, []);
  const index = all.findIndex((c) => c.id === meta.id);
  if (index === -1) all.push(meta);
  else all[index] = meta;
  safeSet(CONVERSATIONS_KEY, all);
}

export function deleteConversationData(id: string): void {
  const all = safeGet<ConversationMeta[]>(CONVERSATIONS_KEY, []);
  safeSet(CONVERSATIONS_KEY, all.filter((c) => c.id !== id));
  safeRemove(messagesKey(id));
}

export function loadMessages(id: string): ChatMessage[] {
  return safeGet<ChatMessage[]>(messagesKey(id), []);
}

export function saveMessages(id: string, messages: ChatMessage[]): void {
  safeSet(messagesKey(id), messages);
}

export function clearAllConversations(): void {
  const all = safeGet<ConversationMeta[]>(CONVERSATIONS_KEY, []);
  for (const c of all) safeRemove(messagesKey(c.id));
  safeRemove(CONVERSATIONS_KEY);
}
