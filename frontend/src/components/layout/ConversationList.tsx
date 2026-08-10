import type { ConversationMeta } from "../../types/conversation.types";

interface ConversationListProps {
  conversations: ConversationMeta[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationList({ conversations, activeId, onSelect, onDelete }: ConversationListProps) {
  return (
    <nav className="conversation-list">
      {conversations.map((c) => (
        <div
          key={c.id}
          className={`conversation-item ${c.id === activeId ? "active" : ""}`}
          onClick={() => onSelect(c.id)}
        >
          <span className="conversation-title">{c.title}</span>
          <button
            type="button"
            className="conversation-delete"
            title="Delete conversation"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(c.id);
            }}
          >
            🗑
          </button>
        </div>
      ))}
    </nav>
  );
}
