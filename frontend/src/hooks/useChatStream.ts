import { useCallback, useRef, useState } from "react";
import type { ChatMessage, ServerEvent } from "../types/chat.types";
import { applyServerEvent } from "./chatEventReducer";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * streamFn is provided by the caller (regular chat vs. project conversation use
 * different endpoints but the identical SSE event shapes) so this hook's turn-handling
 * logic — text-revert, tool activity grouping, title-trigger return value — is reusable
 * as-is for both. initialMessages seeds a conversation being reopened; onTurnComplete
 * reports the settled message array once per turn (not per streamed token) so a caller
 * can persist it and, on a conversation's first turn, generate a title.
 */
export function useChatStream(
  streamFn: (text: string) => AsyncGenerator<ServerEvent>,
  initialMessages: ChatMessage[],
  onTurnComplete: (messages: ChatMessage[]) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesBeforeTurnRef = useRef<ChatMessage[]>(initialMessages);

  /** Returns the final assistant text once the turn completes, so callers (e.g. voice
   *  input) can act on the finished response — e.g. speak it aloud — without having to
   *  scan message state for the right moment. */
  const sendMessage = useCallback(
    async (text: string): Promise<string> => {
      const baseMessages = messagesBeforeTurnRef.current;
      const userMessage: ChatMessage = { id: newId(), role: "user", text, reasoningSteps: [] };
      let assistantMessage: ChatMessage = { id: newId(), role: "assistant", text: "", reasoningSteps: [] };

      setMessages([...baseMessages, userMessage, assistantMessage]);
      setIsStreaming(true);

      const patchAssistant = (patch: (msg: ChatMessage) => ChatMessage) => {
        assistantMessage = patch(assistantMessage);
        const snapshot = assistantMessage;
        setMessages((prev) => prev.map((m) => (m.id === snapshot.id ? snapshot : m)));
      };

      let finalText = "";

      try {
        for await (const evt of streamFn(text)) {
          const next = applyServerEvent({ message: assistantMessage, finalText }, evt);
          finalText = next.finalText;
          patchAssistant(() => next.message);
        }
      } catch (err) {
        const connError = `\n\n[Connection error: ${err instanceof Error ? err.message : String(err)}]`;
        finalText += connError;
        patchAssistant((m) => ({ ...m, text: m.text + connError }));
      } finally {
        setIsStreaming(false);
        const finalMessages = [...baseMessages, userMessage, assistantMessage];
        messagesBeforeTurnRef.current = finalMessages;
        onTurnComplete(finalMessages);
      }

      return finalText;
    },
    [streamFn, onTurnComplete],
  );

  return { messages, isStreaming, sendMessage };
}
