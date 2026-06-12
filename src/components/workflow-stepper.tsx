import { Check } from "lucide-react";

import type { GatherEvent } from "@/lib/mock-data";

type WorkflowStepperProps = {
  event: GatherEvent;
};

const workflowSteps = [
  "配置活动",
  "数调",
  "待开放报名",
  "报名中",
  "付款审核",
  "开放选座",
  "已结束"
] as const;

function getCurrentStepIndex(event: GatherEvent) {
  switch (event.status) {
    case "草稿配置":
      return 0;
    case "数调中":
      return 1;
    case "待开放报名":
      return 2;
    case "报名中":
    case "即将截止":
      return 3;
    case "付款确认中":
      return 4;
    case "已成团":
      return event.template === "选座活动" ? 5 : 4;
    case "已结束":
      return 6;
    default:
      return 0;
  }
}

export function WorkflowStepper({ event }: WorkflowStepperProps) {
  const currentStepIndex = getCurrentStepIndex(event);

  return (
    <nav className="workflow-stepper" aria-label="活动流程进度">
      {workflowSteps.map((step, index) => {
        const isComplete = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const state = isComplete ? "complete" : isCurrent ? "current" : "future";

        return (
          <div className={`workflow-step ${state}`} key={step}>
            <span className="workflow-step-marker" aria-hidden="true">
              {isComplete ? <Check size={14} /> : index + 1}
            </span>
            <span>{step}</span>
          </div>
        );
      })}
    </nav>
  );
}
