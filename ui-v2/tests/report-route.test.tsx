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
      await screen.findByRole("heading", { name: "报表列表" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("日报-核心指标概览").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "查看报表配置 日报-核心指标概览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "编辑报表调度 日报-核心指标概览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "执行报表预览 日报-核心指标概览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "编辑报表" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "报表配置" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "调度配置" })).not.toBeInTheDocument();
  });
});
