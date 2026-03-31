import type { TimeRangeValue } from "../state/TimeRangeContext";

export type TimeRangeOption = {
  label: string;
  value: TimeRangeValue;
  ariaLabel: string;
};

export const DEFAULT_TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: "15m", value: "15m", ariaLabel: "最近 15 分钟" },
  { label: "1h", value: "1h", ariaLabel: "最近 1 小时" },
  { label: "24h", value: "24h", ariaLabel: "最近 24 小时" }
];

type TimeRangeSwitcherProps = {
  options: TimeRangeOption[];
  value: TimeRangeValue;
  onChange: (nextValue: TimeRangeValue) => void;
};

export function TimeRangeSwitcher({
  options,
  value,
  onChange
}: TimeRangeSwitcherProps) {
  return (
    <div
      aria-label="时间范围"
      className="cv-top-chip-group"
      data-testid="shell-time-range-switcher"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={option.ariaLabel}
            aria-pressed={selected}
            className="cv-top-chip"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
