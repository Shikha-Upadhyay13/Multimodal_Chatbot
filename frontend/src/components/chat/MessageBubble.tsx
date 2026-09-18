import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  documentDownloadUrls,
  documentIdFromDownloadPath,
  isDocumentDownload,
  linkifyDocumentUrls,
  resolveApiUrl,
} from "../../api/base";
import type { ChatMessage } from "../../types/chat.types";
import { nextMovesFor } from "../../utils/agentWork";
import { AgentTrail } from "./AgentTrail";
import { ReasoningTimeline } from "./ReasoningTimeline";

export function MessageBubble({
  message,
  onPreview,
  activePreviewId,
  onRunMove,
  showNextMoves,
}: {
  message: ChatMessage;
  onPreview?: (doc: { id: string; href: string }) => void;
  activePreviewId?: string | null;
  onRunMove?: (prompt: string) => void;
  showNextMoves?: boolean;
}) {
  const isUser = message.role === "user";
  const moves = showNextMoves && onRunMove ? nextMovesFor(message) : [];

  return (
    <div className={`message-row ${message.role}`}>
      {!isUser && <div className="avatar avatar-assistant">✦</div>}
      <div className="message-content">
        {!isUser && <AgentTrail steps={message.reasoningSteps} />}
        {message.text ? (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children, ...props }) => {
                  const resolved = href ? resolveApiUrl(href) : href;
                  if (resolved && isDocumentDownload(resolved)) {
                    return (
                      <a {...props} href={resolved} className="download-link" download>
                        {children}
                      </a>
                    );
                  }
                  return (
                    <a {...props} href={resolved} target="_blank" rel="noreferrer" className="download-link">
                      {children}
                    </a>
                  );
                },
                img: ({ src, alt, ...props }) => (
                  <img {...props} src={src ? resolveApiUrl(src) : src} alt={alt ?? ""} className="chat-image" />
                ),
                p: ({ ...props }) => <p className="md-paragraph" {...props} />,
                table: ({ ...props }) => (
                  <div className="md-table-wrap">
                    <table className="md-table" {...props} />
                  </div>
                ),
              }}
            >
              {linkifyDocumentUrls(message.text)}
            </ReactMarkdown>
            {documentDownloadUrls(message.text).map((path) => (
              <DocumentActions
                key={path}
                path={path}
                onPreview={onPreview}
                activePreviewId={activePreviewId}
              />
            ))}
            {moves.length > 0 && (
              <div className="next-moves">
                <div className="next-moves-kicker">Keep going</div>
                <div className="next-moves-row">
                  {moves.map((move) => (
                    <button
                      key={move.label}
                      type="button"
                      className="next-move-chip"
                      onClick={() => onRunMove?.(move.prompt)}
                    >
                      {move.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          !isUser && message.reasoningSteps.length === 0 && (
            <div className="thinking-indicator">
              <span />
              <span />
              <span />
            </div>
          )
        )}
        {!isUser && <ReasoningTimeline steps={message.reasoningSteps} />}
      </div>
      {isUser && <div className="avatar avatar-user">You</div>}
    </div>
  );
}

function DocumentActions({
  path,
  onPreview,
  activePreviewId,
}: {
  path: string;
  onPreview?: (doc: { id: string; href: string }) => void;
  activePreviewId?: string | null;
}) {
  const id = documentIdFromDownloadPath(path);
  const href = resolveApiUrl(path);
  const isActive = Boolean(id && id === activePreviewId);

  return (
    <div className="doc-actions">
      {id && onPreview && (
        <button
          type="button"
          className={`doc-preview-btn${isActive ? " is-active" : ""}`}
          onClick={() => onPreview({ id, href })}
        >
          {isActive ? "Hide preview" : "Preview"}
        </button>
      )}
      <a className="doc-download-btn" href={href} download>
        Download file
      </a>
    </div>
  );
}
