import { useEffect, useRef, useState, type ReactNode } from "react";
import { useChatStream } from "../../hooks/useChatStream";
import { MessageBubble } from "./MessageBubble";
import { FileUploadButton } from "../upload/FileUploadButton";
import { UploadedDocsList } from "../upload/UploadedDocsList";
import { listDocuments, uploadDocument, type UploadedDoc } from "../../api/uploadApi";
import { VoiceButton } from "../voice/VoiceButton";
import { useSpeechSynthesis } from "../voice/useSpeechSynthesis";
import { generateTitle, streamChat } from "../../api/chatApi";
import { loadSettings } from "../../utils/settingsStore";
import type { ChatMessage, ServerEvent } from "../../types/chat.types";

const SUGGESTIONS = [
  { icon: "🕒", label: "What time is it?", prompt: "What time is it right now?" },
  { icon: "🧮", label: "Do some math", prompt: "What is 84 times 37?" },
  { icon: "📄", label: "Summarize a doc", prompt: "Summarize the document I uploaded in three bullet points." },
  { icon: "📊", label: "Build a spreadsheet", prompt: "Create an Excel file called budget.xlsx tracking rent, food, and savings for one month." },
];

interface ChatWindowProps {
  conversationId: string;
  initialMessages: ChatMessage[];
  onTitleGenerated: (title: string) => void;
  onTurnComplete: (messages: ChatMessage[]) => void;
  /** All default to the regular (global) chat endpoints; ProjectView passes
   *  project-scoped versions of each instead so a project's chat pane behaves
   *  identically except for where its data actually lives. */
  streamFn?: (conversationId: string, text: string) => AsyncGenerator<ServerEvent>;
  uploadFn?: (file: File) => Promise<UploadedDoc>;
  listDocsFn?: () => Promise<UploadedDoc[]>;
  /** Lets a shared-Project view know when this tab's own turn is in flight, so it can
   *  avoid also rendering that same turn a second time via the live broadcast view. */
  onStreamingChange?: (isStreaming: boolean) => void;
  /** Fires on every input keystroke — used by ProjectView to send debounced typing
   *  signals to other participants in a shared project. Not used by regular chats. */
  onComposerActivity?: () => void;
  /** Appended after the persisted messages — used by ProjectView to render another
   *  participant's turn while it's still streaming live, inline with the real history. */
  extraMessages?: ChatMessage[];
  /** Rendered just above the composer — used by ProjectView for a "someone is typing…"
   *  banner. Not used by regular chats. */
  topBanner?: ReactNode;
}

export function ChatWindow({
  conversationId,
  initialMessages,
  onTitleGenerated,
  onTurnComplete,
  streamFn = streamChat,
  uploadFn = uploadDocument,
  listDocsFn = listDocuments,
  onStreamingChange,
  onComposerActivity,
  extraMessages = [],
  topBanner,
}: ChatWindowProps) {
  const { messages, isStreaming, sendMessage } = useChatStream(
    (text) => streamFn(conversationId, text),
    initialMessages,
    onTurnComplete,
  );
  const [input, setInput] = useState("");
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { speak } = useSpeechSynthesis();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, extraMessages]);

  useEffect(() => {
    onStreamingChange?.(isStreaming);
  }, [isStreaming, onStreamingChange]);

  useEffect(() => {
    listDocsFn()
      .then(setDocs)
      .catch(() => {});
  }, [listDocsFn]);

  /** Wraps sendMessage so a conversation's very first exchange also triggers a title,
   *  regardless of whether it was typed, voice, or a suggestion chip. */
  const send = async (text: string): Promise<string> => {
    const wasFirstTurn = messages.length === 0;
    const finalText = await sendMessage(text);

    if (wasFirstTurn) {
      generateTitle(text, finalText)
        .then(onTitleGenerated)
        .catch(() => onTitleGenerated(text.length > 40 ? `${text.slice(0, 40)}…` : text));
    }

    return finalText;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    void send(text);
  };

  const handleVoiceTranscript = async (text: string) => {
    if (isStreaming) return;
    const finalText = await send(text);
    if (loadSettings().autoSpeakVoiceReplies) speak(finalText);
  };

  return (
    <div className="chat-window">
      <div className="chat-scroll">
        <div className="chat-column">
          <UploadedDocsList docs={docs} />
          {messages.length === 0 && extraMessages.length === 0 ? (
            <div className="chat-empty">
              <h1>What can I help with?</h1>
              <p>Ask anything, upload a document and ask about it, or press the mic to talk.</p>
              <div className="suggestion-grid">
                {SUGGESTIONS.map((s) => (
                  <button key={s.label} type="button" className="suggestion-chip" onClick={() => void send(s.prompt)}>
                    <span className="suggestion-icon">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {extraMessages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <div className="composer-wrapper">
        {topBanner}
        <form className="composer-column" onSubmit={handleSubmit}>
          <div className="composer-pill">
            <FileUploadButton uploadFn={uploadFn} onUploaded={(doc) => setDocs((prev) => [...prev, doc])} />
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                onComposerActivity?.();
              }}
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
