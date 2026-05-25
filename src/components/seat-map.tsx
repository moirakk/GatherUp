"use client";

import { useState } from "react";

const selectedSeats = new Set(["C5", "C6"]);
const assignedSeats = new Set(["B4", "B5", "C7", "D8", "E3"]);
const blockedSeats = new Set(["A1", "A12", "F1", "F12"]);

export function SeatMap() {
  const rows = ["A", "B", "C", "D", "E", "F"];
  const [editableSeats, setEditableSeats] = useState(() => new Set(selectedSeats));

  function toggleSeat(label: string) {
    if (assignedSeats.has(label) || blockedSeats.has(label)) {
      return;
    }

    setEditableSeats((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  return (
    <div className="seat-panel">
      <div className="seat-legend">
        <span>可选</span>
        <span className="selected">已选</span>
        <span className="assigned">已被选择</span>
        <span className="blocked">不可选</span>
      </div>
      <div className="screen">银幕</div>
      <div className="seat-grid" aria-label="座位图">
        {rows.map((row) => (
          <div className="seat-row" key={row}>
            <span className="seat-row-label">{row}</span>
            {Array.from({ length: 12 }, (_, index) => {
              const label = `${row}${index + 1}`;
              const isLocked = assignedSeats.has(label) || blockedSeats.has(label);
              const className = editableSeats.has(label)
                ? "selected"
                : assignedSeats.has(label)
                  ? "assigned"
                  : blockedSeats.has(label)
                    ? "blocked"
                    : "";

              return (
                <button
                  aria-pressed={editableSeats.has(label)}
                  className={`seat ${className}`}
                  disabled={isLocked}
                  key={label}
                  type="button"
                  onClick={() => toggleSeat(label)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
