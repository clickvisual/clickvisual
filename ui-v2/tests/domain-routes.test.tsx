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

  it("renders the query route with real query workspace sections", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/query"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(await screen.findByRole("heading", { name: "日志查询" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "查询上下文" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "查询输入" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "直方图" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "查询结果" })).toBeInTheDocument();
    expect(screen.getByText("DSL 模式")).toBeInTheDocument();
    expect(screen.getByText("执行查询")).toBeInTheDocument();
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
    expect(screen.getByLabelText("页面路径")).toBeInTheDocument();
    expect(screen.getAllByText("结构同步").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "数据源" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DingTalk 通知" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "系统状态" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "操作提示" })).toBeInTheDocument();
  });

  it("renders the permission users route as the primary permission workspace", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/permission/users"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(await screen.findByRole("heading", { name: "权限中心" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "用户与授权" })).toBeInTheDocument();
    expect(screen.getByText("角色配置")).toBeInTheDocument();
    expect(screen.getByText("资源范围")).toBeInTheDocument();
    expect(screen.getByText("Root 管理")).toBeInTheDocument();
  });

  it("renders the permission roles route", async () => {
    const rolesRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/permission/roles"]
    });
    render(<RouterProvider router={rolesRouter} />);
    expect(await screen.findByRole("heading", { name: "角色配置" })).toBeInTheDocument();
  });

  it("renders the permission resources route", async () => {
    const resourcesRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/permission/resources"]
    });
    render(<RouterProvider router={resourcesRouter} />);
    expect(await screen.findByRole("heading", { name: "资源范围" })).toBeInTheDocument();
  });

  it("renders the permission root route", async () => {
    const rootRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/permission/root"]
    });
    render(<RouterProvider router={rootRouter} />);
    expect(await screen.findByRole("heading", { name: "Root 管理" })).toBeInTheDocument();
  });
});
