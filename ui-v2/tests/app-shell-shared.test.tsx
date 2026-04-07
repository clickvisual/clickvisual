import { fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { routes } from "../src/app/router";

describe("v2 shared shell", () => {
  it("renders shared shell controls with active report workspace", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/reports"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(
      screen.getByRole("navigation", { name: "v2 主导航" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "定时报表" })).toBeInTheDocument();
    expect(screen.getByText("日志查询")).toBeInTheDocument();
    expect(screen.getByTestId("shell-time-range-switcher")).toHaveClass("cv-top-chip-group");
    expect(screen.getByTestId("shell-version-switcher")).toHaveClass("cv-version-switcher");
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "搜索日志、Trace、报表或配置"
    );
    expect(
      screen.getByRole("button", { name: "最近 1 小时" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("app-shell-topbar")).toBeInTheDocument();
    expect(screen.getAllByText("当前时间范围：最近 1 小时").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "最近 24 小时" }));

    expect(
      screen.getByRole("button", { name: "最近 24 小时" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("当前时间范围：最近 24 小时").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /前往 v1|返回上次使用的 v1/ })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "报表任务（Mock）" })
    ).toBeInTheDocument();
  });
});
