import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimeRangeProvider } from "../src/shared/state/TimeRangeContext";
import QueryPage from "../src/domains/query/pages/QueryPage";

describe("query page", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads context, resolves table id and runs real query", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    expect(await screen.findByRole("heading", { name: "日志查询" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("tree", { name: "实例与数据库" })).toBeInTheDocument();
      expect(screen.getByRole("treeitem", { name: "生产 ClickHouse" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "数据库 default" })).toBeInTheDocument();
      expect(screen.getByLabelText("表")).toHaveValue("logs");
    });

    fireEvent.change(screen.getByPlaceholderText("输入查询语句，例如 level:error AND service:gateway"), {
      target: { value: "level:error" }
    });
    expect(await screen.findByRole("button", { name: "service" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "service:gateway" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "执行查询" }));

    expect(await screen.findByText("共 1 条结果")).toBeInTheDocument();
    expect(screen.getAllByText("timeout").length).toBeGreaterThan(0);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "level:error" }).length).toBeGreaterThan(0);
  });

  it("applies suggestion chips back into the input", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "日志查询" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "service" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "service" }));
    expect(screen.getByPlaceholderText("输入查询语句，例如 level:error AND service:gateway")).toHaveValue(
      "service"
    );
  });

  it("supports action buttons and multi-view tabs", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "日志查询" });
    fireEvent.change(screen.getByPlaceholderText("输入查询语句，例如 level:error AND service:gateway"), {
      target: { value: "level:error" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存查询" }));
    expect(screen.getByText("已保存当前查询")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "AI 优化查询" }));
    expect(screen.getByText(/当前查询已经具备基础过滤条件|已补充 service 过滤/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查询" }));
    await screen.findByText("共 1 条结果");

    fireEvent.click(screen.getByRole("button", { name: "聚合统计" }));
    expect(screen.getAllByText("ERROR").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Trace 视图" }));
    expect(screen.getAllByRole("button", { name: /trace-/i }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole("button", { name: /按 trace_id 重查|按 request_id 重查/ }).length).toBe(
      2
    );

    fireEvent.click(screen.getByRole("button", { name: "JSON 视图" }));
    expect(screen.getByText("当前选中日志")).toBeInTheDocument();
    expect(screen.getByText(/查看当前页全部 JSON/)).toBeInTheDocument();
    expect(screen.getByLabelText("日志详情")).toBeInTheDocument();
  });

  it("supports trace refine actions from the trace view", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "日志查询" });
    fireEvent.change(screen.getByPlaceholderText("输入查询语句，例如 level:error AND service:gateway"), {
      target: { value: "level:error" }
    });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));
    await screen.findByText("共 1 条结果");

    fireEvent.click(screen.getByRole("button", { name: "Trace 视图" }));
    fireEvent.click(screen.getAllByRole("button", { name: /按 trace_id 重查|按 request_id 重查/ })[0]);
    await waitFor(() => {
      const input = screen.getByPlaceholderText(
        "输入查询语句，例如 level:error AND service:gateway"
      ) as HTMLInputElement;
      expect(input.value).toMatch(/trace_id:|request_id:/);
    });
  });

  it("shows an instance/database tree and refreshes table options after selecting a database", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "GET" && url.pathname.endsWith("/api/v2/reports/instances")) {
          return {
            ok: true,
            json: async () => ({
              code: 0,
              msg: "succ",
              data: [{ id: 1, name: "生产 ClickHouse", desc: "主实例", clusters: [] }]
            })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/reports/instances/1/databases")) {
          return {
            ok: true,
            json: async () => ({
              code: 0,
              msg: "succ",
              data: [{ name: "default" }, { name: "archive" }]
            })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/reports/instances/1/databases/default/tables")) {
          return {
            ok: true,
            json: async () => ({
              code: 0,
              msg: "succ",
              data: [{ name: "logs" }]
            })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/reports/instances/1/databases/archive/tables")) {
          return {
            ok: true,
            json: async () => ({
              code: 0,
              msg: "succ",
              data: [{ name: "audit_logs" }, { name: "daily_backup" }]
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
                data: url.searchParams.get("database") === "archive" ? 9528 : 9527
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9527/analysis-fields")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: { baseFields: [], logFields: [] } })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9528/analysis-fields")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: { baseFields: [], logFields: [] } })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/complete")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: { logs: [], isNeedSort: false, sortRule: [] } })
          };
        }

        if (method === "GET" && /\/api\/v1\/tables\/95(27|28)\/(logs|charts)$/.test(url.pathname)) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: url.pathname.endsWith("/charts")
                  ? { histograms: [] }
                  : { count: 0, cost: 0, query: "", keys: [], logs: [] }
              })
          };
        }

        return {
          ok: false,
          json: async () => ({
            code: 1,
            msg: `unhandled request: ${method} ${url.pathname}`,
            data: null
          }),
          text: async () =>
            JSON.stringify({
              code: 1,
              msg: `unhandled request: ${method} ${url.pathname}`,
              data: null
            })
        };
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    expect(await screen.findByRole("heading", { name: "日志查询" })).toBeInTheDocument();
    expect(await screen.findByRole("tree", { name: "实例与数据库" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "生产 ClickHouse" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "数据库 default" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "数据库 archive" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "数据库 archive" }));

    await waitFor(() => {
      expect(screen.getByLabelText("表")).toHaveValue("audit_logs");
      expect(screen.getByRole("option", { name: "audit_logs" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "daily_backup" })).toBeInTheDocument();
    });
  });
});
