import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "../src/app/router";
import { render, screen } from "@testing-library/react";

describe("v2 report route", () => {
  it("renders the report page with mock contract snapshots", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/reports/1001"]
    });
    render(<RouterProvider router={memoryRouter} />);
    expect(
      screen.getByRole("heading", { name: "定时报表" })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "任务导航" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "报表配置" })).toBeInTheDocument();
    expect(screen.getAllByText("日报-核心指标概览").length).toBeGreaterThan(0);
    expect(screen.getByText("输出格式")).toBeInTheDocument();
    expect(screen.getByText("注册状态")).toBeInTheDocument();
    expect(screen.getByText("下次执行时间")).toBeInTheDocument();
    expect(screen.getAllByText("运维钉钉群").length).toBeGreaterThan(0);
    expect(screen.getByText(/推送成功率：/)).toBeInTheDocument();
  });
});
