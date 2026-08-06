import type { ChatMessage } from "../../types/chat.types";
import { ToolCallBadge } from "./ToolCallBadge";

export function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={`message-row ${message.role}`}>
      <div className="message-bubble">
        {message.toolActivity.map((activity, i) => (
          <ToolCallBadge key={`${activity.name}-${i}`} activity={activity} />
        ))}
        <p>{message.text || (message.role === "assistant" ? "..." : "")}</p>
      </div>
    </div>
  );
}
