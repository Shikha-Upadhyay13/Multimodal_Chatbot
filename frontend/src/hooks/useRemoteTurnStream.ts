import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ServerEventName } from "../types/chat.types";
import { getConversationStreamUrl } from "../api/projectsApi";
import { applyServerEvent, type ReducerState } from "./chatEventReducer";

function newId() {
  return `remote-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const NAMED_EVENTS: ServerEventName[] = [
  "turn-start",
  "text-delta",
  "text-revert",
  "tool-call",
  "tool-result",
  "done",
  "error",
  "typing",
];

/**
 * Watches a shared project conversation's live turn broadcast (see
 * backend/src/projects/turnBroadcast.ts) so any participant sees another participant's
 * in-flight message stream in real time, not just after refreshing. Also surfaces typing
 * presence from other participants over the same connection, since it's already open.
 * Uses a plain EventSource, since this is a pure GET subscription with no request body —
 * unlike the chat-turn POST, which needs the hand-rolled fetch+ReadableStream reader.
 */
export function useRemoteTurnStream(
  projectId: string,
  conversationId: string,
  participantId: string,
  onTurnSettled: () => void,
) {
  const [remoteUserText, setRemoteUserText] = useState<string | null>(null);
  const [remoteAssistant, setRemoteAssistant] = useState<ChatMessage | null>(null);
  const [isRemoteStreaming, setIsRemoteStreaming] = useState(false);
  const [typingOthers, setTypingOthers] = useState<Set<string>>(new Set());
  const stateRef = useRef<ReducerState | null>(null);
  const onTurnSettledRef = useRef(onTurnSettled);
  onTurnSettledRef.current = onTurnSettled;

  useEffect(() => {
    setRemoteUserText(null);
    setRemoteAssistant(null);
    setIsRemoteStreaming(false);
    setTypingOthers(new Set());
    stateRef.current = null;

    if (!conversationId) return;
    const source = new EventSource(getConversationStreamUrl(projectId, conversationId));

    const onNamedEvent = (raw: MessageEvent, eventName: ServerEventName) => {
      const data = JSON.parse(raw.data);

      if (eventName === "typing") {
        const otherId = String(data.participantId ?? "");
        if (otherId === participantId) return;
        setTypingOthers((prev) => {
          const next = new Set(prev);
          if (data.isTyping) next.add(otherId);
          else next.delete(otherId);
          return next;
        });
        return;
      }

      if (eventName === "turn-start") {
        const assistant: ChatMessage = { id: newId(), role: "assistant", text: "", reasoningSteps: [] };
        stateRef.current = { message: assistant, finalText: "" };
        setRemoteUserText(typeof data.message === "string" ? data.message : "");
        setRemoteAssistant(assistant);
        setIsRemoteStreaming(true);
        return;
      }

      if (eventName === "done" || eventName === "error") {
        stateRef.current = null;
        setIsRemoteStreaming(false);
        setRemoteUserText(null);
        setRemoteAssistant(null);
        onTurnSettledRef.current();
        return;
      }

      if (!stateRef.current) return; // stray event with no turn-start seen yet — ignore
      const next = applyServerEvent(stateRef.current, { event: eventName, data });
      stateRef.current = next;
      setRemoteAssistant(next.message);
    };

    const listeners = NAMED_EVENTS.map((eventName) => {
      const listener = (e: Event) => onNamedEvent(e as MessageEvent, eventName);
      source.addEventListener(eventName, listener);
      return { eventName, listener };
    });

    return () => {
      for (const { eventName, listener } of listeners) source.removeEventListener(eventName, listener);
      source.close();
    };
  }, [projectId, conversationId, participantId]);

  return { remoteUserText, remoteAssistant, isRemoteStreaming, othersTyping: typingOthers.size > 0 };
}
