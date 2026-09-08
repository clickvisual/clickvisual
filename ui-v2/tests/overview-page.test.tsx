import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import OverviewPage from "../src/domains/overview/pages/OverviewPage";
import * as overviewApi from "../src/domains/overview/api/overview";
import { buildOverviewSummaryMock } from "./fixtures/overviewSummary";

function renderOverview() {
  return render(
    <MemoryRouter initialEntries={["/v2/overview"]}>
      <OverviewPage />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OverviewPage", () => {
  it("renders the three real statistics blocks from the summary api", async () => {
    renderOverview();

    expect(await screen.findByText("真实数据")).toBeInTheDocument();
    expect(screen.getByText(/生成于/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "日志接入统计" })).toBeInTheDocument();
    expect(screen.getByText("123,456")).toBeInTheDocument();
    expect(screen.getByText("5.0 MB · 来自 system.tables")).toBeInTheDocument();
    expect(screen.getByText("JSONEachRow 1")).toBeInTheDocument();
    const appLogLinks = screen.getAllByRole("link", { name: "app_logs" });
    expect(appLogLinks.length).toBe(2);
    expect(appLogLinks[0]).toHaveAttribute(
      "href",
      "/v2/query?instanceId=1&database=default&table=app_logs&tableId=9528"
    );

    expect(screen.getByRole("heading", { name: "告警统计" })).toBeInTheDocument();
    expect(screen.getByText("正常 3 · 已关闭 1")).toBeInTheDocument();
    expect(screen.getByText("近 7 天 9 次")).toBeInTheDocument();
    expect(screen.getByText("88.9%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "gateway 5xx 突增" })).toHaveAttribute("href", "/v2/alerts/rules");
    expect(screen.getByRole("img", { name: /近 7 天告警触发趋势/ })).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "分析报表统计" })).toBeInTheDocument();
    expect(screen.getByText("启用 1 · 停用 1")).toBeInTheDocument();
    expect(screen.getByText("成功 2 · 失败 1 · 部分 0")).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();

    expect(screen.queryByText("svc-auth")).not.toBeInTheDocument();
    expect(screen.queryByText("DB_TIMEOUT")).not.toBeInTheDocument();
    expect(screen.queryByText("静态兜底")).not.toBeInTheDocument();
  });

  it("shows an error notice without fabricated numbers and retries on demand", async () => {
    const spy = vi
      .spyOn(overviewApi, "getOverviewSummary")
      .mockRejectedValueOnce(new Error("metadata database is not attached"))
      .mockResolvedValueOnce(buildOverviewSummaryMock());

    renderOverview();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("metadata database is not attached");
    expect(screen.getByText("数据不可用")).toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThan(0);
    expect(screen.queryByText("12,381,992")).not.toBeInTheDocument();
    expect(screen.queryByText("svc-auth")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => {
      expect(screen.getByText("真实数据")).toBeInTheDocument();
    });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
