import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../../types/chat.types";
import { ToolCallBadge } from "./ToolCallBadge";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`message-row ${message.role}`}>
      {!isUser && <div className="avatar avatar-assistant">✦</div>}
      <div className="message-content">
        {message.toolActivity.map((activity, i) => (
          <ToolCallBadge key={`${activity.name}-${i}`} activity={activity} />
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
          !isUser && <span className="typing-dot" />
        )}
      </div>
      {isUser && <div className="avatar avatar-user">You</div>}
    </div>
  );
}
