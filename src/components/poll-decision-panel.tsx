"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";

import { type PollOption } from "@/lib/mock-data";

type PollDecisionPanelProps = {
  actionLabel: string;
  emptyLabel: string;
  options: PollOption[];
};

export function PollDecisionPanel({ actionLabel, emptyLabel, options }: PollDecisionPanelProps) {
  const initialSelected = useMemo(
    () => options.find((option) => option.selected)?.label ?? options[0]?.label ?? "",
    [options]
  );
  const [selectedLabel, setSelectedLabel] = useState(initialSelected);
  const [notice, setNotice] = useState("");

  function confirmOption(label: string) {
    setSelectedLabel(label);
    setNotice(`已将「${label}」设为${emptyLabel}`);
  }

  return (
    <div className="decision-panel">
      {notice && <p className="inline-notice">{notice}</p>}
      <div className="result-list">
        {options.map((option) => {
          const isSelected = option.label === selectedLabel;

          return (
            <div className={isSelected ? "result-row selected decision-row" : "result-row decision-row"} key={option.label}>
              <span>
                {isSelected && <Check size={15} />}
                {option.label}
              </span>
              <strong>{option.votes} 票</strong>
              <button
                className="mini-action approve"
                disabled={isSelected}
                type="button"
                onClick={() => confirmOption(option.label)}
              >
                {isSelected ? "已选定" : actionLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
