import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { loadSettings, saveSettings } from "../../utils/settingsStore";
import { clearAllConversations } from "../../utils/conversationStore";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

type Tab = "general" | "profile";

interface SettingsPanelProps {
  initialTab: Tab;
  profileName: string;
  onProfileNameChange: (name: string) => void;
  onClose: () => void;
}

export function SettingsPanel({ initialTab, profileName, onProfileNameChange, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <nav className="settings-nav">
          <button type="button" className="settings-close" onClick={onClose}>
            ✕
          </button>
          <button
            type="button"
            className={`settings-nav-item ${tab === "general" ? "active" : ""}`}
            onClick={() => setTab("general")}
          >
            <span className="settings-nav-icon">⚙</span> General
          </button>
          <button
            type="button"
            className={`settings-nav-item ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            <span className="settings-nav-icon">👤</span> Profile
          </button>
        </nav>

        <div className="settings-content">
          {tab === "general" ? (
            <GeneralTab />
          ) : (
            <ProfileTab profileName={profileName} onProfileNameChange={onProfileNameChange} />
          )}
        </div>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="settings-select-wrap">
      <select className="settings-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function GeneralTab() {
  const { theme, toggleTheme } = useTheme();
  const [autoSpeak, setAutoSpeak] = useState(() => loadSettings().autoSpeakVoiceReplies);
  const [isClearing, setIsClearing] = useState(false);

  const setAutoSpeakValue = (value: string) => {
    const next = value === "on";
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
    <>
      <h3 className="settings-section-title">General</h3>

      <div className="settings-row">
        <div className="settings-label">Theme</div>
        <Select
          value={theme}
          onChange={(v) => {
            if (v !== theme) toggleTheme();
          }}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
        />
      </div>

      <div className="settings-row">
        <div className="settings-label">Auto-speak voice replies</div>
        <Select
          value={autoSpeak ? "on" : "off"}
          onChange={setAutoSpeakValue}
          options={[
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ]}
        />
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
    </>
  );
}

function ProfileTab({
  profileName,
  onProfileNameChange,
}: {
  profileName: string;
  onProfileNameChange: (name: string) => void;
}) {
  const [draft, setDraft] = useState(profileName);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const next = draft.trim() || "You";
    setDraft(next);
    onProfileNameChange(next);
    saveSettings({ ...loadSettings(), profileName: next });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <>
      <h3 className="settings-section-title">Profile</h3>

      <div className="profile-tab-avatar">{draft.charAt(0).toUpperCase() || "Y"}</div>

      <label className="settings-field-label" htmlFor="profile-name-field">
        Display name
      </label>
      <div className="profile-tab-row">
        <input
          id="profile-name-field"
          className="settings-text-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        <button type="button" className="settings-toggle" onClick={handleSave}>
          {saved ? "Saved ✓" : "Save"}
        </button>
      </div>
      <div className="settings-description">
        This is cosmetic only — there's no account or login in this personal, single-user app.
      </div>
    </>
  );
}
