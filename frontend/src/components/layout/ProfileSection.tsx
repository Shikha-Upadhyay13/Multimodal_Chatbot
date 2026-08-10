interface ProfileSectionProps {
  profileName: string;
  onOpenSettings: (tab: "general" | "profile") => void;
}

export function ProfileSection({ profileName, onOpenSettings }: ProfileSectionProps) {
  return (
    <div className="profile-section">
      <button
        type="button"
        className="profile-identity"
        onClick={() => onOpenSettings("profile")}
        title="Open profile"
      >
        <div className="profile-avatar">{profileName.charAt(0).toUpperCase()}</div>
        <span className="profile-name">{profileName}</span>
      </button>

      <button type="button" className="settings-button" onClick={() => onOpenSettings("general")} title="Settings">
        ⚙
      </button>
    </div>
  );
}
