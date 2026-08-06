import { useState } from "react";
import type { ToolActivity } from "../../types/chat.types";

const PREVIEW_LENGTH = 140;

export function ToolCallBadge({ activity }: { activity: ToolActivity }) {
  const [expanded, setExpanded] = useState(false);
  const isDone = activity.result !== undefined;
  const result = activity.result ?? "";
  const isLong = result.length > PREVIEW_LENGTH;
  const shown = expanded || !isLong ? result : `${result.slice(0, PREVIEW_LENGTH)}...`;

  return (
    <div className="tool-badge">
      <span className="tool-badge-dot" data-done={isDone} />
      <span className="tool-badge-label">
        {isDone ? `Called ${activity.name}` : `Calling ${activity.name}...`}
      </span>
      {isDone && <span className="tool-badge-result">{shown}</span>}
      {isDone && isLong && (
        <button type="button" className="tool-badge-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "show less" : "show more"}
        </button>
      )}
    </div>
  );
}
