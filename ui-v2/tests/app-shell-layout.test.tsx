import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routes } from "../src/app/router";
import { buildReportWorkspaceMock, resetReportMockStore } from "../src/domains/report/mocks/reportMockData";

describe("v2 app shell", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetReportMockStore();
  });

  it("renders real module navigation entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          code: 0,
          msg: "succ",
          data: buildReportWorkspaceMock()
        })
      }))
    );

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/reports"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(
      screen.getByRole("navigation", { name: "v2 主导航" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-sidebar")).toHaveClass("cv-shell__sidebar");
    expect(screen.getByTestId("app-shell-topbar")).toHaveClass("cv-shell__topbar");
    expect(screen.getByText("ClickHouse")).toBeInTheDocument();
    await screen.findByRole("heading", { name: "定时报表" });

    const reportsLink = screen.getByRole("link", { name: "定时报表" });
    expect(reportsLink).toHaveAttribute("aria-current", "page");
    expect(reportsLink.className).toContain("cv-shell__nav-link--active");
    expect(screen.getByRole("link", { name: "总览大盘" })).toHaveAttribute("href", "/v2/overview");
    expect(screen.getByRole("link", { name: "日志查询" })).toHaveAttribute("href", "/v2/query");
    expect(screen.getByRole("link", { name: "告警中心" })).toHaveAttribute("href", "/v2/alerts/rules");
    expect(screen.getByRole("link", { name: "配置中心" })).toHaveAttribute("href", "/v2/settings/datasource");
    expect(
      screen.getByRole("button", { name: "新建查询" })
    ).toBeInTheDocument();
  });
});
