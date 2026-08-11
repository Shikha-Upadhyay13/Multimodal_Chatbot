import { useState } from "react";
import type { ReasoningStep } from "../../types/chat.types";

function prettyArgs(args: string): string {
  try {
    return JSON.stringify(JSON.parse(args), null, 2);
  } catch {
    return args;
  }
}

function groupByRound(steps: ReasoningStep[]): Array<[number, ReasoningStep[]]> {
  const rounds = new Map<number, ReasoningStep[]>();
  for (const step of steps) {
    const list = rounds.get(step.round) ?? [];
    list.push(step);
    rounds.set(step.round, list);
  }
  return [...rounds.entries()].sort(([a], [b]) => a - b);
}

export function ReasoningTimeline({ steps }: { steps: ReasoningStep[] }) {
  const [expanded, setExpanded] = useState(false);
  if (steps.length === 0) return null;

  return (
    <div className="reasoning-timeline">
      <button type="button" className="reasoning-toggle" onClick={() => setExpanded((v) => !v)}>
        <span className={`reasoning-toggle-chevron${expanded ? " open" : ""}`}>▸</span>
        {expanded ? "Hide reasoning" : `Show reasoning · ${steps.length} step${steps.length === 1 ? "" : "s"}`}
      </button>

      {expanded && (
        <div className="reasoning-rounds">
          {groupByRound(steps).map(([round, roundSteps]) => (
            <div className="reasoning-round" key={round}>
              <div className="reasoning-round-label">Round {round + 1}</div>
              {roundSteps.map((step) =>
                step.kind === "chatter" ? (
                  <div className="reasoning-step-chatter" key={`chatter-${round}-${step.text.slice(0, 20)}`}>
                    <span className="reasoning-step-label">considered, then discarded</span>
                    <p>{step.text}</p>
                  </div>
                ) : (
                  <div className="reasoning-step-tool" key={step.id}>
                    <span className="reasoning-step-label">{step.name}</span>
                    <pre className="reasoning-args">{prettyArgs(step.args)}</pre>
                    {step.result !== undefined && <pre className="reasoning-result">{step.result}</pre>}
                  </div>
                ),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
