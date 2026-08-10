import { useState } from "react";
import { loadSettings, saveSettings } from "../../utils/settingsStore";

export function ProfileSection({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [profileName, setProfileName] = useState(() => loadSettings().profileName);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(profileName);

  const commitRename = () => {
    const next = draft.trim() || "You";
    setProfileName(next);
    saveSettings({ ...loadSettings(), profileName: next });
    setIsEditing(false);
  };

  return (
    <div className="profile-section">
      <div className="profile-avatar">{profileName.charAt(0).toUpperCase()}</div>

      {isEditing ? (
        <input
          className="profile-name-input"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraft(profileName);
              setIsEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="profile-name"
          onClick={() => {
            setDraft(profileName);
            setIsEditing(true);
          }}
          title="Click to rename"
        >
          {profileName}
        </button>
      )}

      <button type="button" className="settings-button" onClick={onOpenSettings} title="Settings">
        ⚙
      </button>
    </div>
  );
}
