import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationMeta } from "../types/conversation.types";
import { listConversations, saveConversationMeta, deleteConversationData } from "../utils/conversationStore";
import { deleteConversationSession } from "../api/chatApi";

function createMeta(): ConversationMeta {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: "New chat", createdAt: now, updatedAt: now };
}

/** Reads the persisted conversation list, creating one if none exist yet — the UI should
 *  never be left with zero conversations to show. */
function ensureAtLeastOneConversation(): ConversationMeta[] {
  const existing = listConversations();
  if (existing.length > 0) return existing;
  const fresh = createMeta();
  saveConversationMeta(fresh);
  return [fresh];
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationMeta[]>(ensureAtLeastOneConversation);
  const [activeId, setActiveId] = useState<string>(() => conversations[0].id);

  // Mutating callbacks below read these refs instead of the state variables directly.
  // A callback like updateConversation can be created for one conversation (e.g. to
  // deliver an auto-generated title) and not actually fire until well after — the title
  // fetch is a real network round-trip — by which time the user may have already
  // deleted that conversation. Reading `conversations` via ordinary closure would act on
  // a stale snapshot and could resurrect a deleted conversation; refs kept in sync via
  // effect always reflect the latest committed state by the time an async callback runs.
  const conversationsRef = useRef(conversations);
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const createConversation = useCallback(() => {
    const fresh = createMeta();
    saveConversationMeta(fresh);
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    deleteConversationData(id);
    deleteConversationSession(id);

    const remaining = conversationsRef.current.filter((c) => c.id !== id);

    if (id !== activeIdRef.current) {
      setConversations(remaining);
      return;
    }

    if (remaining.length > 0) {
      const next = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setConversations(remaining);
      setActiveId(next.id);
    } else {
      const fresh = createMeta();
      saveConversationMeta(fresh);
      setConversations([fresh]);
      setActiveId(fresh.id);
    }
  }, []);

  /** Called after a turn completes, to bump ordering and (for a fresh conversation) set
   *  its auto-generated title. If `id` no longer exists (deleted before this fired),
   *  this is a no-op rather than resurrecting it. */
  const updateConversation = useCallback((id: string, patch: Partial<Pick<ConversationMeta, "title">>) => {
    const current = conversationsRef.current;
    const index = current.findIndex((c) => c.id === id);
    if (index === -1) return;

    const updated: ConversationMeta = { ...current[index], ...patch, updatedAt: Date.now() };
    saveConversationMeta(updated);

    const next = [...current];
    next[index] = updated;
    setConversations(next);
  }, []);

  return { conversations, activeId, createConversation, selectConversation, deleteConversation, updateConversation };
}
