import { useCallback, useRef, useState } from "react";
import { streamChat } from "../api/chatApi";
import type { ChatMessage } from "../types/chat.types";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const sessionIdRef = useRef<string>(newId());

  const sendMessage = useCallback(async (text: string) => {
    const userMessage: ChatMessage = { id: newId(), role: "user", text, toolActivity: [] };
    const assistantId = newId();
    const assistantMessage: ChatMessage = { id: assistantId, role: "assistant", text: "", toolActivity: [] };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    const patchAssistant = (patch: (msg: ChatMessage) => ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? patch(m) : m)));
    };

    try {
      for await (const evt of streamChat(sessionIdRef.current, text)) {
        switch (evt.event) {
          case "text-delta":
            patchAssistant((m) => ({ ...m, text: m.text + String(evt.data.text ?? "") }));
            break;
          case "text-revert": {
            const revertText = String(evt.data.text ?? "");
            patchAssistant((m) => ({
              ...m,
              text: m.text.endsWith(revertText) ? m.text.slice(0, m.text.length - revertText.length) : m.text,
            }));
            break;
          }
          case "tool-call":
            patchAssistant((m) => ({
              ...m,
              toolActivity: [...m.toolActivity, { name: String(evt.data.name), args: String(evt.data.args ?? "") }],
            }));
            break;
          case "tool-result":
            patchAssistant((m) => ({
              ...m,
              toolActivity: m.toolActivity.map((t) =>
                t.name === evt.data.name && t.result === undefined
                  ? { ...t, result: String(evt.data.result ?? "") }
                  : t,
              ),
            }));
            break;
          case "error":
            patchAssistant((m) => ({ ...m, text: m.text + `\n\n[Error: ${String(evt.data.message ?? "unknown")}]` }));
            break;
          case "done":
            break;
        }
      }
    } catch (err) {
      patchAssistant((m) => ({
        ...m,
        text: m.text + `\n\n[Connection error: ${err instanceof Error ? err.message : String(err)}]`,
      }));
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { messages, isStreaming, sendMessage };
}
