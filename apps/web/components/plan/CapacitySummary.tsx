"use client";

interface CapacitySummaryProps {
  plannedMinutes: number;
  availableMinutes: number;
}

export default function CapacitySummary({
  plannedMinutes,
  availableMinutes,
}: CapacitySummaryProps) {
  const percent =
    availableMinutes > 0
      ? Math.round((plannedMinutes / availableMinutes) * 100)
      : 0;

  const isOver = plannedMinutes > availableMinutes;
  const isFull = percent >= 90 && !isOver;

  let progressColor = "bg-accent";
  let statusBadgeClass = "bg-accent/15 text-accent border-accent/30";
  let statusText = `${percent}% capacity planned`;

  if (isOver) {
    progressColor = "bg-danger";
    statusBadgeClass = "bg-danger/15 text-danger border-danger/30";
    const overMinutes = plannedMinutes - availableMinutes;
    statusText = `${overMinutes} mins over capacity`;
  } else if (isFull) {
    progressColor = "bg-amber-500";
    statusBadgeClass = "bg-amber-500/15 text-amber-500 border-amber-500/30";
    statusText = "Fully planned";
  }

  const formatHoursMins = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    if (hours === 0) return `${remainder}m`;
    if (remainder === 0) return `${hours}h`;
    return `${hours}h ${remainder}m`;
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Capacity Overview
          </span>
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-2xl font-bold tracking-tight text-text">
              {formatHoursMins(plannedMinutes)}
            </span>
            <span className="text-sm font-medium text-muted">
              of {formatHoursMins(availableMinutes)} available
            </span>
          </div>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass}`}
        >
          {statusText}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.min(Math.max(percent, 0), 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={statusText}
        aria-label="Planned day capacity utilization"
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className={`h-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      <div className="flex items-center justify-between pt-2 text-[11px] text-faint">
        <span>0m</span>
        <span>{formatHoursMins(Math.round(availableMinutes / 2))}</span>
        <span>{formatHoursMins(availableMinutes)}</span>
      </div>
    </div>
  );
}
