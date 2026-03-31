import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildReportWorkspaceMock, resetReportMockStore } from "../src/domains/report/mocks/reportMockData";
import ReportSchedulePage from "../src/domains/report/pages/ReportSchedulePage";
import { TimeRangeProvider } from "../src/shared/state/TimeRangeContext";
import * as reportApi from "../src/domains/report/api/report";

describe("report schedule page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetReportMockStore();
  });

  it("shows a fallback message when workspace loading fails", async () => {
    vi.spyOn(reportApi, "getReportWorkspace").mockRejectedValueOnce(
      new Error("mock workspace unavailable")
    );

    render(
      <TimeRangeProvider>
        <ReportSchedulePage />
      </TimeRangeProvider>
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "报表工作区加载失败：mock workspace unavailable"
    );
  });

  it("shows success feedback after saving report schedule", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "GET") {
          return {
            ok: true,
            json: async () => ({
              code: 0,
              msg: "succ",
              data: buildReportWorkspaceMock()
            })
          };
        }

        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: {
              nodeId: 1001,
              desc: "核心指标日报任务",
              dutyUid: 10086,
              cron: "0 */2 * * * *",
              typ: 0,
              channelIds: [201],
              isRetry: 1,
              retryTimes: 2,
              retryInterval: 300
            }
          })
        };
      })
    );

    render(
      <TimeRangeProvider>
        <ReportSchedulePage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "报表配置" });

    fireEvent.change(screen.getByLabelText("Cron"), {
      target: { value: "0 */2 * * * *" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存报表调度" }));

    expect(await screen.findByText("保存成功")).toBeInTheDocument();
  });

  it("shows pending feedback and disables save actions while saving", async () => {
    let resolveSave: (() => void) | null = null;
    vi.spyOn(reportApi, "saveReportSchedule").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = () =>
            resolve({
              ...buildReportWorkspaceMock().schedule,
              cron: "0 */5 * * * *"
            });
        })
    );
    vi.spyOn(reportApi, "getReportWorkspace").mockResolvedValue(
      buildReportWorkspaceMock()
    );

    render(
      <TimeRangeProvider>
        <ReportSchedulePage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "调度配置" });

    fireEvent.click(screen.getByRole("button", { name: "保存报表调度" }));

    expect(screen.getByRole("status")).toHaveTextContent("保存调度进行中...");
    expect(screen.getByRole("button", { name: "保存中..." })).toBeDisabled();
    expect(screen.getByLabelText("Cron")).toBeDisabled();

    resolveSave?.();

    expect(await screen.findByText("保存成功")).toBeInTheDocument();
  });

  it("switches workspace details when selecting another report", async () => {
    render(
      <TimeRangeProvider>
        <ReportSchedulePage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "报表配置" });

    fireEvent.click(
      screen.getByRole("button", { name: "切换到报表 周报-异常波动追踪" })
    );

    expect(await screen.findByText("查询模式：DSL")).toBeInTheDocument();
    expect(screen.getByText("输出格式：image")).toBeInTheDocument();
    expect(
      screen.getByText(/运维钉钉群（ops-dingtalk）/)
    ).toBeInTheDocument();
    expect(screen.getByText("调度表达式：0 0 10 * * 1")).toBeInTheDocument();
    expect(screen.getByText("注册状态：已暂停")).toBeInTheDocument();
    expect(screen.getByText("下次执行时间：未记录")).toBeInTheDocument();
    expect(screen.getByText("最近一次定时执行：未知")).toBeInTheDocument();
    expect(
      screen.getByText("最近一次触发方式 / 执行人：schedule / system")
    ).toBeInTheDocument();
  });

  it("shows error feedback when saving without channels", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method || "GET";

        if (method === "GET") {
          return {
            ok: true,
            json: async () => ({
              code: 0,
              msg: "succ",
              data: buildReportWorkspaceMock()
            })
          };
        }

        return {
          ok: true,
          json: async () => ({
            code: 1,
            msg: "channelIds 不能为空",
            data: null
          })
        };
      })
    );

    render(
      <TimeRangeProvider>
        <ReportSchedulePage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "调度配置" });

    fireEvent.click(screen.getByLabelText("运维钉钉群"));
    fireEvent.click(screen.getByRole("button", { name: "保存报表调度" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "保存调度失败：channelIds 不能为空"
    );
  });

  it("keeps current workspace when save succeeds but refresh fails", async () => {
    vi.spyOn(reportApi, "getReportWorkspace")
      .mockResolvedValueOnce(buildReportWorkspaceMock())
      .mockRejectedValueOnce(new Error("refresh unavailable"));
    vi.spyOn(reportApi, "saveReportSchedule").mockResolvedValue({
      ...buildReportWorkspaceMock().schedule,
      cron: "0 */2 * * * *"
    });

    render(
      <TimeRangeProvider>
        <ReportSchedulePage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "调度配置" });

    fireEvent.change(screen.getByLabelText("Cron"), {
      target: { value: "0 */2 * * * *" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存报表调度" }));

    expect(
      await screen.findByText("保存成功，工作区刷新失败，已保留当前内容")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("alert")
    ).toHaveTextContent("报表工作区刷新失败，已保留当前内容：refresh unavailable");
    expect(screen.getByText("调度表达式：0 */2 * * * *")).toBeInTheDocument();
    expect(screen.getByText("注册状态：已注册")).toBeInTheDocument();
  });

  it("runs preview and refreshes execution history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "GET") {
          return {
            ok: true,
            json: async () => ({
              code: 0,
              msg: "succ",
              data: buildReportWorkspaceMock()
            })
          };
        }

        if (url.pathname.endsWith("/api/v2/reports/preview-run")) {
          return {
            ok: true,
            json: async () => ({
              code: 0,
              msg: "succ",
              data: {
                preview: {
                  reportId: 1001,
                  canRun: true,
                  nextRunAt: "2026-03-31T09:00:00+08:00",
                  lastRunAt: "2026-03-30T17:40:00+08:00",
                  message: "本次手动预览已完成，1 个渠道推送成功。"
                },
                execution: {
                  id: 50009,
                  reportId: 1001,
                  status: "success",
                  trigger: "manual",
                  startedAt: "2026-03-30T17:39:58+08:00",
                  endedAt: "2026-03-30T17:40:00+08:00",
                  durationSeconds: 2,
                  operatorName: "clickvisual"
                },
                delivery: {
                  reportId: 1001,
                  total: 6,
                  success: 5,
                  failed: 1,
                  channels: [
                    {
                      channelId: 201,
                      channelTyp: "dingtalk",
                      success: 5,
                      failed: 1,
                      lastSentAt: "2026-03-30T17:40:00+08:00"
                    }
                  ]
                }
              }
            })
          };
        }

        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: {
              nodeId: 1001,
              desc: "核心指标日报任务",
              dutyUid: 10086,
              cron: "0 0 9 * * *",
              typ: 0,
              channelIds: [201],
              isRetry: 1,
              retryTimes: 2,
              retryInterval: 300
            }
          })
        };
      })
    );

    render(
      <TimeRangeProvider>
        <ReportSchedulePage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "最近执行记录" });

    fireEvent.click(screen.getByRole("button", { name: "执行预览" }));

    expect(await screen.findByText("预览执行完成")).toBeInTheDocument();
    expect(screen.getByText("manual / success / clickvisual")).toBeInTheDocument();
    expect(
      screen.getByText("执行预览：本次手动预览已完成，1 个渠道推送成功。")
    ).toBeInTheDocument();
    expect(screen.getByText(/推送成功率：83%/)).toBeInTheDocument();
  });

  it("shows pending feedback and disables preview action while running", async () => {
    let resolvePreview: (() => void) | null = null;
    vi.spyOn(reportApi, "runReportPreview").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreview = () =>
            resolve({
              preview: {
                reportId: 1001,
                canRun: true,
                nextRunAt: "2026-03-31T09:00:00+08:00",
                lastRunAt: "2026-03-30T17:40:00+08:00",
                message: "本次手动预览已完成，1 个渠道推送成功。"
              },
              execution: {
                id: 50009,
                reportId: 1001,
                status: "success",
                trigger: "manual",
                startedAt: "2026-03-30T17:39:58+08:00",
                endedAt: "2026-03-30T17:40:00+08:00",
                durationSeconds: 2,
                operatorName: "clickvisual"
              },
              delivery: {
                reportId: 1001,
                total: 6,
                success: 5,
                failed: 1,
                channels: [
                  {
                    channelId: 201,
                    channelTyp: "dingtalk",
                    success: 5,
                    failed: 1,
                    lastSentAt: "2026-03-30T17:40:00+08:00"
                  }
                ]
              }
            });
        })
    );

    render(
      <TimeRangeProvider>
        <ReportSchedulePage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "最近执行记录" });

    fireEvent.click(screen.getByRole("button", { name: "执行预览" }));

    expect(screen.getByRole("status")).toHaveTextContent("预览执行进行中...");
    expect(screen.getByRole("button", { name: "预览执行中..." })).toBeDisabled();

    resolvePreview?.();

    expect(await screen.findByText("预览执行完成")).toBeInTheDocument();
  });

  it("shows scheduler runtime details in the report workspace", async () => {
    render(
      <TimeRangeProvider>
        <ReportSchedulePage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "调度配置" });

    expect(screen.getByText("注册状态：已注册")).toBeInTheDocument();
    expect(
      screen.getByText("下次执行时间：2026-03-31T09:00:00+08:00")
    ).toBeInTheDocument();
    expect(screen.getByText("最近一次定时执行：成功")).toBeInTheDocument();
    expect(
      screen.getByText("最近一次定时执行时间：2026-03-30T09:00:06+08:00")
    ).toBeInTheDocument();
    expect(
      screen.getByText("最近一次触发方式 / 执行人：schedule / system")
    ).toBeInTheDocument();
  });
});
