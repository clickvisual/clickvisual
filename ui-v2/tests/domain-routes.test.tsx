import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { routes } from "../src/app/router";

describe("v2 domain routes", () => {
  it("renders the overview route with dashboard structure", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/overview"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(await screen.findByRole("heading", { name: "总览大盘" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "KPI 概览区" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "日志量与错误率趋势" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI 建议区" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "最近报表" })).toBeInTheDocument();
    expect(screen.getByText("一键生成告警规则")).toBeInTheDocument();
  });

  it("renders the query route with query shell sections", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/query"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(await screen.findByRole("heading", { name: "日志查询" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "顶部筛选区" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "查询输入区" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "结果区" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "查询辅助区" })).toBeInTheDocument();
    expect(screen.getByText("DSL 模式")).toBeInTheDocument();
    expect(screen.getByText("原始日志")).toBeInTheDocument();
  });

  it("renders the alert route with rules and events", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/alerts/rules"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(await screen.findByRole("heading", { name: "告警中心" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "告警规则列表" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "告警事件" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI 规则建议" })).toBeInTheDocument();
    expect(screen.getByText("svc-auth 错误率过高")).toBeInTheDocument();
  });

  it("renders the settings route with configuration sections", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/settings/datasource"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(await screen.findByRole("heading", { name: "配置中心" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "配置中心导航" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI 配置面板" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "数据源与通知配置" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "通知配置摘要" })).toBeInTheDocument();
    expect(screen.getByText("GPT-4 Turbo (Azure)")).toBeInTheDocument();
  });
});
