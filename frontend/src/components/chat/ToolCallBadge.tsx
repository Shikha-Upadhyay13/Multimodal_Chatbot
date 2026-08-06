import type { ToolActivity } from "../../types/chat.types";

export function ToolCallBadge({ activity }: { activity: ToolActivity }) {
  const isDone = activity.result !== undefined;
  return (
    <div className="tool-badge">
      <span className="tool-badge-dot" data-done={isDone} />
      <span className="tool-badge-label">
        {isDone ? `Called ${activity.name}` : `Calling ${activity.name}...`}
      </span>
      {isDone && <span className="tool-badge-result">{activity.result}</span>}
    </div>
  );
}
