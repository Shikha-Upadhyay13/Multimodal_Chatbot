import "./App.css";
import { ChatWindow } from "./components/chat/ChatWindow";
import { Sidebar } from "./components/layout/Sidebar";
import { ProjectView } from "./pages/ProjectView";
import { useConversations } from "./hooks/useConversations";
import { loadMessages, saveMessages } from "./utils/conversationStore";

function RegularApp() {
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

// Hand-rolled instead of a routing library — this is the only URL pattern the app has.
// server.ts's catch-all already serves index.html for any non-/api path, so deep-linking
// into a project works without any further server-side change.
function getProjectIdFromPath(): string | null {
  const match = window.location.pathname.match(/^\/project\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function App() {
  const projectId = getProjectIdFromPath();
  return projectId ? <ProjectView projectId={projectId} /> : <RegularApp />;
}

export default App;
