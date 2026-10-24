"use client";

interface AvailableTimeInputProps {
  availableMinutes: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}

const PRESETS = [
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
  { label: "6h", minutes: 360 },
  { label: "8h", minutes: 480 },
];

export default function AvailableTimeInput({
  availableMinutes,
  onChange,
  disabled = false,
}: AvailableTimeInputProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-xs sm:p-5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="available-time-input"
          className="text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Available Time Today
        </label>
        <span className="text-xs text-muted">Set your focus budget</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick time presets">
          {PRESETS.map((preset) => {
            const isSelected = availableMinutes === preset.minutes;
            return (
              <button
                key={preset.minutes}
                type="button"
                disabled={disabled}
                onClick={() => onChange(preset.minutes)}
                aria-pressed={isSelected}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-accent text-accent-ink shadow-xs"
                    : "border border-border bg-surface-muted/60 text-muted hover:border-border-strong hover:text-text"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 pl-1">
          <input
            id="available-time-input"
            type="number"
            min={15}
            max={1440}
            step={15}
            disabled={disabled}
            value={availableMinutes}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 1 && val <= 1440) {
                onChange(val);
              }
            }}
            className="w-20 rounded-xl border border-border bg-surface-muted/50 px-2.5 py-1.5 text-center text-xs font-semibold text-text outline-none transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-soft"
          />
          <span className="text-xs text-muted">minutes</span>
        </div>
      </div>
    </div>
  );
}
