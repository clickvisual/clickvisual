import "@testing-library/jest-dom/vitest";
import { transferableAbortController } from "node:util";
import { afterEach, beforeEach, vi } from "vitest";
import {
  buildReportWorkspaceMock,
  reportResultMockById
} from "../src/domains/report/mocks/reportMockData";
import { buildOverviewSummaryMock } from "./fixtures/overviewSummary";

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalElementQuerySelector = Element.prototype.querySelector;
const originalElementQuerySelectorAll = Element.prototype.querySelectorAll;
const nativeController = transferableAbortController();
const nodeAbortController = nativeController.constructor as typeof AbortController;
const nodeAbortSignal = nativeController.signal.constructor as typeof AbortSignal;

function isUnsupportedBrowserPseudoSelector(error: unknown, selector: string) {
  return error instanceof DOMException && selector.includes(":autofill");
}

beforeEach(() => {
  // React Router uses Node's Request, which requires signals from the same realm.
  vi.stubGlobal("AbortController", nodeAbortController);
  vi.stubGlobal("AbortSignal", nodeAbortSignal);
  const queryFilterProfiles: Array<Record<string, unknown>> = [];
  const troubleshootSessions: Array<Record<string, unknown>> = [];
  let troubleshootSeq = 1;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: TestResizeObserver
  });
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
  window.scroll = vi.fn();
  window.scrollTo = vi.fn();
  Element.prototype.querySelector = function querySelector(selector: string) {
    try {
      return originalElementQuerySelector.call(this, selector);
    } catch (error) {
      if (isUnsupportedBrowserPseudoSelector(error, selector)) {
        return null;
      }
      throw error;
    }
  };
  Element.prototype.querySelectorAll = function querySelectorAll(selector: string) {
    try {
      return originalElementQuerySelectorAll.call(this, selector);
    } catch (error) {
      if (isUnsupportedBrowserPseudoSelector(error, selector)) {
        return document.createDocumentFragment().querySelectorAll("*");
      }
      throw error;
    }
  };
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn(async () => undefined)
    }
  });

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

      if (method === "GET" && url.pathname.endsWith("/api/v2/overview/summary")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: buildOverviewSummaryMock()
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

      if (method === "GET" && url.pathname.endsWith("/api/v2/reports/results")) {
        const reportId = Number(url.searchParams.get("reportId") || "1001");
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: reportResultMockById[reportId]
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

      if (method === "POST" && url.pathname.endsWith("/api/v2/reports/where-check")) {
        const payload = JSON.parse(String(init?.body || "{}")) as {
          where?: string;
          builder?: { database?: string; table?: string };
          windowSeconds?: number;
        };
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: "succ",
            data: {
              passed: true,
              rowCount: 12,
              windowStart: "2026-03-30 08:45:00",
              windowEnd: "2026-03-30 09:00:00",
              windowSeconds: payload.windowSeconds ?? 900,
              query: `SELECT count() AS row_count FROM \`${payload.builder?.database ?? "default"}\`.\`${payload.builder?.table ?? "logs"}\` WHERE ${payload.where || "1 = 1"}`,
              message: "试跑通过，最近 15 分钟命中 12 行。"
            }
          })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/base/instances")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: [
                {
                  id: 1,
                  instanceName: "生产 ClickHouse",
                  desc: "主实例",
                  databases: [
                    {
                      id: 11,
                      iid: 1,
                      databaseName: "default",
                      desc: "",
                      cluster: "",
                      tables: [
                        { id: 9527, did: 11, tableName: "logs", desc: "" },
                        { id: 9528, did: 11, tableName: "app_logs", desc: "" }
                      ]
                    }
                  ]
                }
              ]
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
                  id: 1,
                  name: "生产 ClickHouse",
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

      if (method === "GET" && url.pathname.endsWith("/api/v1/instances/1/databases-exist")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: ["default", "archive"]
            })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/query/instances/1/databases/default/tables")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: [{ name: "logs" }, { name: "app_logs" }]
            })
        };
      }

      if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/databases")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: null
            })
        };
      }

      if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/tables-exist")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: null
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

      const aiProviders: Array<Record<string, unknown>> = [
        {
          id: "grok",
          name: "Grok",
          kind: "openai",
          baseURL: "https://api.x.ai/v1",
          model: "grok-4",
          reasoningEffort: "low",
          enabled: true,
          keySet: true,
          keyHint: "3456"
        },
        {
          id: "claude",
          name: "Claude",
          kind: "anthropic",
          baseURL: "https://api.anthropic.com",
          model: "claude-haiku",
          reasoningEffort: "",
          enabled: false,
          keySet: true,
          keyHint: "abcd"
        }
      ];
      const aiProviderPayload = () => ({
        providers: aiProviders,
        chain: aiProviders.filter((item) => item.enabled).map((item) => item.id),
        max: 10
      });

      if (method === "GET" && url.pathname.endsWith("/api/v2/base/settings/ai/providers")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: aiProviderPayload()
            })
        };
      }

      if (method === "PUT" && url.pathname.endsWith("/api/v2/base/settings/ai/providers")) {
        const payload = JSON.parse(String(init?.body || "{}"));
        const next = Array.isArray(payload.providers) ? payload.providers : [];
        aiProviders.splice(
          0,
          aiProviders.length,
          ...next.map((item: Record<string, unknown>) => {
            const previous = aiProviders.find((provider) => provider.id === item.id);
            const apiKey = String(item.apiKey || "");
            return {
              id: String(item.id || ""),
              name: String(item.name || item.id || ""),
              kind: String(item.kind || "openai"),
              baseURL: String(item.baseURL || ""),
              model: String(item.model || ""),
              reasoningEffort: String(item.reasoningEffort || ""),
              enabled: Boolean(item.enabled),
              keySet: Boolean(apiKey) || Boolean(previous?.keySet),
              keyHint: apiKey ? apiKey.slice(-4) : String(previous?.keyHint || "")
            };
          })
        );
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: aiProviderPayload()
            })
        };
      }

      if (method === "POST" && url.pathname.endsWith("/api/v2/base/settings/ai/providers/test")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                ok: true,
                latencyMs: 320,
                reply: "OK",
                error: ""
              }
            })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/base/settings/ai")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                enabled: true,
                baseURL: "https://api.openai.com",
                model: "gpt-4o-mini",
                timeoutSeconds: 5,
                maxInputBytes: 32768,
                defaultTemperature: 0.2,
                defaultMaxTokens: 800,
                hasApiKey: true,
                apiKeyMasked: "已配置"
              }
            })
        };
      }

      if (method === "PATCH" && url.pathname.endsWith("/api/v2/base/settings/ai")) {
        const payload = JSON.parse(String(init?.body || "{}"));
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                enabled: Boolean(payload.enabled),
                baseURL: String(payload.baseURL || "https://api.openai.com"),
                model: String(payload.model || "gpt-4o-mini"),
                timeoutSeconds: Number(payload.timeoutSeconds || 5),
                maxInputBytes: Number(payload.maxInputBytes || 32768),
                defaultTemperature: Number(payload.defaultTemperature ?? 0.2),
                defaultMaxTokens: Number(payload.defaultMaxTokens || 800),
                hasApiKey: true,
                apiKeyMasked: "已配置"
              }
            })
        };
      }

      if (method === "POST" && url.pathname.endsWith("/api/v2/base/settings/ai/test")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                ok: true,
                message: "ai provider is reachable",
                model: "gpt-4o-mini"
              }
            })
        };
      }

      if (method === "GET" && /^\/api\/v1\/tables\/952(7|8)\/logs$/.test(url.pathname)) {
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

      if (method === "POST" && url.pathname.endsWith("/api/v2/query/run")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                count: 1,
                cost: 12,
                query: "SELECT * FROM `default`.`logs`",
                sql: "SELECT * FROM `default`.`logs`",
                plan: {
                  table: "`default`.`logs`",
                  plannedConditions: [],
                  warnings: [],
                  orderBy: ["_time_second_ DESC"]
                },
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

      if (method === "POST" && url.pathname.endsWith("/api/v2/query/field-stats")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                total: 10,
                items: [
                  { value: "ERROR", count: 6, percentage: 60 },
                  { value: "INFO", count: 4, percentage: 40 }
                ],
                sql: "SELECT `level`, count() FROM `default`.`logs` GROUP BY `level`",
                plan: {
                  table: "`default`.`logs`",
                  plannedConditions: [],
                  warnings: [],
                  orderBy: []
                }
              }
            })
        };
      }

      if (method === "GET" && url.pathname.endsWith("/api/v2/query/filters")) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: queryFilterProfiles
            })
        };
      }

      if (method === "POST" && url.pathname.endsWith("/api/v2/query/filters")) {
        const payload = JSON.parse(String(init?.body || "{}"));
        const profile = {
          id: queryFilterProfiles.length + 1,
          creator: "tester",
          updater: "tester",
          ctime: "2026-04-15T10:30:00+08:00",
          utime: "2026-04-15T10:30:00+08:00",
          ...payload
        };
        queryFilterProfiles.push(profile);
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: profile
            })
        };
      }

      if (method === "DELETE" && /^\/api\/v2\/query\/filters\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split("/").pop());
        const index = queryFilterProfiles.findIndex((item) => Number(item.id) === id);
        if (index >= 0) {
          queryFilterProfiles.splice(index, 1);
        }
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: { id }
            })
        };
      }

      if (method === "POST" && url.pathname.endsWith("/api/v2/base/shorturls")) {
        const payload = JSON.parse(String(init?.body || "{}")) as { originUrl?: string };
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: `http://localhost/api/share/test-code?from=${encodeURIComponent(payload.originUrl || "")}`
            })
        };
      }

      if (method === "GET" && /^\/api\/v1\/tables\/952(7|8)\/charts$/.test(url.pathname)) {
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

      if (method === "GET" && /^\/api\/v2\/storage\/952(7|8)\/analysis-fields$/.test(url.pathname)) {
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

      if (method === "GET" && url.pathname === "/api/v2/troubleshoot/sessions") {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: troubleshootSessions.map(({ messages: _messages, ...item }) => item)
            })
        };
      }

      if (method === "GET" && url.pathname === "/api/v2/troubleshoot/share/demo") {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                id: 9,
                title: "分享的超时",
                status: "idle",
                messages: [
                  { id: 1, role: "user", kind: "text", text: "gateway timeout", createdAt: 1 },
                  {
                    id: 2,
                    role: "assistant",
                    kind: "final",
                    text: "最近 15 分钟有 3 条超时。",
                    createdAt: 2,
                    link: {
                      tid: 7,
                      instanceId: 1,
                      database: "pro_log",
                      table: "ego_stdout",
                      query: "level = 'error'",
                      st: 100,
                      et: 200
                    }
                  }
                ]
              }
            })
        };
      }

      const troubleshootSessionMatch = url.pathname.match(/^\/api\/v2\/troubleshoot\/sessions\/(\d+)$/);
      if (method === "GET" && troubleshootSessionMatch) {
        const session = troubleshootSessions.find((item) => item.id === Number(troubleshootSessionMatch[1]));
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: session ? 0 : 1,
              msg: session ? "succ" : "对话不存在",
              data: session || null
            })
        };
      }

      if (method === "POST" && url.pathname === "/api/v2/troubleshoot/sessions") {
        const body = JSON.parse(String(init?.body || "{}")) as { text?: string };
        const text = body.text || "";
        if (text === "坏响应") {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: [] })
          };
        }
        const wide = text.includes("12");
        const session = {
          id: troubleshootSeq++,
          title: text.slice(0, 32),
          status: wide ? "waiting_confirm" : "idle",
          updatedAt: troubleshootSeq,
          pending: wide
            ? {
                tool: "run_query",
                summary: "将查询 pro_log.ego_stdout，时间范围 12 小时（时间范围超过 6 小时）"
              }
            : undefined,
          messages: wide
            ? [
                { id: 1, role: "user", kind: "text", text, createdAt: 1 },
                {
                  id: 2,
                  role: "tool",
                  kind: "tool",
                  tool: "run_query",
                  summary: "将查询 pro_log.ego_stdout，时间范围 12 小时（时间范围超过 6 小时）",
                  status: "waiting",
                  createdAt: 2
                }
              ]
            : [
                { id: 1, role: "user", kind: "text", text, createdAt: 1 },
                {
                  id: 2,
                  role: "tool",
                  kind: "tool",
                  tool: "list_tables",
                  summary: "找到 1 张日志表",
                  detail: '[{"database":"pro_log","table":"ego_stdout"}]',
                  status: "done",
                  createdAt: 2
                },
                {
                  id: 3,
                  role: "assistant",
                  kind: "final",
                  text: "最近 15 分钟没有匹配日志。",
                  createdAt: 3,
                  link: {
                    tid: 7,
                    instanceId: 1,
                    database: "pro_log",
                    table: "ego_stdout",
                    query: "trace_id = 'abc'",
                    st: 100,
                    et: 200
                  }
                }
              ]
        };
        troubleshootSessions.unshift(session);
        return {
          ok: true,
          text: async () => JSON.stringify({ code: 0, msg: "succ", data: session })
        };
      }

      const troubleshootConfirmMatch = url.pathname.match(/^\/api\/v2\/troubleshoot\/sessions\/(\d+)\/confirm$/);
      if (method === "POST" && troubleshootConfirmMatch) {
        const session = troubleshootSessions.find((item) => item.id === Number(troubleshootConfirmMatch[1]));
        const body = JSON.parse(String(init?.body || "{}")) as { accept?: boolean };
        if (session) {
          session.status = "idle";
          session.pending = undefined;
          const messages = Array.isArray(session.messages) ? session.messages : [];
          session.messages = body.accept
            ? [
                messages[0],
                {
                  id: 2,
                  role: "tool",
                  kind: "tool",
                  tool: "run_query",
                  summary: "查询 pro_log.ego_stdout，时间范围 12 小时，3 条",
                  status: "done",
                  createdAt: 2
                },
                {
                  id: 3,
                  role: "assistant",
                  kind: "final",
                  text: "这 12 小时里有 3 条错误。",
                  createdAt: 3,
                  link: {
                    tid: 7,
                    instanceId: 1,
                    database: "pro_log",
                    table: "ego_stdout",
                    query: "level = 'error'",
                    st: 1,
                    et: 2
                  }
                }
              ]
            : [
                ...messages,
                { id: 9, role: "tool", kind: "tool", tool: "run_query", summary: "已取消这次查询", status: "canceled", createdAt: 9 }
              ];
        }
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: session ? 0 : 1,
              msg: session ? "succ" : "对话不存在",
              data: session || null
            })
        };
      }

      const troubleshootShareMatch = url.pathname.match(/^\/api\/v2\/troubleshoot\/sessions\/(\d+)\/share$/);
      if (method === "POST" && troubleshootShareMatch) {
        return {
          ok: true,
          text: async () => JSON.stringify({ code: 0, msg: "succ", data: { token: "demo" } })
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
