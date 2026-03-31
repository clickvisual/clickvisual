import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TIME_RANGE_OPTIONS,
  TimeRangeSwitcher
} from "../src/shared/components/TimeRangeSwitcher";

describe("time range switcher", () => {
  it("renders default options and changes selected range", () => {
    const onChange = vi.fn();

    render(
      <TimeRangeSwitcher
        options={DEFAULT_TIME_RANGE_OPTIONS}
        value="1h"
        onChange={onChange}
      />
    );

    const range15m = screen.getByRole("button", { name: "最近 15 分钟" });
    const range1h = screen.getByRole("button", { name: "最近 1 小时" });
    const range24h = screen.getByRole("button", { name: "最近 24 小时" });

    expect(screen.getByText("15m")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByText("24h")).toBeInTheDocument();
    expect(range1h).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(range24h);
    expect(onChange).toHaveBeenCalledWith("24h");
  });
});
