import { useEffect, useRef, useState, type ReactNode } from "react";
import { useChatStream } from "../../hooks/useChatStream";
import { MessageBubble } from "./MessageBubble";
import { DocumentPreviewPanel } from "./DocumentPreview";
import { FileUploadButton } from "../upload/FileUploadButton";
import { UploadedDocsList } from "../upload/UploadedDocsList";
import { listDocuments, uploadDocument, type UploadedDoc } from "../../api/uploadApi";
import { VoiceButton } from "../voice/VoiceButton";
import { useSpeechSynthesis } from "../voice/useSpeechSynthesis";
import { generateTitle, streamChat } from "../../api/chatApi";
import { loadSettings } from "../../utils/settingsStore";
import { documentDownloadUrls, documentIdFromDownloadPath, resolveApiUrl } from "../../api/base";
import type { ChatMessage, ServerEvent } from "../../types/chat.types";

const SUGGESTIONS = [
  {
    icon: "🔭",
    label: "Research, then brief me",
    prompt:
      "Look up what's actually happening this week in electric vehicles. Then write a one-page Word briefing with sources and a download link — not a chat essay.",
  },
  {
    icon: "🎛️",
    label: "Invent a working file",
    prompt:
      "Invent a realistic 3-month freelance cashflow spreadsheet (income, expenses, runway) named cashflow.xlsx and hand me the file.",
  },
  {
    icon: "🎬",
    label: "Pitch in slides",
    prompt:
      "Create a 6-slide pitch deck for a neighborhood compost pickup startup. Specific numbers and names, not generic startup filler.",
  },
  {
    icon: "🖼️",
    label: "Sketch the idea",
    prompt: "Generate an image of a rainy-window reading nook at night, cinematic lighting, no text in the image.",
  },
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
  const [preview, setPreview] = useState<{ id: string; href: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { speak } = useSpeechSynthesis();

  const lastAutoPreviewRef = useRef<string | null>(null);
  const readyForAutoPreview = useRef(false);

  const focusComposer = () => {
    inputRef.current?.focus();
  };

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

  useEffect(() => {
    focusComposer();
  }, [conversationId]);

  useEffect(() => {
    if (!isStreaming) focusComposer();
  }, [isStreaming]);

  useEffect(() => {
    if (isStreaming) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    const path = last ? documentDownloadUrls(last.text)[0] : undefined;
    const id = path ? documentIdFromDownloadPath(path) : null;
    if (!readyForAutoPreview.current) {
      readyForAutoPreview.current = true;
      if (id) lastAutoPreviewRef.current = id;
      return;
    }
    if (!id || lastAutoPreviewRef.current === id) return;
    lastAutoPreviewRef.current = id;
    setPreview({ id, href: resolveApiUrl(path!) });
  }, [messages, isStreaming]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector(".settings-overlay")) return;
      if (e.key.length === 1 || e.key === "Backspace") focusComposer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
    focusComposer();
  };

  const handleVoiceTranscript = async (text: string) => {
    if (isStreaming) return;
    const finalText = await send(text);
    if (loadSettings().autoSpeakVoiceReplies) speak(finalText);
  };

  const handlePreview = (doc: { id: string; href: string }) => {
    setPreview((current) => (current?.id === doc.id ? null : doc));
  };

  return (
    <div className={`chat-window${preview ? " is-split" : ""}`}>
      <div className="chat-main">
        <div className="chat-scroll">
          <div className="chat-column">
            <UploadedDocsList docs={docs} />
            {messages.length === 0 && extraMessages.length === 0 ? (
              <div className="chat-empty">
                <h1>What are we making?</h1>
                <p>Give me a job. I&apos;ll research, build the file, and show the trail — not just talk.</p>
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
                {messages.map((m, index) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    onPreview={handlePreview}
                    activePreviewId={preview?.id}
                    onRunMove={(prompt) => void send(prompt)}
                    showNextMoves={!isStreaming && extraMessages.length === 0 && index === messages.length - 1}
                  />
                ))}
                {extraMessages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    onPreview={handlePreview}
                    activePreviewId={preview?.id}
                  />
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
                ref={inputRef}
                autoFocus
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  onComposerActivity?.();
                }}
                placeholder="Give me a job..."
              />
              <VoiceButton onTranscript={(text) => void handleVoiceTranscript(text)} />
              <button type="submit" className="send-button" disabled={isStreaming || !input.trim()}>
                ↑
              </button>
            </div>
          </form>
        </div>
      </div>
      {preview && (
        <DocumentPreviewPanel
          id={preview.id}
          downloadHref={preview.href}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
