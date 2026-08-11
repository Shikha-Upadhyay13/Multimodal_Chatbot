import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../../types/chat.types";
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
          <ReactMarkdown
            components={{
              a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" className="download-link" />,
              p: ({ ...props }) => <p className="md-paragraph" {...props} />,
            }}
          >
            {message.text}
          </ReactMarkdown>
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
