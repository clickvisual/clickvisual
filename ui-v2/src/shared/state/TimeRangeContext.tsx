import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

export type TimeRangeValue = "15m" | "1h" | "24h";

type TimeRangeContextValue = {
  timeRange: TimeRangeValue;
  setTimeRange: (nextValue: TimeRangeValue) => void;
};

const TimeRangeContext = createContext<TimeRangeContextValue | null>(null);

export function getTimeRangeLabel(value: TimeRangeValue) {
  switch (value) {
    case "15m":
      return "最近 15 分钟";
    case "24h":
      return "最近 24 小时";
    default:
      return "最近 1 小时";
  }
}

export function TimeRangeProvider({ children }: { children: ReactNode }) {
  const [timeRange, setTimeRange] = useState<TimeRangeValue>("1h");

  const value = useMemo(
    () => ({ timeRange, setTimeRange }),
    [timeRange]
  );

  return (
    <TimeRangeContext.Provider value={value}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  const context = useContext(TimeRangeContext);

  if (!context) {
    throw new Error("useTimeRange must be used within TimeRangeProvider");
  }

  return context;
}
