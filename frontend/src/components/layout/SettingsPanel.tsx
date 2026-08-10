import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { loadSettings, saveSettings } from "../../utils/settingsStore";
import { clearAllConversations } from "../../utils/conversationStore";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [autoSpeak, setAutoSpeak] = useState(() => loadSettings().autoSpeakVoiceReplies);
  const [isClearing, setIsClearing] = useState(false);

  const toggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    saveSettings({ ...loadSettings(), autoSpeakVoiceReplies: next });
  };

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      "This deletes every conversation, uploaded document, and generated file. This can't be undone. Continue?",
    );
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await fetch(`${API_BASE}/api/reset`, { method: "POST" });
    } catch {
      // Still clear local data even if the backend call fails — better than a half-reset.
    }
    clearAllConversations();
    window.location.reload();
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button type="button" className="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Theme</div>
            <div className="settings-description">Switch between dark and light mode.</div>
          </div>
          <button type="button" className="settings-toggle" onClick={toggleTheme}>
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Auto-speak voice replies</div>
            <div className="settings-description">Read the assistant's answer aloud after a voice message.</div>
          </div>
          <button type="button" className="settings-toggle" data-on={autoSpeak} onClick={toggleAutoSpeak}>
            {autoSpeak ? "On" : "Off"}
          </button>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Clear all data</div>
            <div className="settings-description">Delete every conversation, uploaded, and generated file.</div>
          </div>
          <button type="button" className="settings-danger" onClick={handleClearAllData} disabled={isClearing}>
            {isClearing ? "Clearing…" : "Clear data"}
          </button>
        </div>
      </div>
    </div>
  );
}
