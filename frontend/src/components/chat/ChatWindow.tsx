import { useEffect, useRef, useState } from "react";
import { useChatStream } from "../../hooks/useChatStream";
import { MessageBubble } from "./MessageBubble";
import { FileUploadButton } from "../upload/FileUploadButton";
import { UploadedDocsList } from "../upload/UploadedDocsList";
import { listDocuments, type UploadedDoc } from "../../api/uploadApi";
import { VoiceButton } from "../voice/VoiceButton";
import { useSpeechSynthesis } from "../voice/useSpeechSynthesis";

export function ChatWindow() {
  const { messages, isStreaming, sendMessage } = useChatStream();
  const [input, setInput] = useState("");
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { speak } = useSpeechSynthesis();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    void sendMessage(text);
  };

  const handleVoiceTranscript = async (text: string) => {
    if (isStreaming) return;
    const finalText = await sendMessage(text);
    speak(finalText);
  };

  return (
    <div className="chat-window">
      <UploadedDocsList docs={docs} />
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">
            Ask me anything, upload a document and ask about it, or press the mic to talk — try "what time is
            it?" to see a tool call.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <FileUploadButton onUploaded={(doc) => setDocs((prev) => [...prev, doc])} />
        <VoiceButton onTranscript={(text) => void handleVoiceTranscript(text)} />
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
