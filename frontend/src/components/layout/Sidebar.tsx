import { useState } from "react";
import type { ConversationMeta } from "../../types/conversation.types";
import { ConversationList } from "./ConversationList";
import { ProfileSection } from "./ProfileSection";
import { SettingsPanel } from "./SettingsPanel";
import { NewProjectModal } from "./NewProjectModal";
import { loadSettings } from "../../utils/settingsStore";
import { listRecentProjects, rememberProject } from "../../utils/localProjectsStore";
import { createProject } from "../../api/projectsApi";

interface SidebarProps {
  conversations: ConversationMeta[];
  activeId: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function Sidebar({ conversations, activeId, onNewChat, onSelectConversation, onDeleteConversation }: SidebarProps) {
  const [settingsTab, setSettingsTab] = useState<"general" | "profile" | null>(null);
  const [profileName, setProfileName] = useState(() => loadSettings().profileName);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [recentProjects] = useState(() => listRecentProjects());

  const handleCreateProject = async (name: string, instructions: string) => {
    const project = await createProject(name, instructions || undefined);
    rememberProject({ id: project.id, name: project.name });
    window.location.href = `/project/${project.id}`;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Personal Chatbot</div>
      <button type="button" className="new-chat-button" onClick={onNewChat}>
        <span className="new-chat-icon">+</span> New chat
      </button>

      <div className="sidebar-section-label">Projects</div>
      <button type="button" className="new-chat-button" onClick={() => setIsNewProjectOpen(true)}>
        <span className="new-chat-icon">+</span> New project
      </button>
      {recentProjects.length > 0 && (
        <nav className="project-shortcut-list">
          {recentProjects.map((p) => (
            <a key={p.id} href={`/project/${p.id}`} className="project-shortcut-item">
              📁 {p.name}
            </a>
          ))}
        </nav>
      )}

      <div className="sidebar-section-label">Chats</div>
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={onSelectConversation}
        onDelete={onDeleteConversation}
      />

      <ProfileSection profileName={profileName} onOpenSettings={setSettingsTab} />

      {settingsTab && (
        <SettingsPanel
          initialTab={settingsTab}
          profileName={profileName}
          onProfileNameChange={setProfileName}
          onClose={() => setSettingsTab(null)}
        />
      )}

      {isNewProjectOpen && (
        <NewProjectModal
          onClose={() => setIsNewProjectOpen(false)}
          onCreate={(name, instructions) => {
            void handleCreateProject(name, instructions);
          }}
        />
      )}
    </aside>
  );
}
