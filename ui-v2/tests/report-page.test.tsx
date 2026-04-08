import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryRouter,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
  useLocation
} from "react-router-dom";
import { buildReportWorkspaceMock, resetReportMockStore } from "../src/domains/report/mocks/reportMockData";
import ReportSchedulePage from "../src/domains/report/pages/ReportSchedulePage";
import { TimeRangeProvider } from "../src/shared/state/TimeRangeContext";
import * as reportApi from "../src/domains/report/api/report";

function renderReportPage(initialEntry = "/v2/reports") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/v2"
          element={
            <TimeRangeProvider>
              <ReportSchedulePage />
            </TimeRangeProvider>
          }
        />
        <Route
          path="/reports"
          element={
            <TimeRangeProvider>
              <ReportSchedulePage />
            </TimeRangeProvider>
          }
        />
        <Route
          path="/reports/:reportId"
          element={
            <TimeRangeProvider>
              <ReportSchedulePage />
            </TimeRangeProvider>
          }
        />
        <Route
          path="/v2/reports"
          element={
            <TimeRangeProvider>
              <ReportSchedulePage />
            </TimeRangeProvider>
          }
        />
        <Route
          path="/v2/reports/:reportId"
          element={
            <TimeRangeProvider>
              <ReportSchedulePage />
            </TimeRangeProvider>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-pathname">{location.pathname}</div>;
}

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

    renderReportPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "报表工作区加载失败：mock workspace unavailable"
    );
  });

  it("loads workspace from route report id", async () => {
    const getWorkspaceSpy = vi
      .spyOn(reportApi, "getReportWorkspace")
      .mockResolvedValue(buildReportWorkspaceMock(1002));

    const router = createMemoryRouter(
      [
        {
          path: "/v2/reports/:reportId",
          element: (
            <TimeRangeProvider>
              <ReportSchedulePage />
            </TimeRangeProvider>
          )
        }
      ],
      {
        initialEntries: ["/v2/reports/1002"]
      }
    );

    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "报表配置" });
    expect(getWorkspaceSpy).toHaveBeenCalledWith(1002);
  });

  it("keeps report route under /v2 when syncing active report", async () => {
    render(
      <MemoryRouter initialEntries={["/v2"]}>
        <Routes>
          <Route
            path="/v2"
            element={
              <>
                <TimeRangeProvider>
                  <ReportSchedulePage />
                </TimeRangeProvider>
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/v2/reports/:reportId"
            element={
              <>
                <TimeRangeProvider>
                  <ReportSchedulePage />
                </TimeRangeProvider>
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByLabelText("Cron");
    await waitFor(() =>
      expect(screen.getByTestId("location-pathname")).toHaveTextContent(
        "/v2/reports/1001"
      )
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

    renderReportPage();

    const cronInput = await screen.findByLabelText("Cron");

    fireEvent.change(cronInput, {
      target: { value: "0 */2 * * * *" }
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "保存报表调度" })
    );

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

    renderReportPage();

    await screen.findByLabelText("Cron");

    fireEvent.click(
      await screen.findByRole("button", { name: "保存报表调度" })
    );

    expect(screen.getByRole("status")).toHaveTextContent("保存调度进行中...");
    expect(screen.getByRole("button", { name: "保存中..." })).toBeDisabled();
    expect(screen.getByLabelText("Cron")).toBeDisabled();

    resolveSave?.();

    expect(await screen.findByText("保存成功")).toBeInTheDocument();
  });

  it("switches workspace details when selecting another report", async () => {
    renderReportPage();

    await screen.findByRole("heading", { name: "报表配置" });
    expect(screen.getAllByText("日报-核心指标概览 #1001").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: "切换到报表 周报-异常波动追踪" })
    );

    expect(
      (await screen.findAllByText("周报-异常波动追踪 #1002")).length
    ).toBeGreaterThan(0);
    expect(screen.getByText("DSL")).toBeInTheDocument();
    expect(screen.getByText("image")).toBeInTheDocument();
    expect(screen.getAllByText("运维钉钉群").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ops-dingtalk").length).toBeGreaterThan(0);
    expect(screen.getByText("0 0 10 * * 1")).toBeInTheDocument();
    expect(screen.getByText("已暂停")).toBeInTheDocument();
    expect(screen.getByText("未记录")).toBeInTheDocument();
    expect(screen.getByText("未知")).toBeInTheDocument();
    expect(
      screen.getByText("schedule / system")
    ).toBeInTheDocument();
  });

  it("renders report task list above report config", async () => {
    renderReportPage();

    const taskHeading = await screen.findByRole("heading", { name: "报表任务" });
    const configHeading = screen.getByRole("heading", { name: "报表配置" });

    expect(
      taskHeading.compareDocumentPosition(configHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("requires explicit confirmation before deleting a report task", async () => {
    vi.spyOn(reportApi, "getReportWorkspace").mockResolvedValue(
      buildReportWorkspaceMock()
    );
    const deleteReportSpy = vi
      .spyOn(reportApi, "deleteReport")
      .mockResolvedValue(undefined);

    renderReportPage();

    await screen.findByRole("heading", { name: "报表任务" });

    fireEvent.click(screen.getByRole("button", { name: "删除报表 日报-核心指标概览" }));

    expect(deleteReportSpy).not.toHaveBeenCalled();
    expect(
      screen.getByText("确认删除报表「日报-核心指标概览」？")
    ).toBeInTheDocument();
    expect(
      screen.getByText("删除后会一起清理该报表的调度配置和执行历史，且无法恢复。")
    ).toBeInTheDocument();
  });

  it("deletes a report after confirmation and refreshes workspace", async () => {
    const nextWorkspace = buildReportWorkspaceMock(1002);
    nextWorkspace.list = nextWorkspace.list.filter((item) => item.id !== 1001);
    vi.spyOn(reportApi, "getReportWorkspace").mockImplementation(
      async (reportId?: number) => (reportId === 1002 ? nextWorkspace : buildReportWorkspaceMock())
    );
    vi.spyOn(reportApi, "deleteReport").mockResolvedValue(undefined);

    renderReportPage();

    await screen.findByRole("heading", { name: "报表任务" });

    fireEvent.click(screen.getByRole("button", { name: "删除报表 日报-核心指标概览" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除 报表 日报-核心指标概览" }));

    await waitFor(() =>
      expect(reportApi.deleteReport).toHaveBeenCalledWith(1001)
    );
    expect(await screen.findByText("报表已删除")).toBeInTheDocument();
    expect(screen.getAllByText("周报-异常波动追踪 #1002").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "删除报表 日报-核心指标概览" })
    ).not.toBeInTheDocument();
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

    renderReportPage();

    await screen.findByRole("heading", { name: "调度配置" });

    fireEvent.click(screen.getByLabelText("运维钉钉群"));
    fireEvent.click(screen.getByRole("button", { name: "保存报表调度" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("保存报表调度失败")).toBeInTheDocument();
    expect(screen.getByText("channelIds 不能为空")).toBeInTheDocument();
  });

  it("keeps current workspace when save succeeds but refresh fails", async () => {
    vi.spyOn(reportApi, "getReportWorkspace")
      .mockResolvedValueOnce(buildReportWorkspaceMock())
      .mockResolvedValueOnce(buildReportWorkspaceMock())
      .mockRejectedValueOnce(new Error("refresh unavailable"));
    vi.spyOn(reportApi, "saveReportSchedule").mockResolvedValue({
      ...buildReportWorkspaceMock().schedule,
      cron: "0 */2 * * * *"
    });

    renderReportPage();

    const cronInput = await screen.findByLabelText("Cron");

    fireEvent.change(cronInput, {
      target: { value: "0 */2 * * * *" }
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "保存报表调度" })
    );

    expect(
      await screen.findByText("保存成功，工作区刷新失败，已保留当前内容")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("alert")
    ).toHaveTextContent("报表工作区刷新失败，已保留当前内容：refresh unavailable");
    expect(screen.getByText("0 */2 * * * *")).toBeInTheDocument();
    expect(screen.getByText("已注册")).toBeInTheDocument();
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

    renderReportPage();

    await screen.findByRole("heading", { name: "最近执行记录" });

    fireEvent.click(screen.getByRole("button", { name: "执行预览" }));

    expect(await screen.findByText("预览执行完成")).toBeInTheDocument();
    expect(screen.getByText("manual / success / clickvisual")).toBeInTheDocument();
    expect(
      screen.getByText("本次手动预览已完成，1 个渠道推送成功。")
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

    renderReportPage();

    await screen.findByRole("heading", { name: "最近执行记录" });

    fireEvent.click(screen.getByRole("button", { name: "执行预览" }));

    expect(screen.getByRole("status")).toHaveTextContent("预览执行进行中...");
    expect(screen.getByRole("button", { name: "预览执行中..." })).toBeDisabled();

    resolvePreview?.();

    expect(await screen.findByText("预览执行完成")).toBeInTheDocument();
  });

  it("shows scheduler runtime details in the report workspace", async () => {
    renderReportPage();

    await screen.findByRole("heading", { name: "调度配置" });

    expect(screen.getByText("已注册")).toBeInTheDocument();
    expect(
      screen.getAllByText("2026-03-31T09:00:00+08:00").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("成功")).toBeInTheDocument();
    expect(
      screen.getAllByText("2026-03-30T09:00:06+08:00").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("schedule / system")).toBeInTheDocument();
  });

  it("creates a report and switches to the new workspace", async () => {
    vi.spyOn(reportApi, "listReportSourceInstances").mockResolvedValue([
      {
        id: 1,
        name: "生产 ClickHouse",
        desc: "主实例"
      }
    ]);
    vi.spyOn(reportApi, "listReportSourceDatabases").mockResolvedValue([
      { name: "default" }
    ]);
    vi.spyOn(reportApi, "listReportSourceTables").mockResolvedValue([
      { name: "logs" }
    ]);
    vi.spyOn(reportApi, "listReportTableColumns").mockResolvedValue([
      { field: "event_time", type: "DateTime" },
      { field: "level", type: "String" },
      { field: "trace_id", type: "String" }
    ]);
    const createReportSpy = vi.spyOn(reportApi, "createReport").mockResolvedValue({
      reportId: 2001,
      name: "错误日志小时报",
      desc: "default.logs 最近1h，昨天同期环比",
      status: "enabled",
      queryMode: "sql",
      queryText: "WITH ...",
      templateKey: "report-builder-default",
      outputFormat: "markdown",
      dutyUid: 0,
      creatorUid: 0,
      updatedAt: "2026-03-31T18:00:00+08:00"
    });
    const getWorkspaceSpy = vi.spyOn(reportApi, "getReportWorkspace")
      .mockResolvedValueOnce(buildReportWorkspaceMock())
      .mockResolvedValueOnce({
        activeReportId: 2001,
        list: [
          ...buildReportWorkspaceMock().list,
          {
            id: 2001,
            nodeId: 2001,
            name: "错误日志小时报",
            desc: "default.logs 最近1h，昨天同期环比",
            status: "enabled",
            dutyUid: 0,
            updatedAt: "2026-03-31T18:00:00+08:00"
          }
        ],
        editor: {
          reportId: 2001,
          nodeId: 2001,
          name: "错误日志小时报",
          desc: "default.logs 最近1h，昨天同期环比",
          queryMode: "sql",
          queryText: "WITH ...",
          templateKey: "report-builder-default",
          outputFormat: "markdown",
          recipientChannelIds: []
        },
        schedule: {
          reportId: 2001,
          desc: "",
          dutyUid: 0,
          cron: "",
          typ: 0,
          args: [],
          isRetry: 0,
          retryTimes: 0,
          retryInterval: 0,
          channelIds: []
        },
        preview: {
          reportId: 2001,
          canRun: false,
          nextRunAt: "",
          lastRunAt: "",
          message: ""
        },
        executions: [],
        delivery: {
          reportId: 2001,
          total: 0,
          success: 0,
          failed: 0,
          channels: []
        },
        channels: [],
        runtime: {
          registered: false,
          paused: false,
          nextRunAt: ""
        }
      });

    renderReportPage();

    await screen.findByRole("heading", { name: "报表配置" });

    fireEvent.click(screen.getByRole("button", { name: "创建报表" }));
    await screen.findByRole("heading", { name: "创建真实报表" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "确认创建" })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole("button", { name: "确认创建" }));

    expect(await screen.findByText("报表已创建")).toBeInTheDocument();
    expect(createReportSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "错误日志小时报",
        reportId: undefined,
        builder: {
          instanceId: 1,
          database: "default",
          table: "logs",
          timeField: "event_time",
          timeRange: "1h",
          where: "level = 'error'",
          metrics: [{ key: "count", label: "总量", groupBy: "", limit: 3 }],
          blocks: [
            {
              key: "default",
              label: "默认条件块",
              where: "level = 'error'",
              metrics: [{ key: "count", label: "总量", groupBy: "", limit: 3 }]
            }
          ]
        }
      })
    );
    expect(getWorkspaceSpy).toHaveBeenLastCalledWith(2001);
  });

  it("prefers the first database that actually has tables when opening create report", async () => {
    vi.spyOn(reportApi, "getReportWorkspace").mockResolvedValue(
      buildReportWorkspaceMock()
    );
    vi.spyOn(reportApi, "listReportSourceInstances").mockResolvedValue([
      { id: 1, name: "生产 ClickHouse", desc: "主实例" }
    ]);
    vi.spyOn(reportApi, "listReportSourceDatabases").mockResolvedValue([
      { name: "default" },
      { name: "dev_log" }
    ]);
    vi.spyOn(reportApi, "listReportSourceTables").mockImplementation(
      async (_instanceId, database) =>
        database === "dev_log" ? [{ name: "app_stdout" }] : []
    );
    vi.spyOn(reportApi, "listReportTableColumns").mockResolvedValue([
      { field: "_time_second_", type: "DateTime" }
    ]);

    renderReportPage();

    await screen.findByRole("heading", { name: "报表配置" });

    fireEvent.click(screen.getByRole("button", { name: "创建报表" }));

    await screen.findByRole("heading", { name: "创建真实报表" });
    await waitFor(() =>
      expect(screen.getByLabelText("数据库")).toHaveValue("dev_log")
    );
    await waitFor(() =>
      expect(screen.getByLabelText("数据表")).toHaveValue("app_stdout")
    );
    await waitFor(() =>
      expect(screen.getByLabelText("时间字段")).toHaveValue("_time_second_")
    );
    expect(screen.getByRole("button", { name: "确认创建" })).toBeEnabled();
  });

  it("shows loading status instead of empty-table warning when switching database", async () => {
    vi.spyOn(reportApi, "getReportWorkspace").mockResolvedValue(
      buildReportWorkspaceMock()
    );
    vi.spyOn(reportApi, "listReportSourceInstances").mockResolvedValue([
      { id: 1, name: "生产 ClickHouse", desc: "主实例" }
    ]);
    vi.spyOn(reportApi, "listReportSourceDatabases").mockResolvedValue([
      { name: "dev_log" },
      { name: "default" }
    ]);
    let resolveTables: ((value: { name: string }[]) => void) | null = null;
    vi.spyOn(reportApi, "listReportSourceTables").mockImplementation(
      async (_instanceId, database) => {
        if (database === "dev_log") {
          return [{ name: "app_stdout" }];
        }
        return await new Promise((resolve) => {
          resolveTables = resolve;
        });
      }
    );
    vi.spyOn(reportApi, "listReportTableColumns").mockResolvedValue([
      { field: "time", type: "DateTime" }
    ]);

    renderReportPage();

    await screen.findByRole("heading", { name: "报表配置" });
    fireEvent.click(screen.getByRole("button", { name: "编辑报表" }));

    await screen.findByRole("heading", { name: "编辑真实报表" });
    fireEvent.change(screen.getByLabelText("数据库"), {
      target: { value: "default" }
    });

    expect(
      await screen.findByText("正在加载当前数据库的数据表...")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("当前数据库下没有可用数据表，请切换到有业务数据的库。")
    ).not.toBeInTheDocument();

    resolveTables?.([{ name: "logs" }]);

    await waitFor(() =>
      expect(screen.getByLabelText("数据表")).toHaveValue("logs")
    );
    expect(
      screen.queryByText("当前数据库下没有可用数据表，请切换到有业务数据的库。")
    ).not.toBeInTheDocument();
  });

  it("opens edit form with current builder values and saves updates", async () => {
    vi.spyOn(reportApi, "getReportWorkspace").mockResolvedValue(
      buildReportWorkspaceMock()
    );
    vi.spyOn(reportApi, "listReportSourceInstances").mockResolvedValue([
      { id: 1, name: "生产 ClickHouse", desc: "主实例" }
    ]);
    vi.spyOn(reportApi, "listReportSourceDatabases").mockResolvedValue([
      { name: "dev_log" }
    ]);
    vi.spyOn(reportApi, "listReportSourceTables").mockResolvedValue([
      { name: "app_stdout" }
    ]);
    vi.spyOn(reportApi, "listReportTableColumns").mockResolvedValue([
      { field: "time", type: "DateTime" }
    ]);
    vi.spyOn(reportApi, "createReport").mockResolvedValue({
      reportId: 1001,
      name: "日报-核心指标概览-更新",
      desc: "dev_log.app_stdout 最近1d，昨天同期环比",
      status: "enabled",
      queryMode: "sql",
      queryText: "SELECT 1",
      templateKey: "report-builder-default",
      outputFormat: "markdown",
      dutyUid: 0,
      creatorUid: 0,
      updatedAt: "2026-04-01T12:00:00+08:00",
      builder: {
        instanceId: 1,
        database: "dev_log",
        table: "app_stdout",
        timeField: "time",
        timeRange: "1d",
        where: "env = 'canary'",
        metrics: [{ key: "count", label: "总量" }]
      }
    });

    renderReportPage();

    await screen.findByRole("heading", { name: "报表配置" });

    fireEvent.click(screen.getByRole("button", { name: "编辑报表" }));

    await screen.findByRole("heading", { name: "编辑真实报表" });
    expect(screen.getByLabelText("报表名称")).toHaveValue("日报-核心指标概览");
    expect(screen.getByLabelText("数据库")).toHaveValue("dev_log");
    expect(screen.getByLabelText("数据表")).toHaveValue("app_stdout");

    fireEvent.change(screen.getByLabelText("报表名称"), {
      target: { value: "日报-核心指标概览-更新" }
    });
    fireEvent.change(screen.getByLabelText("WHERE 条件"), {
      target: { value: "env = 'canary'" }
    });
    fireEvent.click(screen.getByRole("button", { name: "确认保存" }));

    await waitFor(() =>
      expect(reportApi.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          reportId: 1001,
          name: "日报-核心指标概览-更新",
          builder: expect.objectContaining({
            database: "dev_log",
            table: "app_stdout",
            where: "env = 'canary'"
          })
        })
      )
    );
    expect(await screen.findByText("报表已更新")).toBeInTheDocument();
  });
});
