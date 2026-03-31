import { describe, expect, it } from "vitest";
import {
  getReportEditorDraft,
  getReportExecutionPreview,
  getReportScheduleConfig,
  getReportSendSummary,
  listReportChannels,
  listReportItems,
  listReportRecentExecutions
} from "../src/domains/report/api/report";

describe("report contracts and mock reader", () => {
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
});
