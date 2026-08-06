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
      <div className="chat-scroll">
        <div className="chat-column">
          <UploadedDocsList docs={docs} />
          {messages.length === 0 ? (
            <div className="chat-empty">
              <h1>What can I help with?</h1>
              <p>Ask anything, upload a document and ask about it, or press the mic to talk.</p>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <div className="composer-wrapper">
        <form className="composer-column" onSubmit={handleSubmit}>
          <div className="composer-pill">
            <FileUploadButton onUploaded={(doc) => setDocs((prev) => [...prev, doc])} />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message your assistant..."
              disabled={isStreaming}
            />
            <VoiceButton onTranscript={(text) => void handleVoiceTranscript(text)} />
            <button type="submit" className="send-button" disabled={isStreaming || !input.trim()}>
              ↑
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
