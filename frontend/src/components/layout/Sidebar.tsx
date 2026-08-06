export function Sidebar({ onNewChat }: { onNewChat: () => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Personal Chatbot</div>
      <button type="button" className="new-chat-button" onClick={onNewChat}>
        <span className="new-chat-icon">+</span> New chat
      </button>
      <div className="sidebar-footer">Built from scratch on Groq — free & local</div>
    </aside>
  );
}
