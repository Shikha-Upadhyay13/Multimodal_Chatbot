import { useState } from "react";
import type { ConversationMeta } from "../../types/conversation.types";
import { ConversationList } from "./ConversationList";
import { ProfileSection } from "./ProfileSection";
import { SettingsPanel } from "./SettingsPanel";
import { loadSettings } from "../../utils/settingsStore";

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

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Personal Chatbot</div>
      <button type="button" className="new-chat-button" onClick={onNewChat}>
        <span className="new-chat-icon">+</span> New chat
      </button>

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
    </aside>
  );
}
