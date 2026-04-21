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

      if (method === "GET" && url.pathname.endsWith("/api/v1/table/id")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: 9527
            })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/base/settings/instances")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: [
                {
                  id: 101,
                  name: "核心日志实例",
                  datasource: "ch",
                  desc: "主集群日志查询入口",
                  clusters: ["cluster-main"],
                  clusterInfo: [],
                  mode: 1,
                  error: ""
                }
              ]
            })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/base/settings/alarm-channels")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: [
                {
                  id: 201,
                  name: "告警群通知",
                  key: "https://oapi.dingtalk.com/robot/send?access_token=test",
                  typ: 1,
                  uid: 1
                }
              ]
            })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/logs")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                count: 1,
                cost: 16,
                query: String(url.searchParams.get("query") || ""),
                keys: [
                  { field: "_time", alias: "时间" },
                  { field: "level", alias: "级别" },
                  { field: "message", alias: "message" },
                  { field: "trace_id", alias: "Trace ID" },
                  { field: "request_id", alias: "Request ID" }
                ],
                logs: [
                  {
                    _time: "2026-04-15 10:30:00",
                    level: "ERROR",
                    message: "timeout",
                    trace_id: "trace-9527",
                    request_id: "req-1001"
                  }
                ]
              }
            })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/charts")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                histograms: [{ count: 10, from: 1713148200, to: 1713148260, progress: "100%" }]
              }
            })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9527/analysis-fields")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                baseFields: ["service", "level"],
                logFields: ["message", "trace_id"]
              }
            })
        };
      }

      if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/complete")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                logs: [{ suggestion: "service:gateway" }, { suggestion: "level:error" }],
                isNeedSort: false,
                sortRule: []
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
