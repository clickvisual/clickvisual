import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQueryWorkspace } from "../src/domains/query/hooks/useQueryWorkspace";
import { TimeRangeProvider } from "../src/shared/state/TimeRangeContext";
import QueryLinkPage from "../src/domains/query/pages/QueryLinkPage";
import QueryPage from "../src/domains/query/pages/QueryPage";

describe("query page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/v2/query");
  });

  it("builds visual query text and validates number values by valueType", async () => {
    let workspace: ReturnType<typeof useQueryWorkspace> | null = null;

    function WorkspaceProbe() {
      const hook = useQueryWorkspace("2026-04-21T08:30", "2026-04-21T09:30");
      useEffect(() => {
        workspace = hook;
      }, [hook]);
      return null;
    }

    render(<WorkspaceProbe />);
    await waitFor(() => {
      expect(workspace?.selectedTableId).toBe(9527);
    });

    act(() => {
      workspace?.setConditions([
        { id: "cond_1", field: "service", operator: "=", value: "gateway", valueType: "string" },
        { id: "cond_2", field: "status", operator: "!=", value: 500, valueType: "number" },
        { id: "cond_3", field: "message", operator: "like", value: "%timeout%", valueType: "string" },
        { id: "cond_4", field: "container.image.name", operator: "=", value: "repo/app:tag", valueType: "string" }
      ]);
    });

    expect(workspace?.buildQueryText()).toBe(
      "service = 'gateway' AND status != 500 AND message like '%timeout%' AND `container.image.name` = 'repo/app:tag'"
    );

    act(() => {
      workspace?.setConditions([
        { id: "cond_global", field: "全局匹配", operator: "=", value: "timeout", valueType: "string" }
      ]);
    });

    expect(workspace?.buildQueryText()).toBe("_raw_log_ like '%timeout%'");

    act(() => {
      workspace?.setConditions([
        { id: "cond_4", field: "status", operator: "=", value: "abc", valueType: "number" }
      ]);
    });

    const readyWorkspace = workspace;
    expect(readyWorkspace).not.toBeNull();
    expect(() => readyWorkspace!.buildQueryText()).toThrow("字段 status 需要数字值");
  });

  it("hides operator and value type controls for global match", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("tree", { name: "实例、数据库与日志表" });
    fireEvent.click(screen.getByRole("button", { name: "新增条件" }));
    fireEvent.change(screen.getByPlaceholderText("请输入字段名"), { target: { value: "全局匹配" } });

    expect(screen.queryByRole("combobox", { name: "运算符" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "值类型" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("条件值")).toBeInTheDocument();
  });

  it("opens the add condition modal when clicking blank space in the condition area", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    const conditionRegion = await screen.findByRole("region", { name: "条件清单" });
    fireEvent.click(conditionRegion);

    expect(await screen.findByRole("dialog", { name: "新增条件" })).toBeInTheDocument();
  });

  it("does not reuse the previous condition field metadata when adding a new condition", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("tree", { name: "实例、数据库与日志表" });
    fireEvent.click(screen.getByRole("button", { name: "新增条件" }));
    fireEvent.change(screen.getByPlaceholderText("请输入字段名"), { target: { value: "全局匹配" } });
    fireEvent.change(screen.getByLabelText("条件值"), { target: { value: "213" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));

    fireEvent.click(screen.getByRole("button", { name: "新增条件" }));

    expect(await screen.findByRole("dialog", { name: "新增条件" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("请输入字段名")).toHaveValue("");
    expect(screen.getByText("未匹配字段目录，默认按 JSON 路径查询")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "运算符" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "值类型" })).toBeInTheDocument();
  });

  it("syncs visual conditions to the query URL parameter and restores them after reload", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("tree", { name: "实例、数据库与日志表" });
    fireEvent.click(screen.getByRole("button", { name: "新增条件" }));
    fireEvent.change(screen.getByPlaceholderText("请输入字段名"), { target: { value: "全局匹配" } });
    fireEvent.change(screen.getByLabelText("条件值"), { target: { value: "timeout" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBe("_raw_log_ like '%timeout%'");
    });
  });

  it("keeps disabled conditions visible but excludes them from query text and URL", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("tree", { name: "实例、数据库与日志表" });
    fireEvent.click(screen.getByRole("button", { name: "新增条件" }));
    fireEvent.change(screen.getByPlaceholderText("请输入字段名"), { target: { value: "service" } });
    fireEvent.change(screen.getByLabelText("条件值"), { target: { value: "gateway" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));

    expect(screen.getByRole("button", { name: "service / = / gateway" })).toBeInTheDocument();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBe("service = 'gateway'");
    });

    const fetchMock = vi.mocked(fetch);
    const requestsBeforeDisable = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "禁用条件 service" }));
    expect(screen.getByRole("button", { name: "service / = / gateway" })).toBeInTheDocument();
    expect(screen.getByText("已禁用条件 service")).toBeInTheDocument();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBeNull();
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(requestsBeforeDisable);
    });

    const requestsBeforeEnable = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "启用条件 service" }));
    expect(screen.getByText("已启用条件 service")).toBeInTheDocument();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBe("service = 'gateway'");
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(requestsBeforeEnable);
    });
  });

  it("restores visual conditions from the query URL parameter", async () => {
    window.history.replaceState({}, "", "/v2/query?query=service%20%3D%20%27gateway%27");

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("tree", { name: "实例、数据库与日志表" });
    expect(screen.getByRole("button", { name: "service / = / gateway" })).toBeInTheDocument();
  });

  it("maps legacy v1 query URL parameters into the v2 query workspace", async () => {
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        requests.push(`${method} ${url.pathname}${url.search} ${String(init?.body || "")}`);

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

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9528/analysis-fields")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: { baseFields: ["_raw_log_"], logFields: [] }
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/query/filters")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: [] })
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
                  cost: 1,
                  query: "_raw_log_ like '%aud%'",
                  keys: [{ field: "_raw_log_", alias: "_raw_log_" }],
                  logs: [{ _raw_log_: "aud matched" }]
                }
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9528/charts")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: { histograms: [{ count: 1, from: 1780538785, to: 1780539685, progress: "100%" }] }
              })
          };
        }

        return {
          ok: false,
          text: async () => JSON.stringify({ code: 1, msg: `unhandled ${method} ${url.pathname}`, data: null })
        };
      })
    );
    window.history.replaceState(
      {},
      "",
      "/v2/query/?end=1780539685&index=2&kw=aud&logState=0&page=3&queryType=rawLog&size=10&start=1780538785&tab=relative&tid=9528"
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    expect(await screen.findByRole("tab", { name: /app_logs/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "全局匹配 / like / aud" })).toBeInTheDocument();
    await screen.findByText("aud matched");

    const runRequest = requests.find((item) => item.includes("POST /api/v2/query/run"));
    expect(runRequest).toContain('"tid":9528');
    expect(runRequest).toContain('"st":1780538785');
    expect(runRequest).toContain('"et":1780539685');
    expect(runRequest).toContain('"page":3');
    expect(runRequest).toContain('"pageSize":10');
    expect(runRequest).toContain('"fieldKey":"_raw_log_"');
    expect(runRequest).toContain('"operator":"contains"');
    expect(runRequest).toContain('"value":"aud"');
  });

  it("ignores stale autocomplete and stale runQuery responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

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
                        tables: [{ id: 9527, did: 11, tableName: "logs", desc: "" }]
                      }
                    ]
                  }
                ]
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9527/analysis-fields")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({ code: 0, msg: "succ", data: { baseFields: ["service"], logFields: [] } })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/query/filters")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: [] })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/complete")) {
          const payload = JSON.parse(String(init?.body || "{}")) as { query?: string };
          const q = String(payload.query || "");
          await new Promise((resolve) => setTimeout(resolve, q === "service" ? 120 : 10));
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  logs: [{ suggestion: q === "service" ? "service:old" : "service:new" }],
                  isNeedSort: false,
                  sortRule: []
                }
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/logs")) {
          const q = String(url.searchParams.get("query") || "");
          await new Promise((resolve) => setTimeout(resolve, q === "old" ? 120 : 10));
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  count: 1,
                  cost: 1,
                  query: q,
                  keys: [{ field: "message", alias: "message" }],
                  logs: [{ message: q === "old" ? "old" : "new" }]
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
                  histograms: [
                    { count: 1, from: 1, to: 2, progress: "100%" },
                    { count: 0, from: 2, to: 3, progress: "100%" }
                  ]
                }
              })
          };
        }

        return {
          ok: false,
          text: async () =>
            JSON.stringify({ code: 1, msg: `unhandled request: ${method} ${url.pathname}`, data: null })
        };
      })
    );

    let workspace: ReturnType<typeof useQueryWorkspace> | null = null;
    function WorkspaceProbe() {
      const hook = useQueryWorkspace("2026-04-21T08:30", "2026-04-21T09:30");
      useEffect(() => {
        workspace = hook;
      }, [hook]);
      return null;
    }

    render(<WorkspaceProbe />);
    await waitFor(() => {
      expect(workspace?.selectedTableId).toBe(9527);
    });

    act(() => {
      workspace?.setQueryText("service");
    });
    await new Promise((resolve) => setTimeout(resolve, 260));
    act(() => {
      workspace?.setQueryText("service:");
    });
    await waitFor(() => {
      expect(workspace?.autocompleteItems).toEqual(["service:new"]);
    });

    act(() => {
      workspace?.setQueryText("old");
    });
    await waitFor(() => {
      expect(workspace?.queryText).toBe("old");
    });
    act(() => {
      void workspace?.runQuery(1);
      workspace?.setQueryText("new");
    });
    await waitFor(() => {
      expect(workspace?.queryText).toBe("new");
    });
    act(() => {
      void workspace?.runQuery(1);
    });

    await waitFor(() => {
      expect(workspace?.logs?.query).toBe("new");
      expect(workspace?.logs?.logs?.[0]?.message).toBe("new");
    });
  });

  it("renders the condition list and modal trigger instead of the raw textarea", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("tree", { name: "实例、数据库与日志表" });
    expect(screen.getByRole("heading", { name: "条件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增条件" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "编辑" })).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("输入查询语句，例如 level:error AND service:gateway")
    ).not.toBeInTheDocument();
  });

  it("adds edits and deletes visual conditions", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("tree", { name: "实例、数据库与日志表" });
    await waitFor(() => {
      expect(screen.queryByText("未匹配字段目录，默认按 JSON 路径查询")).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "新增条件" }));
    expect(await screen.findByRole("dialog", { name: "新增条件" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("请输入字段名"), { target: { value: "service" } });
    expect(screen.getAllByText("物理列").length).toBeGreaterThan(0);
    expect(screen.getAllByText("列查询").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("条件值"), { target: { value: "gateway" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));
    expect(screen.getByRole("button", { name: "service / = / gateway" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "service / = / gateway" }));
    expect(await screen.findByRole("dialog", { name: "编辑条件" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("请输入字段名"), { target: { value: "message" } });
    expect(screen.getAllByText("解析字段").length).toBeGreaterThan(0);
    expect(screen.getAllByText("JSON 路径查询").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByPlaceholderText("请输入字段名"), { target: { value: "status" } });
    fireEvent.change(screen.getByRole("combobox", { name: "值类型" }), { target: { value: "number" } });
    fireEvent.change(screen.getByRole("textbox", { name: "条件值" }), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));
    expect(screen.getByRole("button", { name: "status / = / 0" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "status / = / 0" }));
    fireEvent.click(screen.getByRole("button", { name: "删除条件" }));
    expect(screen.queryByRole("button", { name: "status / = / 0" })).not.toBeInTheDocument();
  });

  it("supports action buttons and renders query results without view switch buttons", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "日志查询" });
    expect(await screen.findByRole("tablist", { name: "日志表工作区标签" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /logs/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "新增条件" }));
    fireEvent.change(screen.getByPlaceholderText("请输入字段名"), { target: { value: "service" } });
    fireEvent.change(screen.getByLabelText("条件值"), { target: { value: "gateway" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));
    expect(screen.getByRole("button", { name: "service / = / gateway" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "日志表 app_logs" }));
    expect(await screen.findByRole("tab", { name: /app_logs/ })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "service / = / gateway" })).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("tab", { name: /^logs/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "service / = / gateway" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "保存查询" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "收藏查询" }));
    fireEvent.click(screen.getByRole("button", { name: "保存当前查询" }));
    expect(await screen.findByRole("dialog", { name: "保存查询" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("收藏名称"), { target: { value: "Gateway 错误" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByText("已保存到收藏查询")).toBeInTheDocument();
    expect(await screen.findByText("Gateway 错误")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "删除收藏 Gateway 错误" }));
    expect(await screen.findByText("已删除收藏 Gateway 错误")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "分享" }));
    expect(await screen.findByText("分享短链已复制")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "执行查询" }));
    await screen.findByText("共 1 条结果");

    expect(screen.queryByRole("button", { name: "原始日志" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "聚合统计" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Trace 视图" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "JSON 视图" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "列配置" })).toBeInTheDocument();
  });

  it("parses raw log json and renders client time in query results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

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
                        tables: [{ id: 9527, did: 11, tableName: "logs", desc: "" }]
                      }
                    ]
                  }
                ]
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9527/analysis-fields")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({ code: 0, msg: "succ", data: { baseFields: [], logFields: [] } })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/query/filters")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: [] })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/complete")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({ code: 0, msg: "succ", data: { logs: [], isNeedSort: false, sortRule: [] } })
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
                  cost: 2,
                  query: "",
                  keys: [],
                  logs: [
                    {
                      level: "[NULL]",
                      addr: "[NULL]",
                      "container.name": "svc-front-tracker",
                      _time_nanosecond_: "2026-06-02T13:57:52+08:00",
                      _raw_log_: JSON.stringify({
                        lv: "info",
                        ts: 1780312831.121323,
                        msg: "GetTableRepo",
                        "container.name": "svc-front-tracker",
                        "k8s.pod.uid": "pod-uid-9527",
                        request_length: 74,
                        nested: { ok: true }
                      })
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
                  histograms: [
                    { count: 3, from: 1780312800, to: 1780312860, progress: "100%" },
                    { count: 0, from: 1780312860, to: 1780312920, progress: "100%" }
                  ]
                }
              })
          };
        }

        return {
          ok: false,
          text: async () =>
            JSON.stringify({ code: 1, msg: `unhandled request: ${method} ${url.pathname}`, data: null })
        };
      })
    );

    const view = render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "日志查询" });
    fireEvent.click(screen.getByRole("button", { name: "执行查询" }));

    await waitFor(() => {
      expect(screen.getAllByText("info").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("GetTableRepo").length).toBeGreaterThan(0);
    expect(screen.getByText("2026/6/1 19:20:31")).toBeInTheDocument();
    expect(screen.getByText("06/01 19:20")).toBeInTheDocument();
    expect(document.querySelector(".cv-query-histogram__bar--empty")).toBeInTheDocument();
    expect(screen.queryByTitle(/：0 条$/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("日志详情")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("GetTableRepo"));
    expect(screen.getByLabelText("日志详情")).toBeInTheDocument();
    expect(screen.getByText("_time_nanosecond_")).toBeInTheDocument();
    expect(screen.getAllByText("k8s.pod.uid").length).toBeGreaterThan(0);
    expect(screen.getAllByText("pod-uid-9527").length).toBeGreaterThan(0);
    expect(screen.getByText("nested")).toBeInTheDocument();
    expect(screen.getByText("{\"ok\":true}")).toBeInTheDocument();
    expect(screen.getAllByText("msg").length).toBeGreaterThan(0);
    const podUidFieldButton = screen
      .getAllByTitle("添加条件：k8s.pod.uid = pod-uid-9527")
      .find((item) => !item.getAttribute("aria-label"));
    expect(podUidFieldButton).toBeDefined();
    fireEvent.click(podUidFieldButton!);
    expect(screen.getByRole("button", { name: "k8s.pod.uid / = / pod-uid-9527" })).toBeInTheDocument();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBe("`k8s.pod.uid` = 'pod-uid-9527'");
    });
    fireEvent.click(podUidFieldButton!);
    expect(screen.getAllByRole("button", { name: "k8s.pod.uid / = / pod-uid-9527" })).toHaveLength(1);
    expect(screen.getByText("已存在条件 k8s.pod.uid = pod-uid-9527")).toBeInTheDocument();
    expect(new URL(window.location.href).searchParams.get("query")).toBe("`k8s.pod.uid` = 'pod-uid-9527'");
    fireEvent.click(screen.getByRole("button", { name: "从 JSON 添加条件 container.name = svc-front-tracker" }));
    expect(screen.getByRole("button", { name: "container.name / = / svc-front-tracker" })).toBeInTheDocument();
    expect(new URL(window.location.href).searchParams.get("query")).toBe(
      "`k8s.pod.uid` = 'pod-uid-9527' AND `container.name` = 'svc-front-tracker'"
    );
    fireEvent.click(screen.getByRole("button", { name: "2026-06-02T13:57:52+08:00" }));
    expect(
      screen.getByRole("button", { name: "_time_nanosecond_ / >= / 2026-06-02 13:57:52" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "_time_nanosecond_ / < / 2026-06-02 13:57:53" })
    ).toBeInTheDocument();
    expect(new URL(window.location.href).searchParams.get("query")).toBe(
      "`k8s.pod.uid` = 'pod-uid-9527' AND `container.name` = 'svc-front-tracker' AND _time_nanosecond_ >= '2026-06-02 13:57:52' AND _time_nanosecond_ < '2026-06-02 13:57:53'"
    );
    expect(
      screen.getByText(
        "`k8s.pod.uid` = 'pod-uid-9527' AND `container.name` = 'svc-front-tracker' AND _time_nanosecond_ >= '2026-06-02 13:57:52' AND _time_nanosecond_ < '2026-06-02 13:57:53'"
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "从 JSON 添加条件 msg = GetTableRepo" }));
    expect(screen.getByRole("button", { name: "msg / = / GetTableRepo" })).toBeInTheDocument();
    expect(new URL(window.location.href).searchParams.get("query")).toBe(
      "`k8s.pod.uid` = 'pod-uid-9527' AND `container.name` = 'svc-front-tracker' AND _time_nanosecond_ >= '2026-06-02 13:57:52' AND _time_nanosecond_ < '2026-06-02 13:57:53' AND msg = 'GetTableRepo'"
    );
    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    const inlineJson = screen.getByText(/"_raw_log_"/).closest("pre");
    expect(inlineJson).toHaveTextContent("\"lv\": \"info\"");
    expect(inlineJson).not.toHaveTextContent("\"parsed\"");
    expect(inlineJson).not.toHaveTextContent("\"original\"");
    expect(inlineJson).not.toHaveTextContent("[NULL]");
    expect(screen.queryByText("全部 JSON")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "字段" }));
    expect(screen.getAllByText("k8s.pod.uid").length).toBeGreaterThan(0);

    expect(screen.queryByRole("columnheader", { name: "k8s.pod.uid" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "列配置" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /k8s\.pod\.uid/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^addr/ }));
    expect(screen.getByRole("columnheader", { name: "k8s.pod.uid" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "addr" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "addr" }).closest("table")).not.toHaveTextContent("[NULL]");
    expect(
      window.localStorage.getItem("clickvisual-v2-query-result-columns:anonymous:1:default:logs")
    ).toContain("k8s.pod.uid");

    view.unmount();
    window.history.replaceState({}, "", "/v2/query");
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );
    await screen.findByRole("heading", { name: "日志查询" });
    fireEvent.click(screen.getByRole("button", { name: "执行查询" }));
    expect(await screen.findByRole("columnheader", { name: "k8s.pod.uid" })).toBeInTheDocument();
  });

  it("parses level and message from _raw_log without trailing underscore", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

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
                        tables: [{ id: 9527, did: 11, tableName: "logs", desc: "" }]
                      }
                    ]
                  }
                ]
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9527/analysis-fields")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({ code: 0, msg: "succ", data: { baseFields: [], logFields: [] } })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/query/filters")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: [] })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/complete")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({ code: 0, msg: "succ", data: { logs: [], isNeedSort: false, sortRule: [] } })
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
                  cost: 2,
                  query: "",
                  keys: [],
                  logs: [
                    {
                      _raw_log: `raw: ${JSON.stringify({
                        lv: "info",
                        ts: 1780312879,
                        msg: "save measure to db"
                      })}`
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
              JSON.stringify({ code: 0, msg: "succ", data: { histograms: [] } })
          };
        }

        return {
          ok: false,
          text: async () =>
            JSON.stringify({ code: 1, msg: `unhandled request: ${method} ${url.pathname}`, data: null })
        };
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "日志查询" });
    fireEvent.click(screen.getByRole("button", { name: "执行查询" }));

    await waitFor(() => {
      expect(screen.getAllByText("info").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("save measure to db").length).toBeGreaterThan(0);
  });

  it("renders jaeger trace spans from v1 trace log results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

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
                        tables: [{ id: 9527, did: 11, tableName: "trace_logs", desc: "" }]
                      }
                    ]
                  }
                ]
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9527/analysis-fields")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({ code: 0, msg: "succ", data: { baseFields: [], logFields: [] } })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/query/filters")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: [] })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/complete")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({ code: 0, msg: "succ", data: { logs: [], isNeedSort: false, sortRule: [] } })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/logs")) {
          const rootSpan = {
            traceId: "trace-1",
            spanId: "span-root",
            operationName: "GET /api/books",
            startTime: "2026-06-02T13:57:52.000Z",
            duration: "120ms",
            process: { serviceName: "gateway", tags: [{ key: "env", vStr: "dev" }] },
            tags: [{ key: "http.method", vStr: "GET" }],
            logs: [{ timestamp: "2026-06-02T13:57:52.030Z", fields: [{ key: "event", vStr: "request" }] }]
          };
          const childSpan = {
            traceId: "trace-1",
            spanId: "span-child",
            operationName: "SELECT books",
            startTime: "2026-06-02T13:57:52.040Z",
            duration: "50ms",
            references: [{ spanId: "span-root" }],
            process: { serviceName: "mysql", tags: [] },
            tags: [{ key: "db.system", vStr: "mysql" }]
          };
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  count: 2,
                  cost: 4,
                  query: "",
                  keys: [],
                  isTrace: 1,
                  logs: [
                    { _key: "trace-1", _raw_log_: JSON.stringify(rootSpan) },
                    { _key: "trace-1", _raw_log_: JSON.stringify(childSpan) }
                  ]
                }
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/charts")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: { histograms: [] } })
          };
        }

        return {
          ok: false,
          text: async () =>
            JSON.stringify({ code: 1, msg: `unhandled request: ${method} ${url.pathname}`, data: null })
        };
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "日志查询" });
    fireEvent.click(screen.getByRole("button", { name: "执行查询" }));

    expect(await screen.findByLabelText("Trace 链路")).toBeInTheDocument();
    expect(screen.getByText("trace-1")).toBeInTheDocument();
    expect(screen.getByText(/2 spans/)).toBeInTheDocument();
    expect(screen.getByText("gateway")).toBeInTheDocument();
    expect(screen.getByText("GET /api/books")).toBeInTheDocument();
    expect(screen.getByText("mysql")).toBeInTheDocument();
    expect(screen.getByText("SELECT books")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /gateway GET \/api\/books/ }));
    expect(screen.getByText("SpanID")).toBeInTheDocument();
    expect(screen.getByText("http.method=GET")).toBeInTheDocument();
    expect(screen.getByText(/event=request/)).toBeInTheDocument();
  });

  it("runs a field anchored link query across selected log tables", async () => {
    const requests: string[] = [];
    const openSpy = vi.fn();
    window.history.replaceState({}, "", "/clickvisual/v2/query");
    vi.stubGlobal("open", openSpy);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        requests.push(`${method} ${url.pathname}${url.search}`);

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

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9527/analysis-fields")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: { baseFields: [], logFields: [] } })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/query/filters")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: [] })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/complete")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: { logs: [], isNeedSort: false, sortRule: [] } })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/charts")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: { histograms: [] } })
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
                  cost: 2,
                  query: "",
                  keys: [],
                  logs: [
                    {
                      _time_nanosecond_: "2026-06-02T13:57:52+08:00",
                      _raw_log_: JSON.stringify({ lv: "info", tid: "tid-9527", msg: "GetTableRepo" })
                    }
                  ]
                }
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9528/logs")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  count: 1,
                  cost: 3,
                  query: "",
                  keys: [],
                  logs: [
                    {
                      _time_nanosecond_: "2026-06-02T13:58:10+08:00",
                      _raw_log_: JSON.stringify({ lv: "warn", msg: "app table GetTableRepo" })
                    }
                  ]
                }
              })
          };
        }

        return {
          ok: false,
          text: async () => JSON.stringify({ code: 1, msg: `unhandled request: ${method} ${url.pathname}`, data: null })
        };
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "日志查询" });
    fireEvent.click(screen.getByRole("button", { name: "执行查询" }));
    expect(await screen.findByText("GetTableRepo")).toBeInTheDocument();

    fireEvent.click(screen.getByText("GetTableRepo"));
    expect(screen.getAllByTitle("用 msg 进行 AI 分析").length).toBeGreaterThan(0);
    expect(screen.getAllByTitle("用 tid 进行 AI 分析").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByTitle("用 msg 进行 AI 分析")[0]);

    expect(await screen.findByRole("dialog", { name: "链路查询" })).toBeInTheDocument();
    expect(screen.getByText("锚点字段")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("default.app_logs"));
    fireEvent.click(screen.getByRole("button", { name: "打开链路查询" }));

    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("/clickvisual/v2/query/link?"), "_blank");
    const openedUrl = openSpy.mock.calls[0][0] as string;
    expect(openedUrl).toContain("field=msg");
    expect(openedUrl).toContain("value=GetTableRepo");
    expect(openedUrl).toContain("window=5");
    expect(openedUrl).toContain("9527%3Adefault.logs");
    expect(openedUrl).toContain("9528%3Adefault.app_logs");
    expect(requests.some((item) => item.includes("/api/v1/tables/9528/logs"))).toBe(false);
  });

  it("loads link query results on the dedicated link page", async () => {
    const requests: string[] = [];
    let aiRequestBody = "";
    window.history.replaceState(
      {},
      "",
      "/v2/query/link?field=msg&value=GetTableRepo&time=1780383472000&window=5&tables=9527%3Adefault.logs,9528%3Adefault.app_logs"
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        requests.push(`${method} ${url.pathname}${url.search}`);

        if (method === "POST" && url.pathname.endsWith("/api/v2/ai/run")) {
          aiRequestBody = typeof init?.body === "string" ? init.body : "";
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  summary: "入口日志先出现 warn，随后当前表记录 info，建议优先检查上游调用参数。",
                  decisions: [
                    {
                      key: "evidence_1",
                      title: "关键证据",
                      description: "#1 app_logs 在锚点前出现 warn，时间早于当前表日志。"
                    }
                  ],
                  risks: [
                    {
                      code: "limited_window",
                      level: "warning",
                      message: "当前只分析前后 5 分钟日志，可能缺少更早的上下文。"
                    }
                  ],
                  suggestions: [
                    {
                      type: "next_step",
                      title: "继续排查",
                      description: "扩大时间窗口并检查 ingress 参数。"
                    }
                  ],
                  requiresUserConfirmation: false
                }
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
                  cost: 2,
                  query: "",
                  keys: [],
                  logs: [
                    {
                      _time_nanosecond_: "2026-06-02T13:58:01+08:00",
                      _raw_log_: JSON.stringify({ lv: "info", ts: 1780383500.0277479, msg: "current table GetTableRepo" })
                    }
                  ]
                }
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9528/logs")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  count: 1,
                  cost: 3,
                  query: "",
                  keys: [],
                  logs: [
                    {
                      _time_nanosecond_: "2026-06-02T13:58:10+08:00",
                      _raw_log_: JSON.stringify({ lv: "warn", ts: 1780383479.0277479, msg: "app table GetTableRepo" })
                    }
                  ]
                }
              })
          };
        }

        return {
          ok: false,
          text: async () => JSON.stringify({ code: 1, msg: `unhandled request: ${method} ${url.pathname}`, data: null })
        };
      })
    );

    render(<QueryLinkPage />);

    expect(await screen.findByLabelText("关联日志链路")).toBeInTheDocument();
    expect(screen.getByText("default.logs")).toBeInTheDocument();
    expect(screen.getByText("default.app_logs")).toBeInTheDocument();
    expect(screen.getByText("current table GetTableRepo")).toBeInTheDocument();
    expect(screen.getByText("app table GetTableRepo")).toBeInTheDocument();
    expect(screen.getByText("#1").closest(".cv-query-link-item")).toHaveTextContent("app table GetTableRepo");
    expect(screen.getByText("#2").closest(".cv-query-link-item")).toHaveTextContent("current table GetTableRepo");
    expect(screen.getAllByText("ts · event")).toHaveLength(2);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("10m")).toBeInTheDocument();
    expect(screen.getByText("#1").closest(".cv-query-link-item")).toHaveTextContent("5.1m");
    expect(requests.some((item) => item.includes("/api/v1/tables/9528/logs") && item.includes("_raw_log_+like"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }));

    expect(await screen.findByText("入口日志先出现 warn，随后当前表记录 info，建议优先检查上游调用参数。")).toBeInTheDocument();
    expect(screen.getByText("关键证据")).toBeInTheDocument();
    expect(screen.getByText("继续排查: 扩大时间窗口并检查 ingress 参数。")).toBeInTheDocument();
    expect(aiRequestBody).toContain("\"scenario\":\"query.link.analyze\"");
    expect(aiRequestBody).toContain("\"anchorField\":\"msg\"");
    expect(aiRequestBody).toContain("\"logs\"");
  });

  it("keeps link AI analysis input under the default byte limit", async () => {
    let aiRequestBody = "";
    window.history.replaceState(
      {},
      "",
      "/v2/query/link?field=hostname&value=ab-test&time=1780383472000&window=5&tables=9527%3Adefault.logs"
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "POST" && url.pathname.endsWith("/api/v2/ai/run")) {
          aiRequestBody = typeof init?.body === "string" ? init.body : "";
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  summary: "已基于抽样日志完成分析。",
                  decisions: [],
                  risks: [],
                  suggestions: [],
                  requiresUserConfirmation: false
                }
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/logs")) {
          const longText = "中文错误上下文".repeat(240);
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  count: 60,
                  cost: 2,
                  query: "",
                  keys: [],
                  logs: Array.from({ length: 60 }, (_, index) => ({
                    _time_nanosecond_: `2026-06-02T13:${String(50 + Math.floor(index / 2)).padStart(2, "0")}:00+08:00`,
                    _raw_log_: JSON.stringify({
                      lv: "warn",
                      hostname: "ab-test",
                      msg: `${index}-${longText}`,
                      stack: longText,
                      extra: longText
                    })
                  }))
                }
              })
          };
        }

        return {
          ok: false,
          text: async () => JSON.stringify({ code: 1, msg: `unhandled request: ${method} ${url.pathname}`, data: null })
        };
      })
    );

    render(<QueryLinkPage />);

    expect(await screen.findByLabelText("关联日志链路")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }));

    expect(await screen.findByText("已基于抽样日志完成分析。")).toBeInTheDocument();
    const bodyBytes = new TextEncoder().encode(aiRequestBody).length;
    expect(bodyBytes).toBeLessThan(32768);
    const parsed = JSON.parse(aiRequestBody) as { input: { logs: unknown[] } };
    expect(parsed.input.logs.length).toBeLessThan(60);
    expect(screen.getByText(/已抽样/)).toBeInTheDocument();
  });

  it("shows an instance/database tree and refreshes table options after selecting a database", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-04-21T09:30:00").getTime());
    const requestPaths: string[] = [];
    const expectedRecentStart = Math.floor(new Date("2026-04-21T09:15:00").getTime() / 1000);
    const expectedRecentEnd = Math.floor(new Date("2026-04-21T09:30:00").getTime() / 1000);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        requestPaths.push(`${method} ${url.pathname}${url.search}`);

        if (method === "GET" && url.pathname.endsWith("/api/v2/base/instances")) {
          return {
            ok: true,
            json: async () => ({
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
                      tables: [{ id: 9527, did: 11, tableName: "logs", desc: "" }]
                    },
                    {
                      id: 12,
                      iid: 1,
                      databaseName: "archive",
                      desc: "",
                      cluster: "",
                      tables: [
                        { id: 9528, did: 12, tableName: "audit_logs", desc: "" },
                        { id: 9529, did: 12, tableName: "daily_backup", desc: "" }
                      ]
                    }
                  ]
                }
              ]
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
                data: []
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

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9529/analysis-fields")) {
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

        if (method === "GET" && /\/api\/v1\/tables\/95(27|28|29)\/(logs|charts)$/.test(url.pathname)) {
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
    expect(await screen.findByRole("tree", { name: "实例、数据库与日志表" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "生产 ClickHouse" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "数据库 default" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "数据库 archive" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "数据库 archive" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "日志表 audit_logs" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "日志表 daily_backup" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "日志表 daily_backup" }));
    expect(screen.getAllByText("daily_backup").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(
        requestPaths.some(
          (item) =>
            item.includes("/api/v1/tables/9529/logs") &&
            item.includes(`st=${expectedRecentStart}`) &&
            item.includes(`et=${expectedRecentEnd}`)
        )
      ).toBe(true);
      expect(
        requestPaths.some(
          (item) =>
            item.includes("/api/v1/tables/9529/charts") &&
            item.includes(`st=${expectedRecentStart}`) &&
            item.includes(`et=${expectedRecentEnd}`)
        )
      ).toBe(true);
    });

    expect(
      requestPaths.some((item) => item.includes("/api/v2/base/instances"))
    ).toBe(true);
    expect(requestPaths.some((item) => item.includes("/api/v1/table/id"))).toBe(false);
    expect(
      requestPaths.some(
        (item) =>
          item.includes("/api/v2/query/filters") &&
          item.includes("database=archive") &&
          item.includes("table=logs")
      )
    ).toBe(false);
    nowSpy.mockRestore();
  });

  it("supports instance-level create and access actions with tree refresh", async () => {
    let treeVersion = 0;
    const requests: Array<{ method: string; path: string; body?: string }> = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        requests.push({
          method,
          path: `${url.pathname}${url.search}`,
          body: typeof init?.body === "string" ? init.body : undefined
        });

        if (method === "GET" && url.pathname.endsWith("/api/v2/base/instances")) {
          const data =
            treeVersion >= 2
              ? [
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
                        cluster: "cluster-main",
                        tables: [{ id: 9527, did: 11, tableName: "logs", desc: "" }]
                      },
                      {
                        id: 13,
                        iid: 1,
                        databaseName: "analytics",
                        desc: "",
                        cluster: "cluster-main",
                        tables: [{ id: 9530, did: 13, tableName: "app_logs", desc: "" }]
                      }
                    ]
                  }
                ]
              : treeVersion >= 1
              ? [
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
                        cluster: "cluster-main",
                        tables: [{ id: 9527, did: 11, tableName: "logs", desc: "" }]
                      },
                      {
                        id: 13,
                        iid: 1,
                        databaseName: "analytics",
                        desc: "",
                        cluster: "cluster-main",
                        tables: []
                      }
                    ]
                  }
                ]
              : [
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
                        cluster: "cluster-main",
                        tables: [{ id: 9527, did: 11, tableName: "logs", desc: "" }]
                      }
                    ]
                  }
                ];
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data
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
                data: ["default", "analytics"]
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/query/instances/1/databases/analytics/tables")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: [{ name: "app_logs" }, { name: "audit_logs" }]
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/databases")) {
          treeVersion = 1;
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: null })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v1/instances/1/tables-exist")) {
          treeVersion = 2;
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: null })
          };
        }

        if (method === "PATCH" && url.pathname.endsWith("/api/v1/databases/13")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: null })
          };
        }

        if (method === "DELETE" && url.pathname.endsWith("/api/v1/tables/9530")) {
          treeVersion = 1;
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: null })
          };
        }

        if (method === "DELETE" && url.pathname.endsWith("/api/v1/databases/13")) {
          treeVersion = 0;
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: null })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/query/filters")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: [] })
          };
        }

        if (method === "GET" && /\/api\/v2\/storage\/95(27|30)\/analysis-fields$/.test(url.pathname)) {
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

        if (method === "GET" && /\/api\/v1\/tables\/95(27|30)\/(logs|charts)$/.test(url.pathname)) {
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
          text: async () => JSON.stringify({ code: 1, msg: `unhandled request: ${method} ${url.pathname}`, data: null })
        };
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("tree", { name: "实例、数据库与日志表" });
    const instanceButton = screen.getByRole("button", { name: "生产 ClickHouse" });

    fireEvent.contextMenu(instanceButton, { clientX: 120, clientY: 80 });
    await screen.findByRole("menu", { name: "实例操作" });
    await waitFor(() => {
      expect(screen.getByRole("menu", { name: "实例操作" })).toBeInTheDocument();
    });
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "实例操作" })).not.toBeInTheDocument();
    });

    fireEvent.contextMenu(instanceButton, { clientX: 120, clientY: 80 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "新增数据库" }));
    await screen.findByRole("dialog", { name: "新增数据库" });
    fireEvent.change(screen.getByLabelText("数据库"), { target: { value: "analytics" } });
    fireEvent.change(screen.getByLabelText("Cluster"), { target: { value: "cluster-main" } });
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "analytics db" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增数据库" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "数据库 analytics" })).toBeInTheDocument();
      expect(screen.getByText("已定位到 analytics")).toBeInTheDocument();
    });

    fireEvent.contextMenu(screen.getByRole("button", { name: "数据库 analytics" }), { clientX: 140, clientY: 120 });
    expect(await screen.findByRole("menu", { name: "数据库操作" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "接入已有日志表" }));

    await screen.findByRole("dialog", { name: "接入已有日志表" });
    fireEvent.change(screen.getByLabelText("数据库"), { target: { value: "analytics" } });
    fireEvent.change(screen.getByLabelText("已有日志表"), { target: { value: "app_logs" } });
    fireEvent.change(screen.getByLabelText("时间字段"), { target: { value: "_time" } });
    fireEvent.change(screen.getByLabelText("Cluster"), { target: { value: "cluster-main" } });
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "existing table" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "接入已有日志表" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "日志表 app_logs" })).toBeInTheDocument();
      expect(screen.getByText("已接入 analytics.app_logs")).toBeInTheDocument();
    });

    fireEvent.contextMenu(screen.getByRole("button", { name: "数据库 analytics" }), { clientX: 140, clientY: 120 });
    expect(await screen.findByRole("menu", { name: "数据库操作" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "编辑数据库" }));

    await screen.findByRole("dialog", { name: "编辑数据库" });
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "edited analytics db" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "编辑数据库" })).not.toBeInTheDocument();
      expect(screen.getByText("已定位到 analytics")).toBeInTheDocument();
    });

    fireEvent.contextMenu(screen.getByRole("button", { name: "日志表 app_logs" }), { clientX: 160, clientY: 180 });
    expect(await screen.findByRole("menu", { name: "日志表操作" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "删除表" }));

    await screen.findByRole("dialog", { name: "删除表" });
    fireEvent.click(screen.getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "删除表" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "日志表 app_logs" })).not.toBeInTheDocument();
      expect(screen.getByText("已删除 app_logs")).toBeInTheDocument();
    });

    fireEvent.contextMenu(screen.getByRole("button", { name: "数据库 analytics" }), { clientX: 140, clientY: 120 });
    expect(await screen.findByRole("menu", { name: "数据库操作" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "删除数据库" }));

    await screen.findByRole("dialog", { name: "删除数据库" });
    fireEvent.click(screen.getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "删除数据库" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "数据库 analytics" })).not.toBeInTheDocument();
      expect(screen.getByText("已删除 analytics")).toBeInTheDocument();
    });

    expect(
      requests.some(
        (item) =>
          item.method === "POST" &&
          item.path.endsWith("/api/v1/instances/1/databases") &&
          item.body?.includes("\"databaseName\":\"analytics\"")
      )
    ).toBe(true);
    expect(
      requests.some(
        (item) =>
          item.method === "POST" &&
          item.path.endsWith("/api/v1/instances/1/tables-exist") &&
          item.body?.includes("\"tableName\":\"app_logs\"")
      )
    ).toBe(true);
    expect(requests.some((item) => item.method === "PATCH" && item.path.endsWith("/api/v1/databases/13"))).toBe(true);
    expect(requests.some((item) => item.method === "DELETE" && item.path.endsWith("/api/v1/tables/9530"))).toBe(true);
    expect(requests.some((item) => item.method === "DELETE" && item.path.endsWith("/api/v1/databases/13"))).toBe(true);
  });

  it("runs the first table with the recent 15 minute range on page entry", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-04-21T09:30:00").getTime());

    const requestPaths: string[] = [];
    const expectedStart = Math.floor(new Date("2026-04-21T09:15:00").getTime() / 1000);
    const expectedEnd = Math.floor(new Date("2026-04-21T09:30:00").getTime() / 1000);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        requestPaths.push(`${method} ${url.pathname}${url.search}`);

        if (method === "GET" && url.pathname.endsWith("/api/v2/base/instances")) {
          return {
            ok: true,
            json: async () => ({
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
                      tables: [{ id: 9527, did: 11, tableName: "logs", desc: "" }]
                    }
                  ]
                }
              ]
            })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9527/analysis-fields")) {
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

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/logs")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: { count: 1, cost: 10, query: "", keys: [], logs: [{ _time: "2026-04-21 14:00:00", level: "ERROR", message: "timeout" }] }
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/charts")) {
          return {
            ok: true,
            text: async () => JSON.stringify({ code: 0, msg: "succ", data: { histograms: [] } })
          };
        }

        return {
          ok: false,
          json: async () => ({ code: 1, msg: `unhandled request: ${method} ${url.pathname}`, data: null }),
          text: async () => JSON.stringify({ code: 1, msg: `unhandled request: ${method} ${url.pathname}`, data: null })
        };
      })
    );

    try {
      render(
        <TimeRangeProvider>
          <QueryPage />
        </TimeRangeProvider>
      );

      await screen.findByRole("tree", { name: "实例、数据库与日志表" });
      expect(screen.getByRole("button", { name: "时间范围 Last 15 minutes" })).toBeInTheDocument();

      await screen.findByText("共 1 条结果");

      expect(
        requestPaths.some(
          (item) =>
            item.includes("/api/v1/tables/9527/logs") &&
            item.includes(`st=${expectedStart}`) &&
            item.includes(`et=${expectedEnd}`)
        )
      ).toBe(true);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
