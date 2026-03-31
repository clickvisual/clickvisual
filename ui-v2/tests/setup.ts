import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { buildReportWorkspaceMock } from "../src/domains/report/mocks/reportMockData";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === "string" ? input : input.toString();
      const url = new URL(rawUrl, "http://localhost");
      const method = init?.method || "GET";

      if (method === "GET" && url.pathname.endsWith("/api/v2/reports/workspace")) {
        const reportId = Number(url.searchParams.get("reportId") || "1001");
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: buildReportWorkspaceMock(reportId)
          })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/reports/list")) {
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: buildReportWorkspaceMock().list
          })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/reports/editor")) {
        const reportId = Number(url.searchParams.get("reportId") || "1001");
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: buildReportWorkspaceMock(reportId).editor
          })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/reports/delivery")) {
        const reportId = Number(url.searchParams.get("reportId") || "1001");
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: buildReportWorkspaceMock(reportId).delivery
          })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/reports/channels")) {
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: buildReportWorkspaceMock().channels
          })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/reports/preview")) {
        const reportId = Number(url.searchParams.get("reportId") || "1001");
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: buildReportWorkspaceMock(reportId).preview
          })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/reports/executions")) {
        const reportId = Number(url.searchParams.get("reportId") || "1001");
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: buildReportWorkspaceMock(reportId).executions
          })
        };
      }

      if (method === "POST" && url.pathname.endsWith("/api/v2/reports/configs")) {
        const payload = JSON.parse(String(init?.body || "{}")) as {
          nodeId: number;
          desc: string;
          dutyUid: number;
          cron: string;
          typ: number;
          channelIds: number[];
          isRetry: number;
          retryTimes: number;
          retryInterval: number;
        };

        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: payload
          })
        };
      }

      if (method === "POST" && url.pathname.endsWith("/api/v2/reports/preview-run")) {
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
        ok: false,
        json: async () => ({
          code: 1,
          msg: `unhandled request: ${method} ${url.pathname}`,
          data: null
        })
      };
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});
