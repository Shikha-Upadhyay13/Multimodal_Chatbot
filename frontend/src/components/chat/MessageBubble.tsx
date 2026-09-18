import { useState } from "react";
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
import { DocumentPreviewModal } from "./DocumentPreview";
import { ToolCallBadge } from "./ToolCallBadge";
import { ReasoningTimeline } from "./ReasoningTimeline";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`message-row ${message.role}`}>
      {!isUser && <div className="avatar avatar-assistant">✦</div>}
      <div className="message-content">
        {message.reasoningSteps
          .filter((step) => step.kind === "tool")
          .map((step) => (
            <ToolCallBadge key={step.id} activity={step} />
          ))}
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
              <DocumentActions key={path} path={path} />
            ))}
          </>
        ) : (
          !isUser && (
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

function DocumentActions({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const id = documentIdFromDownloadPath(path);
  const href = resolveApiUrl(path);

  return (
    <div className="doc-actions">
      {id && (
        <button type="button" className="doc-preview-btn" onClick={() => setOpen(true)}>
          Preview
        </button>
      )}
      <a className="doc-download-btn" href={href} download>
        Download file
      </a>
      {open && id && <DocumentPreviewModal id={id} downloadHref={href} onClose={() => setOpen(false)} />}
    </div>
  );
}
