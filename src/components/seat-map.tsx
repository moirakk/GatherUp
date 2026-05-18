const selectedSeats = new Set(["C5", "C6"]);
const assignedSeats = new Set(["B4", "B5", "C7", "D8", "E3"]);
const blockedSeats = new Set(["A1", "A12", "F1", "F12"]);

export function SeatMap() {
  const rows = ["A", "B", "C", "D", "E", "F"];

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
              const className = selectedSeats.has(label)
                ? "selected"
                : assignedSeats.has(label)
                  ? "assigned"
                  : blockedSeats.has(label)
                    ? "blocked"
                    : "";

              return (
                <button className={`seat ${className}`} key={label} type="button">
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
