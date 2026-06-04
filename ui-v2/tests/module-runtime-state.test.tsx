import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { routes } from "../src/app/router";

describe("v2 module runtime states", () => {
  it("shows degraded error state on overview while keeping core content", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/overview?cv_state=error"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(
      await screen.findByRole("alert", { name: "总览聚合接口暂不可用" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "KPI 概览区" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "一键生成告警规则" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "当前值班动作" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "值班状态" })).not.toBeInTheDocument();
  });

  it("keeps query workspace visible on query route", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/query?cv_state=loading"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(await screen.findByRole("heading", { name: "日志查询" })).toBeInTheDocument();
    expect(screen.getByLabelText("查询上下文")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "筛选" })).toBeInTheDocument();
  });

  it("shows AI failure feedback on alert route without removing rule list", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/alerts/rules?cv_ai=error"]
    });

    render(<RouterProvider router={memoryRouter} />);

    fireEvent.click(await screen.findByRole("button", { name: "生成规则草稿" }));

    expect(await screen.findByText("AI 生成规则草稿失败，请继续手动配置阈值。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "告警规则列表" })).toBeInTheDocument();
  });

  it("keeps settings ai configuration form visible when ai service is unavailable", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/settings/datasource?cv_ai=disabled"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(await screen.findByRole("heading", { name: "统一 AI 配置" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "测试连通性" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存 AI 配置" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "数据源" })).toBeInTheDocument();
  });
});
