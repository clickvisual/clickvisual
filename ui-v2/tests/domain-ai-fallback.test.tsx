import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { routes } from "../src/app/router";

function renderRoute(path: string) {
  const memoryRouter = createMemoryRouter(routes, {
    initialEntries: [path]
  });

  render(<RouterProvider router={memoryRouter} />);
}

function expectNoGenericFallbackState() {
  expect(screen.queryByRole("status", { name: "加载中" })).not.toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "暂无数据" })).not.toBeInTheDocument();
  expect(screen.queryByRole("alert", { name: "加载失败" })).not.toBeInTheDocument();
}

describe("v2 domain ai actions and fallback readiness", () => {
  it("keeps overview ai actions and rich sections instead of generic fallback states", async () => {
    renderRoute("/v2/overview");

    const pageHeading = await screen.findByRole("heading", { name: "总览大盘" });
    const pageSection = pageHeading.closest("section");
    expect(pageSection).not.toBeNull();
    if (!pageSection) {
      throw new Error("overview page container not found");
    }

    const scoped = within(pageSection);
    expect(scoped.getByRole("heading", { name: "AI 建议区" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "一键生成告警规则" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "一键生成报表" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "优化 SQL / 索引" })).toBeInTheDocument();
    expect(scoped.getByRole("heading", { name: "最近告警" })).toBeInTheDocument();
    expect(scoped.getByRole("heading", { name: "最近报表" })).toBeInTheDocument();
    expectNoGenericFallbackState();
  });

  it("keeps query actions, tabs and trace hooks ready for t9 acceptance", async () => {
    renderRoute("/v2/query");

    const pageHeading = await screen.findByRole("heading", { name: "日志查询" });
    const pageSection = pageHeading.closest("section");
    expect(pageSection).not.toBeNull();
    if (!pageSection) {
      throw new Error("query page container not found");
    }

    const scoped = within(pageSection);
    expect(scoped.getByRole("button", { name: "执行查询" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "保存查询" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "新增条件" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "分享" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "原始日志" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "聚合统计" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "Trace 视图" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "JSON 视图" })).toBeInTheDocument();
    expect(scoped.getAllByRole("button", { name: /trace-/i }).length).toBeGreaterThanOrEqual(3);
    expectNoGenericFallbackState();
  });

  it("keeps alert ai and execution entry points visible without degrading to empty or error cards", async () => {
    renderRoute("/v2/alerts/rules");

    const pageHeading = await screen.findByRole("heading", { name: "告警中心" });
    const pageSection = pageHeading.closest("section");
    expect(pageSection).not.toBeNull();
    if (!pageSection) {
      throw new Error("alert page container not found");
    }

    const scoped = within(pageSection);
    expect(scoped.getByRole("button", { name: "AI 规则建议" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "新建规则" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "钉钉消息模板" })).toBeInTheDocument();
    expect(scoped.getAllByRole("button", { name: "试跑" })).toHaveLength(4);
    expect(scoped.getAllByText("P1").length).toBeGreaterThan(0);
    expect(scoped.getAllByText("启用").length).toBeGreaterThan(0);
    expectNoGenericFallbackState();
  });

  it("keeps settings ai and degradation-safe configuration actions visible", async () => {
    renderRoute("/v2/settings/datasource");

    const pageHeading = await screen.findByRole("heading", { name: "配置中心" });
    const pageSection = pageHeading.closest("section");
    expect(pageSection).not.toBeNull();
    if (!pageSection) {
      throw new Error("settings page container not found");
    }

    const scoped = within(pageSection);
    expect(scoped.getByRole("button", { name: "新增数据源" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "新增 DingTalk" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "手动同步数据结构" })).toBeInTheDocument();
    expect(scoped.getByRole("heading", { name: "统一 AI 配置" })).toBeInTheDocument();
    expect(scoped.getByRole("heading", { name: "数据源" })).toBeInTheDocument();
    expect(scoped.getByRole("heading", { name: "DingTalk 通知" })).toBeInTheDocument();
    expect(scoped.getByRole("heading", { name: "系统状态" })).toBeInTheDocument();
    expect(scoped.getByText("生产 ClickHouse")).toBeInTheDocument();
    expect(scoped.getByText("告警群通知")).toBeInTheDocument();
    expect(scoped.getByDisplayValue("gpt-4o-mini")).toBeInTheDocument();
    expectNoGenericFallbackState();
  });
});
