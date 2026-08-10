import "./App.css";
import { ChatWindow } from "./components/chat/ChatWindow";
import { Sidebar } from "./components/layout/Sidebar";
import { useConversations } from "./hooks/useConversations";
import { loadMessages, saveMessages } from "./utils/conversationStore";

function App() {
  const { conversations, activeId, createConversation, selectConversation, deleteConversation, updateConversation } =
    useConversations();

  return (
    <div className="app-shell">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onNewChat={createConversation}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
      />
      <ChatWindow
        key={activeId}
        conversationId={activeId}
        initialMessages={loadMessages(activeId)}
        onTitleGenerated={(title) => updateConversation(activeId, { title })}
        onTurnComplete={(messages) => {
          saveMessages(activeId, messages);
          updateConversation(activeId, {});
        }}
      />
    </div>
  );
}

export default App;
