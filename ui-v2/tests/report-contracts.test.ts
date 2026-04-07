import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createReport,
  getReportEditorDraft,
  getReportExecutionPreview,
  getReportScheduleConfig,
  getReportSendSummary,
  getReportWorkspace,
  listReportChannels,
  listReportItems,
  listReportRecentExecutions
} from "../src/domains/report/api/report";

describe("report contracts and mock reader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns list items and aligned schedule fields", async () => {
    const list = await listReportItems();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toMatchObject({
      id: expect.any(Number),
      nodeId: expect.any(Number),
      name: expect.any(String),
      desc: expect.any(String),
      status: expect.stringMatching(/enabled|paused/),
      updatedAt: expect.any(String)
    });

    const schedule = await getReportScheduleConfig(list[0].id);
    expect(schedule).toMatchObject({
      reportId: list[0].id,
      desc: expect.any(String),
      dutyUid: expect.any(Number),
      cron: expect.any(String),
      typ: expect.any(Number),
      args: expect.arrayContaining([
        expect.objectContaining({
          key: expect.any(String),
          val: expect.any(String)
        })
      ]),
      isRetry: expect.any(Number),
      retryTimes: expect.any(Number),
      retryInterval: expect.any(Number),
      channelIds: expect.any(Array)
    });
  });

  it("returns dingtalk channel and execution/send snapshots", async () => {
    const channels = await listReportChannels();
    expect(channels.some((item) => item.typ === "dingtalk")).toBe(true);
    expect(channels[0]).toMatchObject({
      key: expect.any(String),
      name: expect.any(String),
      token: expect.any(String),
      webhook: expect.any(String)
    });

    const editor = await getReportEditorDraft(1001);
    expect(editor).toMatchObject({
      reportId: 1001,
      queryMode: expect.stringMatching(/sql|dsl/),
      queryText: expect.any(String),
      templateKey: expect.any(String),
      outputFormat: expect.stringMatching(/markdown|image|excel/),
      recipientChannelIds: expect.arrayContaining([expect.any(Number)])
    });
    expect(editor.builder?.blocks).toBeDefined();
    expect(editor.builder?.blocks?.[0]).toMatchObject({
      key: expect.any(String),
      label: expect.any(String),
      where: expect.any(String),
      metrics: expect.any(Array)
    });
    expect(editor.builder?.blocks?.[0].metrics[0]).toMatchObject({
      groupBy: expect.any(String),
      limit: expect.any(Number)
    });

    const preview = await getReportExecutionPreview(1001);
    expect(preview).toMatchObject({
      reportId: 1001,
      canRun: expect.any(Boolean)
    });

    const recent = await listReportRecentExecutions(1001);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent[0]).toMatchObject({
      reportId: 1001,
      status: expect.stringMatching(/success|failed|running|unknown/),
      trigger: expect.stringMatching(/schedule|manual/),
      operatorName: expect.any(String)
    });

    const summary = await getReportSendSummary(1001);
    expect(summary).toMatchObject({
      reportId: 1001,
      total: expect.any(Number),
      success: expect.any(Number),
      failed: expect.any(Number),
      channels: expect.arrayContaining([
        expect.objectContaining({
          channelId: expect.any(Number),
          channelTyp: "dingtalk",
          success: expect.any(Number),
          failed: expect.any(Number),
          lastSentAt: expect.any(String)
        })
      ])
    });
  });

  it("normalizes workspace schedule from nodeId to reportId", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          code: 0,
          msg: "succ",
          data: {
            activeReportId: 4,
            list: [],
            editor: {
              reportId: 4,
              nodeId: 4,
              name: "错误日志小时报",
              desc: "desc",
              queryMode: "sql",
              queryText: "SELECT 1",
              templateKey: "report-builder-default",
              outputFormat: "markdown",
              recipientChannelIds: []
            },
            schedule: {
              nodeId: 4,
              desc: "desc",
              dutyUid: 0,
              cron: "",
              typ: 0,
              channelIds: null,
              isRetry: 0,
              retryTimes: 0,
              retryInterval: 0
            },
            preview: {
              reportId: 4,
              canRun: false,
              nextRunAt: "",
              lastRunAt: "",
              message: ""
            },
            executions: [],
            delivery: {
              reportId: 4,
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
          }
        })
      }))
    );

    const workspace = await getReportWorkspace(4);
    expect(workspace.schedule.reportId).toBe(4);
    expect(workspace.schedule.channelIds).toEqual([]);
  });

  it("normalizes legacy builder into a default block and saves blocks payload", async () => {
    const legacyEditor = await getReportEditorDraft(1001);
    expect(legacyEditor.builder?.blocks).toHaveLength(1);
    expect(legacyEditor.builder?.blocks?.[0]).toMatchObject({
      key: "default",
      label: "默认条件块",
      where: "env = 'prod'"
    });

    const created = await createReport({
      name: "多条件报表",
      builder: {
        instanceId: 1,
        database: "logger",
        table: "logs",
        timeField: "event_time",
        timeRange: "1d",
        where: "",
        metrics: [],
        blocks: [
          {
            key: "error",
            label: "Error 日志",
            where: "level = 'error'",
            metrics: [{ key: "count", label: "总量" }]
          }
        ]
      }
    });

    expect(created.builder?.blocks).toHaveLength(1);
    expect(created.builder?.blocks?.[0]).toMatchObject({
      key: "error",
      label: "Error 日志",
      where: "level = 'error'"
    });
    expect(created.builder?.blocks?.[0].metrics[0]).toMatchObject({
      groupBy: "",
      limit: 3
    });
  });
});
