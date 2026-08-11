import { useState } from "react";

interface NewProjectModalProps {
  onCreate: (name: string, instructions: string) => void;
  onClose: () => void;
}

export function NewProjectModal({ onCreate, onClose }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, instructions.trim());
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="new-project-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-section-title">New project</div>

        <label className="settings-field-label" htmlFor="new-project-name">
          Name
        </label>
        <input
          id="new-project-name"
          className="settings-text-input"
          value={name}
          autoFocus
          placeholder="e.g. Marketing Site Redesign"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />

        <label className="settings-field-label" htmlFor="new-project-instructions" style={{ marginTop: "1rem" }}>
          Custom instructions (optional)
        </label>
        <textarea
          id="new-project-instructions"
          className="settings-textarea"
          value={instructions}
          placeholder="Applied to every conversation in this project — e.g. 'Always answer in French' or 'You're helping plan a wedding.'"
          onChange={(e) => setInstructions(e.target.value)}
        />

        <div className="new-project-actions">
          <button type="button" className="settings-toggle" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="send-button-wide" onClick={handleCreate} disabled={!name.trim()}>
            Create project
          </button>
        </div>
      </div>
    </div>
  );
}
