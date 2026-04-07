import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "../src/app/router";
import { render, screen } from "@testing-library/react";

describe("v2 report route", () => {
  it("renders the report page with mock contract snapshots", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/reports"]
    });
    render(<RouterProvider router={memoryRouter} />);
    expect(
      screen.getByRole("heading", { name: "定时报表" })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "报表任务（Mock）" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "报表配置" })).toBeInTheDocument();
    expect(screen.getByText("日报-核心指标概览")).toBeInTheDocument();
    expect(screen.getByText(/输出格式：/)).toBeInTheDocument();
    expect(screen.getByText(/注册状态：/)).toBeInTheDocument();
    expect(screen.getByText(/下次执行时间：/)).toBeInTheDocument();
    expect(screen.getByText(/运维钉钉群（ops-dingtalk）/)).toBeInTheDocument();
    expect(screen.getByText(/推送成功率：/)).toBeInTheDocument();
  });
});
