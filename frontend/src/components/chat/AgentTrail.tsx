import type { ReasoningStep } from "../../types/chat.types";
import { planSteps, toolStepCopy, toolSteps } from "../../utils/agentWork";

export function AgentTrail({ steps }: { steps: ReasoningStep[] }) {
  const plans = planSteps(steps);
  const tools = toolSteps(steps);
  if (plans.length === 0 && tools.length === 0) return null;

  return (
    <div className="agent-trail">
      {plans.map((plan, i) => (
        <div className="agent-plan" key={`plan-${plan.round}-${i}`}>
          <span className="agent-plan-kicker">Plan</span>
          <p>{plan.text.trim()}</p>
        </div>
      ))}
      {tools.map((step) => {
        const done = step.result !== undefined;
        return (
          <div className={`agent-step${done ? " is-done" : ""}`} key={step.id}>
            <span className="agent-step-dot" />
            <span className="agent-step-label">{toolStepCopy(step.name, done)}</span>
          </div>
        );
      })}
    </div>
  );
}
