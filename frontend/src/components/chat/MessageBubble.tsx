import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../../types/chat.types";
import { ToolCallBadge } from "./ToolCallBadge";

export function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={`message-row ${message.role}`}>
      <div className="message-bubble">
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
          message.role === "assistant" && <p>...</p>
        )}
      </div>
    </div>
  );
}
