import { useEffect, useRef, useState } from "react";
import { useChatStream } from "../../hooks/useChatStream";
import { MessageBubble } from "./MessageBubble";

export function ChatWindow() {
  const { messages, isStreaming, sendMessage } = useChatStream();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    void sendMessage(text);
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.length === 0 && <p className="chat-empty">Ask me anything — try "what time is it?" to see a tool call.</p>}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
