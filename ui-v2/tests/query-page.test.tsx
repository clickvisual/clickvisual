import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildStructuredConditions, useQueryWorkspace } from "../src/domains/query/hooks/useQueryWorkspace";
import { TimeRangeProvider } from "../src/shared/state/TimeRangeContext";
import QueryLinkPage from "../src/domains/query/pages/QueryLinkPage";
import QueryPage, { HistogramSelectionOverlay } from "../src/domains/query/pages/QueryPage";

describe("query page", () => {
  function selectConditionField(field: string) {
    const scope =
      screen.queryByRole("dialog", { name: "Edit condition" }) ??
      screen.queryByRole("dialog", { name: "Create condition" }) ??
      document.body;
    fireEvent.click(within(scope).getByRole("combobox", { name: "Field" }));
    fireEvent.click(screen.getByRole("option", { name: new RegExp(`^${field}(\\s| ·|$)`) }));
  }

  async function waitForQueryPageReady() {
    return screen.findByRole("tablist", { name: "Log table tabs" });
  }

  async function openDatasourcePanel() {
    await waitForQueryPageReady();
    const sourceButton = screen.getByRole("button", { name: "Sources" });
    if (sourceButton.getAttribute("aria-expanded") !== "true") {
      fireEvent.click(sourceButton);
    }
    return screen.findByRole("tree", { name: "Instances, databases, and log tables" });
  }

  function openAddFilterComposer() {
    if (screen.queryByLabelText("Filter condition editor")) {
      return;
    }
    const addFilterButton = screen.getByRole("button", { name: "Add condition" });
    if (addFilterButton.getAttribute("aria-expanded") !== "true") {
      fireEvent.click(addFilterButton);
    }
  }

  function selectInlineConditionField(field: string) {
    const fieldInput = screen.getByRole("combobox", { name: "Field" });
    fireEvent.click(fieldInput);
    fireEvent.click(screen.getByRole("option", { name: new RegExp(`^${field}(\\s| ·|$)`) }));
  }

  function addInlineCondition(field: string, value: string, operator?: string) {
    openAddFilterComposer();
    selectInlineConditionField(field);
    if (operator) {
      const composer = screen.getByLabelText("Filter condition editor");
      const operatorButton = within(composer).getByRole("button", { name: /Operator:/ });
      fireEvent.click(operatorButton);
      fireEvent.click(screen.getByRole("option", { name: operator }));
    }
    fireEvent.change(screen.getByLabelText("Value"), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
  }

  function getColumnHeaderByText(text: string) {
    const header = screen.getAllByRole("columnheader").find((item) => item.textContent?.includes(text));
    expect(header).toBeTruthy();
    return header!;
  }

  function getColumnHeaderLabels() {
    return screen
      .getAllByRole("columnheader")
      .map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter(Boolean);
  }

  function getColumnHeaderMenuButton(header: HTMLElement, label: string) {
    const button = within(header)
      .getAllByRole("button")
      .find((item) => item.getAttribute("title") === label);
    expect(button).toBeTruthy();
    return button!;
  }

  function createAbortError() {
    return new DOMException("Aborted", "AbortError");
  }

  function createAbortableFetchResponse(signal?: AbortSignal | null): Promise<Response> {
    return new Promise((_, reject) => {
      if (!signal) {
        return;
      }
      if (signal.aborted) {
        reject(createAbortError());
        return;
      }
      signal.addEventListener("abort", () => reject(createAbortError()), { once: true });
    });
  }

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/v2/query");
  });

  it("guards horizontal overscroll gestures on the query document", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    expect(document.documentElement).toHaveClass("cv-query-overscroll-guard");
    expect(document.body).toHaveClass("cv-query-overscroll-guard");

    const escapingWheel = new window.WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaX: 96,
      deltaY: 2
    });
    expect(document.body.dispatchEvent(escapingWheel)).toBe(false);
    expect(escapingWheel.defaultPrevented).toBe(true);

    const scrollable = document.createElement("div");
    scrollable.style.overflowX = "auto";
    Object.defineProperty(scrollable, "clientWidth", { configurable: true, value: 100 });
    Object.defineProperty(scrollable, "scrollWidth", { configurable: true, value: 300 });
    Object.defineProperty(scrollable, "scrollLeft", { configurable: true, value: 50 });
    document.body.appendChild(scrollable);

    const consumableWheel = new window.WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaX: 96,
      deltaY: 2
    });
    expect(scrollable.dispatchEvent(consumableWheel)).toBe(true);
    expect(consumableWheel.defaultPrevented).toBe(false);
    scrollable.remove();
  });

  it("keeps the main SQL query placeholder quiet", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("`status` = 500 AND `_raw_log_` like '%timeout%'")).not.toBeInTheDocument();
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
      "`service` = 'gateway' AND `status` != 500 AND `message` like '%timeout%' AND `container.image.name` = 'repo/app:tag'"
    );

    act(() => {
      workspace?.setConditions([
        { id: "cond_global", field: "All fields", operator: "=", value: "timeout", valueType: "string" }
      ]);
    });

    expect(workspace?.buildQueryText()).toBe("`_raw_log_` like '%timeout%'");

    act(() => {
      workspace?.setConditions([
        { id: "cond_global_not", field: "All fields", operator: "not like", value: "debug", valueType: "string" }
      ]);
    });

    expect(workspace?.buildQueryText()).toBe("`_raw_log_` not like '%debug%'");

    act(() => {
      workspace?.setConditions([
        { id: "cond_global_legacy", field: "全局匹配", operator: "like", value: "legacy", valueType: "string" }
      ]);
    });

    expect(workspace?.buildQueryText()).toBe("`_raw_log_` like '%legacy%'");

    act(() => {
      workspace?.setConditions([
        { id: "cond_4", field: "status", operator: "=", value: "abc", valueType: "number" }
      ]);
    });

    const readyWorkspace = workspace;
    expect(readyWorkspace).not.toBeNull();
    expect(() => readyWorkspace!.buildQueryText()).toThrow("Field status requires a number");
  });

  it("builds indexed log fields as column conditions for structured queries", () => {
    const [condition] = buildStructuredConditions(
      [{ id: "cond_1", field: "lv", operator: "=", value: "error", valueType: "string" }],
      {
        baseFields: [],
        logFields: [{ field: "lv", orderField: "lv", typ: 0 }],
        supportsGlobalMatch: false
      }
    );

    expect(condition).toMatchObject({
      field: {
        fieldKey: "lv",
        displayName: "lv",
        source: "column",
        path: "lv",
        valueType: "string",
        isAccelerated: true,
        acceleratedCol: "lv"
      },
      operator: "=",
      value: "error"
    });
  });

  it("defaults the add filter composer to global match while keeping core controls selectable", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    openAddFilterComposer();

    const composer = screen.getByRole("group", { name: "Filter condition editor" });
    expect(composer).not.toHaveClass("cv-query-filter-composer--inline");
    expect(composer.closest(".cv-query-filter-bar")).toBeNull();
    expect(composer.closest(".cv-query-filter-composer-popover-panel")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Field" })).toHaveValue("All fields");
    expect(screen.getByRole("button", { name: "Operator: like" })).toBeInTheDocument();
    expect(screen.getByLabelText("Value")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "Field" }));
    expect(screen.getByRole("option", { name: /^All fields/ })).toBeInTheDocument();
  });

  it("deduplicates the global match option in the field picker", async () => {
    const defaultFetch = window.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        if (method === "GET" && /^\/api\/v2\/storage\/952(7|8)\/analysis-fields$/.test(url.pathname)) {
          const response = {
            code: 0,
            msg: "succ",
            data: {
              baseFields: ["All fields", "service", "level"],
              logFields: ["All fields", "message", "trace_id"]
            }
          };
          return {
            ok: true,
            json: async () => response,
            text: async () => JSON.stringify(response)
          };
        }
        return defaultFetch(input, init);
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    openAddFilterComposer();
    fireEvent.click(screen.getByRole("combobox", { name: "Field" }));

    expect(screen.getAllByRole("option", { name: "All fields" })).toHaveLength(1);
  });

  it("closes the inline field picker from outside clicks", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    openAddFilterComposer();

    fireEvent.click(screen.getByRole("combobox", { name: "Field" }));
    expect(screen.getByRole("listbox", { name: "Field suggestions" })).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByLabelText("Value"));
    await waitFor(() => {
      expect(screen.queryByRole("listbox", { name: "Field suggestions" })).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText("Filter condition editor")).toBeInTheDocument();
  });

  it("closes the inline add filter composer from outside clicks", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    openAddFilterComposer();

    expect(screen.getByLabelText("Filter condition editor")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByLabelText("SQL query"));
    await waitFor(() => {
      expect(screen.queryByLabelText("Filter condition editor")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Add condition" })).toBeInTheDocument();
  });

  it("shows a quick log library creation entry from the datasource panel", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await openDatasourcePanel();

    expect(screen.getByRole("link", { name: "Create log library" })).toHaveAttribute(
      "href",
      "/v2/query/ingestion"
    );
  });

  it("filters sources by instance, database, and table names", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await openDatasourcePanel();
    const search = screen.getByRole("searchbox", { name: "Search sources" });
    await waitFor(() => {
      expect(search).toHaveFocus();
    });

    fireEvent.change(search, { target: { value: "app" } });
    expect(screen.getByRole("button", { name: "Table app_logs" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Table logs" })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "default" } });
    expect(screen.getByRole("button", { name: "Database default" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table logs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table app_logs" })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "missing" } });
    expect(screen.getByText("No data")).toBeInTheDocument();

    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
    expect(screen.getByRole("button", { name: "Table logs" })).toBeInTheDocument();
  });

  it("keeps the full query controls available on the share page", async () => {
    window.history.replaceState({}, "", "/share?database=default&table=logs");

    render(
      <TimeRangeProvider>
        <QueryPage shareMode />
      </TimeRangeProvider>
    );

    expect(await screen.findByRole("region", { name: "Query input" })).toBeInTheDocument();
    expect(screen.queryByRole("tree", { name: "Instances, databases, and log tables" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add condition" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
  });

  it("closes query utility menus from outside clicks and Escape", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("dialog", { name: "Recent queries" })).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Recent queries" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(screen.getByRole("dialog", { name: "Saved queries" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Saved queries" })).not.toBeInTheDocument();
    });
  });

  it("filters recent queries inside the popover", async () => {
    window.localStorage.setItem(
      "clickvisual-v2-query-history",
      JSON.stringify({
        9527: ["`level` = 'ERROR'", "`service` = 'gateway'"]
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    const dialog = screen.getByRole("dialog", { name: "Recent queries" });
    const search = within(dialog).getByRole("searchbox", { name: "Search recent queries" });
    await waitFor(() => {
      expect(search).toHaveFocus();
    });

    fireEvent.change(search, { target: { value: "service" } });
    expect(within(dialog).getByText("`service` = 'gateway'")).toBeInTheDocument();
    expect(within(dialog).queryByText("`level` = 'ERROR'")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "missing" } });
    expect(within(dialog).getByText("No data")).toBeInTheDocument();

    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
    expect(within(dialog).getByText("`level` = 'ERROR'")).toBeInTheDocument();
  });

  it("opens the add filter composer from the filter bar", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    openAddFilterComposer();

    expect(screen.getByLabelText("Filter condition editor")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Field" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText("Value")).toHaveFocus();
    });
    fireEvent.keyDown(screen.getByLabelText("Value"), { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByLabelText("Filter condition editor")).not.toBeInTheDocument();
    });
  });

  it("does not reuse the previous condition field metadata when adding a new condition", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    addInlineCondition("All fields", "213");

    openAddFilterComposer();

    expect(screen.getByLabelText("Filter condition editor")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Field" })).toHaveValue("All fields");
    expect(screen.queryByText("未匹配字段目录，默认按 JSON 路径查询")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Operator: like" })).toBeInTheDocument();
    expect(screen.getByLabelText("Value")).toBeInTheDocument();
  });

  it("syncs visual conditions to the query URL parameter and restores them after reload", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    openAddFilterComposer();
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "timeout" } });
    fireEvent.keyDown(screen.getByLabelText("Value"), { key: "Enter" });

    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBe("`_raw_log_` like '%timeout%'");
    });
  });

  it("turns the generated SQL preview into manual SQL editing", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    addInlineCondition("service", "gateway");

    fireEvent.click(screen.getByRole("button", { name: "Inspect SQL" }));
    const preview = await screen.findByRole("dialog", { name: "SQL preview" });
    expect(within(preview).getByText("`service` = 'gateway'")).toBeInTheDocument();
    fireEvent.click(within(preview).getByRole("button", { name: "Use as SQL" }));

    expect(screen.getByLabelText("SQL query")).toHaveValue("`service` = 'gateway'");
    expect(screen.queryByRole("button", { name: "service = gateway" })).not.toBeInTheDocument();
  });

  it("keeps global match operators constrained and writes not like to the query URL", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    openAddFilterComposer();

    const composer = screen.getByLabelText("Filter condition editor");
    const operatorButton = within(composer).getByRole("button", { name: "Operator: like" });
    fireEvent.click(operatorButton);

    expect(screen.getByRole("option", { name: "like" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "not like" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "!=" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "not like" }));
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "error" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("button", { name: "All fields not like error" })).toBeInTheDocument();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBe("`_raw_log_` not like '%error%'");
    });
  });

  it("keeps disabled conditions visible but excludes them from query text and URL", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    addInlineCondition("service", "gateway");

    expect(screen.getByRole("button", { name: "service = gateway" })).toBeInTheDocument();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBe("`service` = 'gateway'");
    });

    const fetchMock = vi.mocked(fetch);
    const requestsBeforeDisable = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Disable condition service" }));
    expect(screen.getByRole("button", { name: "service = gateway" })).toBeInTheDocument();
    expect(screen.queryByText("Disabled condition service")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBeNull();
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(requestsBeforeDisable);
    });

    const requestsBeforeEnable = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Enable condition service" }));
    expect(screen.queryByText("Enabled condition service")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBe("`service` = 'gateway'");
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

    await waitForQueryPageReady();
    expect(screen.getByRole("button", { name: "service = gateway" })).toBeInTheDocument();
  });

  it("keeps quoted numeric-looking URL condition values as strings", async () => {
    window.history.replaceState({}, "", "/v2/query?query=%60_pod_name_%60%20%3D%20%271234%27");

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    expect(screen.getByRole("button", { name: "_pod_name_ = 1234" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Inspect SQL" }));
    const preview = await screen.findByRole("dialog", { name: "SQL preview" });
    expect(within(preview).getByText("`_pod_name_` = '1234'")).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "All fields like aud" })).toBeInTheDocument();
    await screen.findByText("aud matched");
    await waitFor(() => {
      expect(document.querySelector(".cv-query-histogram-meta__count")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(window.location.search).not.toContain("tab=relative");
    });

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

  it("restores legacy v1 kw filter expressions as structured v2 conditions", async () => {
    const defaultFetch = window.fetch;
    const runPayloads: any[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        if ((init?.method || "GET") === "POST" && url.pathname.endsWith("/api/v2/query/run")) {
          runPayloads.push(JSON.parse(String(init?.body || "{}")));
        }
        return defaultFetch(input, init);
      })
    );
    const params = new URLSearchParams({
      tid: "9527",
      start: "1788328607",
      end: "1788328787",
      kw: "`_container_name_`='svc-table' and `ucode` > '499' and `error` not like '%deadline exceeded%'"
    });
    window.history.replaceState({}, "", `/share?${params.toString()}`);

    render(
      <TimeRangeProvider>
        <QueryPage shareMode />
      </TimeRangeProvider>
    );

    await waitFor(() => {
      expect(runPayloads.length).toBeGreaterThan(0);
    });
    expect(runPayloads[0].conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ operator: "=", value: "svc-table" }),
        expect.objectContaining({ operator: ">", value: "499" }),
        expect.objectContaining({ operator: "not_contains", value: "%deadline exceeded%" })
      ])
    );
  });

  it("uses legacy v1 logs for a share link when kw is the original filter", async () => {
    const defaultFetch = window.fetch;
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        requests.push(`${init?.method || "GET"} ${url.pathname}${url.search}`);
        return defaultFetch(input, init);
      })
    );
    const params = new URLSearchParams({
      tid: "9527",
      start: "1788328607",
      end: "1788328787",
      kw: "`_container_name_`='svc-table' and `ucode` > '499'",
      query: "_raw_log_ like '%`_container_name_`=\\'svc-table\\'%' AND `addr` != '\\\\'/duplicateBase\\\\''"
    });
    window.history.replaceState({}, "", `/share?${params.toString()}`);

    render(
      <TimeRangeProvider>
        <QueryPage shareMode />
      </TimeRangeProvider>
    );

    await waitFor(() => {
      expect(requests.some((item) => item.includes("GET /api/v1/tables/9527/logs"))).toBe(true);
    });
    expect(requests.some((item) => item.includes("POST /api/v2/query/run"))).toBe(false);
    expect(requests.find((item) => item.includes("GET /api/v1/tables/9527/logs"))).toContain(
      "query=%60_container_name_%60%3D%27svc-table%27+and+%60ucode%60+%3E+%27499%27"
    );
  });

  it("recognizes the legacy v1 share shape when query is absent", async () => {
    const defaultFetch = window.fetch;
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        requests.push(`${init?.method || "GET"} ${url.pathname}${url.search}`);
        return defaultFetch(input, init);
      })
    );
    const params = new URLSearchParams({
      tid: "9527",
      start: "1788328607",
      end: "1788328787",
      kw: "`service`='gateway'",
      queryType: "rawLog",
      tab: "relative"
    });
    window.history.replaceState({}, "", `/share?${params.toString()}`);

    render(
      <TimeRangeProvider>
        <QueryPage shareMode />
      </TimeRangeProvider>
    );

    await waitFor(() => {
      expect(requests.some((item) => item.includes("GET /api/v1/tables/9527/logs"))).toBe(true);
    });
    expect(requests.some((item) => item.includes("POST /api/v2/query/run"))).toBe(false);
  });

  it("applies compact URL query conditions and last run time to top values", async () => {
    const defaultFetch = window.fetch;
    const runPayloads: any[] = [];
    const fieldStatsPayloads: any[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/run")) {
          runPayloads.push(JSON.parse(String(init?.body || "{}")));
        }
        if (method === "POST" && url.pathname.endsWith("/api/v2/query/field-stats")) {
          fieldStatsPayloads.push(JSON.parse(String(init?.body || "{}")));
        }

        return defaultFetch(input, init);
      })
    );
    window.history.replaceState(
      {},
      "",
      "/v2/query/?start=1785218880&end=1785219780&database=default&table=logs&query=%60lv%60%3D%27debug%27"
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    expect(await screen.findByRole("button", { name: "lv = debug" })).toBeInTheDocument();
    expect(await screen.findByText("timeout")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        runPayloads.some((payload) => payload.st === 1785218880 && payload.et === 1785219780)
      ).toBe(true);
    });

    const levelHeader = getColumnHeaderByText("level");
    fireEvent.click(getColumnHeaderMenuButton(levelHeader, "level"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Top values" }));

    await waitFor(() => {
      expect(fieldStatsPayloads).toHaveLength(1);
    });
    const payload = fieldStatsPayloads[0];
    expect(payload.st).toBe(1785218880);
    expect(payload.et).toBe(1785219780);
    expect(payload.conditions).toEqual([
      expect.objectContaining({
        operator: "=",
        value: "debug",
        field: expect.objectContaining({
          fieldKey: "lv"
        })
      })
    ]);
  });

  it("applies compact manual SQL query conditions to top values", async () => {
    const defaultFetch = window.fetch;
    const logRequests: string[] = [];
    const fieldStatsPayloads: any[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/logs")) {
          logRequests.push(url.search);
        }
        if (method === "POST" && url.pathname.endsWith("/api/v2/query/field-stats")) {
          fieldStatsPayloads.push(JSON.parse(String(init?.body || "{}")));
        }

        return defaultFetch(input, init);
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    await screen.findByText("timeout");

    fireEvent.change(screen.getByLabelText("SQL query"), { target: { value: "`lv`='debug'" } });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    await waitFor(() => {
      expect(logRequests.some((item) => item.includes("query=%60lv%60%3D%27debug%27"))).toBe(true);
    });

    const levelHeader = getColumnHeaderByText("level");
    fireEvent.click(getColumnHeaderMenuButton(levelHeader, "level"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Top values" }));

    await waitFor(() => {
      expect(fieldStatsPayloads).toHaveLength(1);
    });
    expect(fieldStatsPayloads[0].conditions).toEqual([
      expect.objectContaining({
        operator: "=",
        value: "debug",
        field: expect.objectContaining({
          fieldKey: "lv"
        })
      })
    ]);
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

  it("shows a cancellable loading state and aborts in-flight result queries", async () => {
    const defaultFetch = window.fetch;
    const querySignals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "GET" && /^\/api\/v1\/tables\/9527\/(logs|charts)$/.test(url.pathname)) {
          if (init?.signal) {
            querySignals.push(init.signal);
          }
          return createAbortableFetchResponse(init?.signal);
        }

        return defaultFetch(input, init);
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    await waitFor(() => {
      expect(querySignals).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel query" }));

    await waitFor(() => {
      expect(querySignals.every((signal) => signal.aborted)).toBe(true);
    });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Cancel query" })).not.toBeInTheDocument();
    });
  });

  it("marks existing result rows as refreshing while a rerun is in flight", async () => {
    const defaultFetch = window.fetch;
    const refreshSignals: AbortSignal[] = [];
    let logsRequests = 0;
    let chartsRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/logs")) {
          logsRequests += 1;
          if (logsRequests > 1) {
            if (init?.signal) {
              refreshSignals.push(init.signal);
            }
            return createAbortableFetchResponse(init?.signal);
          }
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/charts")) {
          chartsRequests += 1;
          if (chartsRequests > 1) {
            if (init?.signal) {
              refreshSignals.push(init.signal);
            }
            return createAbortableFetchResponse(init?.signal);
          }
        }

        return defaultFetch(input, init);
      })
    );

    const view = render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    expect(await screen.findByText("timeout")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByRole("status", { name: "Refreshing query results" })).toBeInTheDocument();
    expect(view.container.querySelector(".cv-query-result-table-shell--refreshing")).toBeInTheDocument();
    await waitFor(() => {
      expect(refreshSignals).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel result refresh" }));
    await waitFor(() => {
      expect(refreshSignals.every((signal) => signal.aborted)).toBe(true);
    });
    await waitFor(() => {
      expect(screen.queryByRole("status", { name: "Refreshing query results" })).not.toBeInTheDocument();
    });
  });

  it("renders the condition list and modal trigger instead of the raw textarea", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    expect(screen.getByRole("button", { name: "Add condition" })).toBeInTheDocument();
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

    await waitForQueryPageReady();
    await waitFor(() => {
      expect(screen.queryByText("未匹配字段目录，默认按 JSON 路径查询")).not.toBeInTheDocument();
    });
    addInlineCondition("service", "gateway");
    expect(screen.getByRole("button", { name: "service = gateway" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "service = gateway" }));
    const editDialog = await screen.findByRole("dialog", { name: "Edit condition" });
    expect(editDialog).toBeInTheDocument();
    expect(within(editDialog).queryByText("Type")).not.toBeInTheDocument();
    selectConditionField("message");
    expect(screen.queryByText("解析字段")).not.toBeInTheDocument();
    expect(screen.queryByText("已索引列")).not.toBeInTheDocument();
    expect(screen.queryByText("未匹配字段目录，默认按 JSON 路径查询")).not.toBeInTheDocument();
    selectConditionField("level");
    fireEvent.change(within(editDialog).getByRole("textbox", { name: "Value" }), { target: { value: "ERROR" } });
    fireEvent.click(within(editDialog).getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "level = ERROR" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "level = ERROR" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByRole("button", { name: "level = ERROR" })).not.toBeInTheDocument();
  });

  it("keeps the edit condition dialog open when selecting value text beyond the backdrop", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    addInlineCondition("service", "gateway-with-a-very-long-value-that-requires-horizontal-drag-selection");

    fireEvent.click(
      screen.getByRole("button", {
        name: "service = gateway-with-a-very-long-value-that-requires-horizontal-drag-selection"
      })
    );
    const editDialog = await screen.findByRole("dialog", { name: "Edit condition" });
    const backdrop = editDialog.parentElement;
    expect(backdrop).toBeTruthy();

    const valueInput = within(editDialog).getByRole("textbox", { name: "Value" });
    fireEvent.mouseDown(valueInput);
    fireEvent.mouseUp(backdrop!);
    fireEvent.click(backdrop!);

    expect(screen.getByRole("dialog", { name: "Edit condition" })).toBeInTheDocument();

    fireEvent.mouseDown(backdrop!);
    fireEvent.click(backdrop!);
    expect(screen.queryByRole("dialog", { name: "Edit condition" })).not.toBeInTheDocument();
  });

  it("supports action buttons and renders query results without view switch buttons", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await screen.findByRole("heading", { name: "Log query" });
    expect(await screen.findByRole("tablist", { name: "Log table tabs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "default.logs" })).toHaveAttribute("aria-selected", "true");
    addInlineCondition("service", "gateway");
    expect(screen.getByRole("button", { name: "service = gateway" })).toBeInTheDocument();
    await openDatasourcePanel();
    fireEvent.click(screen.getByRole("button", { name: "Table app_logs" }));
    expect(await screen.findByRole("tab", { name: "default.app_logs" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "service = gateway" })).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("tab", { name: "default.logs" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "service = gateway" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "保存查询" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    fireEvent.click(screen.getByRole("button", { name: "Save current query" }));
    expect(await screen.findByRole("dialog", { name: "Save query" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Query name"), { target: { value: "Gateway 错误" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Query saved")).toBeInTheDocument();
    const savedDialog = await screen.findByRole("dialog", { name: "Saved queries" });
    const savedSearch = within(savedDialog).getByRole("searchbox", { name: "Search saved queries" });
    await waitFor(() => {
      expect(savedSearch).toHaveFocus();
    });
    expect(within(savedDialog).getByText("Gateway 错误")).toBeInTheDocument();
    fireEvent.change(savedSearch, { target: { value: "Gateway" } });
    expect(within(savedDialog).getByText("Gateway 错误")).toBeInTheDocument();
    fireEvent.change(savedSearch, { target: { value: "missing" } });
    expect(within(savedDialog).getByText("No data")).toBeInTheDocument();
    fireEvent.keyDown(savedSearch, { key: "Escape" });
    expect(savedSearch).toHaveValue("");
    expect(within(savedDialog).getByText("Gateway 错误")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete saved query Gateway 错误" }));
    expect(await screen.findByText("Deleted saved query Gateway 错误")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByText("Share link copied")).toBeInTheDocument();
    const clipboardWriteText = vi.mocked(navigator.clipboard.writeText);
    const copiedShareLink = String(clipboardWriteText.mock.calls.at(-1)?.[0] ?? "");
    const sharedOriginUrl = new URL(copiedShareLink).searchParams.get("from") ?? "";
    const sharedOrigin = new URL(sharedOriginUrl);
    expect(sharedOrigin.pathname).toBe("/share");
    expect(sharedOrigin.searchParams.get("database")).toBe("default");
    expect(sharedOrigin.searchParams.get("table")).toBe("logs");
    expect(sharedOrigin.searchParams.get("tid")).toBe("9527");
    expect(sharedOrigin.searchParams.get("query")).toBe("`service` = 'gateway'");
    expect(sharedOrigin.searchParams.get("kw")).toBe("`service` = 'gateway'");
    expect(sharedOrigin.searchParams.get("start")).toMatch(/^\d+$/);
    expect(sharedOrigin.searchParams.get("end")).toMatch(/^\d+$/);
    expect(sharedOrigin.searchParams.get("startTime")).toBeNull();
    expect(sharedOrigin.searchParams.get("endTime")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect((await screen.findAllByText("1 row")).length).toBeGreaterThan(0);
    const resultSummary = document.querySelector(".cv-query-result-bar__summary");
    expect(resultSummary).toHaveTextContent("1 row");
    expect(resultSummary).not.toHaveTextContent("1 - 1");
    expect(screen.queryByLabelText("Result page controls")).not.toBeInTheDocument();
    expect(screen.queryByText("Rows per page")).not.toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "原始日志" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "聚合统计" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Trace 视图" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "JSON 视图" })).not.toBeInTheDocument();
    const fieldsButton = screen.getByRole("button", { name: "Fields" });
    expect(fieldsButton).toHaveClass("cv-query-result-action--text");
    expect(fieldsButton).toHaveTextContent("Fields");
    expect(screen.queryByRole("button", { name: "Columns" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand all" })).not.toBeInTheDocument();
  });

  it("groups fields and opens top values from the fields panel", async () => {
    const defaultFetch = window.fetch;
    const fieldStatsPayloads: any[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        if (method === "POST" && url.pathname.endsWith("/api/v2/query/field-stats")) {
          fieldStatsPayloads.push(JSON.parse(String(init?.body || "{}")));
        }
        return defaultFetch(input, init);
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("timeout")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fields" }));
    const fieldsDialog = await screen.findByRole("dialog", { name: "Fields" });
    await waitFor(() => {
      expect(within(fieldsDialog).getByRole("searchbox", { name: "Search fields" })).toHaveFocus();
    });
    expect(within(fieldsDialog).getByRole("tab", { name: "Log Fields 2" })).toHaveAttribute("aria-selected", "true");
    expect(within(fieldsDialog).getByRole("tab", { name: "Base Fields 2" })).toBeInTheDocument();
    expect(within(fieldsDialog).getByRole("tab", { name: "All Fields 6" })).toBeInTheDocument();
    expect(within(fieldsDialog).queryByRole("tab", { name: /Metadata/ })).not.toBeInTheDocument();
    expect(within(fieldsDialog).queryByText("service")).not.toBeInTheDocument();
    expect(within(fieldsDialog).getByText("trace_id")).toBeInTheDocument();
    expect(within(fieldsDialog).queryByText("request_id")).not.toBeInTheDocument();
    fireEvent.click(within(fieldsDialog).getByRole("tab", { name: "All Fields 6" }));
    expect(within(fieldsDialog).getByText("request_id")).toBeInTheDocument();

    fireEvent.click(within(fieldsDialog).getByRole("tab", { name: "Base Fields 2" }));
    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Add service column" }));
    expect(screen.getAllByRole("columnheader").some((header) => header.textContent?.includes("service"))).toBe(true);
    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Remove service column" }));
    expect(screen.getAllByRole("columnheader").some((header) => header.textContent?.includes("service"))).toBe(false);

    const search = within(fieldsDialog).getByRole("searchbox", { name: "Search fields" });
    fireEvent.change(search, { target: { value: "trace" } });
    expect(within(fieldsDialog).getByText("trace_id")).toBeInTheDocument();
    expect(within(fieldsDialog).queryByText("service")).not.toBeInTheDocument();
    expect(within(fieldsDialog).getByRole("tab", { name: "Log Fields 1" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Top values for trace_id" }));
    await waitFor(() => {
      expect(fieldStatsPayloads).toHaveLength(1);
    });
    expect(fieldStatsPayloads[0]).toEqual(
      expect.objectContaining({
        field: expect.objectContaining({
          fieldKey: "trace_id"
        })
      })
    );
    expect(await within(fieldsDialog).findByRole("region", { name: "trace_id top values" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "trace_id top values" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Fields" })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "" } });
    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Top values for message" }));
    await waitFor(() => {
      expect(fieldStatsPayloads).toHaveLength(2);
    });
    expect(fieldStatsPayloads[1]).toEqual(
      expect.objectContaining({
        field: expect.objectContaining({
          fieldKey: "message"
        })
      })
    );
    expect(await within(fieldsDialog).findByRole("region", { name: "message top values" })).toBeInTheDocument();
    expect(within(fieldsDialog).getByRole("region", { name: "trace_id top values" })).toBeInTheDocument();

    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Top values for trace_id" }));
    expect(within(fieldsDialog).queryByRole("region", { name: "trace_id top values" })).not.toBeInTheDocument();
    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Top values for trace_id" }));
    expect(within(fieldsDialog).getByRole("region", { name: "trace_id top values" })).toBeInTheDocument();
    expect(fieldStatsPayloads).toHaveLength(2);
  });

  it("disables top values for unique and time-related fields", async () => {
    const defaultFetch = window.fetch;
    const fieldStatsPayloads: any[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "GET" && url.pathname.endsWith("/api/v2/storage/9527/analysis-fields")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  baseFields: ["time", "_time_nanosecond_", "created_at", "eventTime", "service"],
                  logFields: ["ts", "event_time", "receivedAt", "timestampMillis", "message", "tid"]
                }
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/field-stats")) {
          fieldStatsPayloads.push(JSON.parse(String(init?.body || "{}")));
        }

        return defaultFetch(input, init);
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("timeout")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fields" }));
    const fieldsDialog = await screen.findByRole("dialog", { name: "Fields" });
    await within(fieldsDialog).findByText("message");

    ["ts", "event_time", "receivedAt", "timestampMillis", "tid"].forEach((field) => {
      expect(within(fieldsDialog).getByRole("button", { name: field })).toBeDisabled();
      expect(within(fieldsDialog).queryByRole("button", { name: `Top values for ${field}` })).not.toBeInTheDocument();
    });
    expect(within(fieldsDialog).getByRole("button", { name: "Top values for message" })).toBeEnabled();
    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "ts" }));
    expect(fieldStatsPayloads).toHaveLength(0);

    fireEvent.click(within(fieldsDialog).getByRole("tab", { name: /^Base Fields\b/ }));
    ["time", "_time_nanosecond_", "created_at", "eventTime"].forEach((field) => {
      expect(within(fieldsDialog).getByRole("button", { name: field })).toBeDisabled();
      expect(within(fieldsDialog).queryByRole("button", { name: `Top values for ${field}` })).not.toBeInTheDocument();
    });
    expect(within(fieldsDialog).getByRole("button", { name: "Top values for service" })).toBeEnabled();

    fireEvent.click(within(fieldsDialog).getByRole("tab", { name: /^Log Fields\b/ }));
    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Add event_time column" }));
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Fields" })).not.toBeInTheDocument();
    });

    const timeHeader = getColumnHeaderByText("time");
    fireEvent.click(getColumnHeaderMenuButton(timeHeader, "time"));
    expect(await screen.findByRole("menu", { name: "time column actions" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Add condition" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Top values" })).not.toBeInTheDocument();
    fireEvent.click(getColumnHeaderMenuButton(timeHeader, "time"));
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "time column actions" })).not.toBeInTheDocument();
    });

    const eventTimeHeader = getColumnHeaderByText("event_time");
    fireEvent.click(getColumnHeaderMenuButton(eventTimeHeader, "event_time"));
    expect(await screen.findByRole("menu", { name: "event_time column actions" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Add condition" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Top values" })).not.toBeInTheDocument();
  });

  it("shows and cancels slow top values inside the fields panel", async () => {
    const defaultFetch = window.fetch;
    const fieldStatsSignals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/field-stats")) {
          if (init?.signal) {
            fieldStatsSignals.push(init.signal);
          }
          return createAbortableFetchResponse(init?.signal);
        }

        return defaultFetch(input, init);
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("timeout")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fields" }));
    const fieldsDialog = await screen.findByRole("dialog", { name: "Fields" });
    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Top values for message" }));

    expect(await within(fieldsDialog).findByLabelText("Loading top values")).toBeInTheDocument();
    await waitFor(() => {
      expect(fieldStatsSignals).toHaveLength(1);
    });

    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Cancel message top values query" }));

    await waitFor(() => {
      expect(fieldStatsSignals[0].aborted).toBe(true);
    });
    await waitFor(() => {
      expect(within(fieldsDialog).queryByRole("region", { name: "message top values" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("dialog", { name: "Fields" })).toBeInTheDocument();
  });

  it("keeps pagination reachable at the bottom and separates bulk expand from fields", async () => {
    const defaultFetch = window.fetch;
    const requestPaths: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "GET" && url.pathname.endsWith("/api/v1/tables/9527/logs")) {
          const page = Number(url.searchParams.get("page") || "1");
          const pageSize = Number(url.searchParams.get("pageSize") || "50");
          requestPaths.push(`${method} ${url.pathname}${url.search}`);
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  count: 120,
                  cost: 8,
                  query: "",
                  keys: [],
                  logs: Array.from({ length: Math.min(pageSize, Math.max(120 - (page - 1) * pageSize, 0)) }, (_, index) => {
                    const absoluteIndex = (page - 1) * pageSize + index + 1;
                    return {
                      _time: `2026-04-15 10:${String(index).padStart(2, "0")}:00`,
                      level: absoluteIndex % 2 ? "INFO" : "ERROR",
                      message: `page-${page} row-${absoluteIndex}`,
                      tid: `trace-${absoluteIndex}`
                    };
                  })
                }
              })
          };
        }

        return defaultFetch(input, init);
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    expect(await screen.findByText("page-1 row-1")).toBeInTheDocument();

    const expandPageButton = screen.getByRole("button", { name: "Expand all" });
    expect(expandPageButton).toHaveClass("cv-query-result-action--text");
    expect(expandPageButton).toHaveTextContent("Expand all");
    expect(expandPageButton.closest(".cv-query-result-bar__page")).toBeTruthy();
    expect(expandPageButton.closest(".cv-query-result-actions")).toBeNull();
    fireEvent.click(expandPageButton);
    expect(screen.getByRole("button", { name: "Expand all" })).toHaveAttribute("aria-busy", "true");
    expect(document.querySelector(".cv-query-result-action__spinner--active")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Collapse all" })).not.toHaveAttribute("aria-busy");
    });
    expect(screen.getAllByLabelText("Log details")).toHaveLength(50);

    const toolbarRows = screen.getByLabelText("Rows per page");
    expect(toolbarRows.closest(".cv-query-result-bar__page")).toBeTruthy();
    expect(toolbarRows.closest(".cv-query-result-actions")).toBeNull();
    expect(screen.getByLabelText("Result page controls")).toBeInTheDocument();
    const footerPager = screen.getByLabelText("Result page controls footer");
    expect(footerPager.closest(".cv-query-result-footer")).toBeTruthy();
    expect(within(footerPager).getByRole("button", { name: "Previous page" })).toBeDisabled();

    fireEvent.click(within(footerPager).getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      expect(requestPaths.some((item) => item.includes("page=2") && item.includes("pageSize=50"))).toBe(true);
    });
    expect(await screen.findByText("page-2 row-51")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Result page controls footer")).getByText("2 / 3")).toBeInTheDocument();

    const pageSize200 = within(screen.getByLabelText("Rows per page")).getByText("200").closest("label");
    expect(pageSize200).toBeTruthy();
    fireEvent.click(pageSize200!);
    await waitFor(() => {
      expect(requestPaths.some((item) => item.includes("page=1") && item.includes("pageSize=200"))).toBe(true);
    });
    expect(await screen.findByText("page-1 row-120")).toBeInTheDocument();
    expect(screen.queryByLabelText("Result page controls")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Result page controls footer")).not.toBeInTheDocument();
    const singlePageRows = screen.getByLabelText("Rows per page");
    expect(singlePageRows.closest(".cv-query-result-bar__page")).toBeTruthy();
    expect(singlePageRows.closest(".cv-query-result-actions")).toBeNull();
  });

  it("keeps the sticky result header aligned while horizontally scrolling", async () => {
    const { container } = render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    const headerScroll = await waitFor(() => {
      const element = container.querySelector<HTMLDivElement>(".cv-query-result-table-header");
      expect(element).toBeTruthy();
      return element!;
    });
    const bodyScroll = container.querySelector<HTMLDivElement>(".cv-query-result-table-scroll");
    expect(bodyScroll).toBeTruthy();
    expect(container.querySelectorAll(".cv-query-result-table--body th")).toHaveLength(0);

    bodyScroll!.scrollLeft = 96;
    fireEvent.scroll(bodyScroll!);
    expect(headerScroll.scrollLeft).toBe(96);

    fireEvent.wheel(headerScroll, { deltaX: 64 });
    expect(bodyScroll!.scrollLeft).toBe(160);
    expect(headerScroll.scrollLeft).toBe(160);

    bodyScroll!.scrollLeft = 24;
    headerScroll.scrollLeft = 24;
    fireEvent.wheel(headerScroll, { deltaY: 32, shiftKey: true });
    expect(bodyScroll!.scrollLeft).toBe(56);
    expect(headerScroll.scrollLeft).toBe(56);
  });

  it("adds a top value from a result column directly as a filter", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() => {
      expect(screen.getAllByText("ERROR").length).toBeGreaterThan(0);
    });

    const tidHeader = screen
      .getAllByRole("columnheader")
      .find((header) => header.textContent?.includes("tid"));
    expect(tidHeader).toBeTruthy();
    const tidMenuButton = within(tidHeader!)
      .getAllByRole("button")
      .find((button) => button.getAttribute("title") === "tid");
    expect(tidMenuButton).toBeTruthy();
    fireEvent.click(tidMenuButton!);
    expect(await screen.findByRole("menu", { name: "tid column actions" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Top values" })).not.toBeInTheDocument();
    fireEvent.click(tidMenuButton!);
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "tid column actions" })).not.toBeInTheDocument();
    });

    const levelHeader = screen
      .getAllByRole("columnheader")
      .find((header) => header.textContent?.includes("level"));
    expect(levelHeader).toBeTruthy();
    const levelMenuButton = within(levelHeader!)
      .getAllByRole("button")
      .find((button) => button.getAttribute("title") === "level");
    expect(levelMenuButton).toBeTruthy();
    fireEvent.click(levelMenuButton!);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Top values" }));

    const dialog = await screen.findByRole("dialog", { name: "level top values" });
    expect(within(dialog).getByRole("button", { name: "Close top values" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "level top values" })).not.toBeInTheDocument();
    });

    fireEvent.click(levelMenuButton!);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Top values" }));
    const reopenedDialog = await screen.findByRole("dialog", { name: "level top values" });
    expect(within(reopenedDialog).getByText("ERROR")).not.toHaveAttribute("title");
    const clipboardWriteText = vi.mocked(navigator.clipboard.writeText);
    fireEvent.click(await within(reopenedDialog).findByRole("button", { name: "Copy level value ERROR" }));
    await waitFor(() => {
      expect(clipboardWriteText.mock.calls.at(-1)?.[0]).toBe("ERROR");
    });
    expect(screen.getByRole("dialog", { name: "level top values" })).toBeInTheDocument();
    fireEvent.click(await within(reopenedDialog).findByRole("button", { name: "Filter for level = ERROR" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "level top values" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "level = ERROR" })).toBeInTheDocument();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBe("`level` = 'ERROR'");
    });
  });

  it("cancels in-flight top values requests", async () => {
    const defaultFetch = window.fetch;
    const fieldStatsSignals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/field-stats")) {
          if (init?.signal) {
            fieldStatsSignals.push(init.signal);
          }
          return createAbortableFetchResponse(init?.signal);
        }

        return defaultFetch(input, init);
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    await waitFor(() => {
      expect(screen.getAllByText("ERROR").length).toBeGreaterThan(0);
    });

    const levelHeader = getColumnHeaderByText("level");
    fireEvent.click(getColumnHeaderMenuButton(levelHeader, "level"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Top values" }));

    const dialog = await screen.findByRole("dialog", { name: "level top values" });
    await waitFor(() => {
      expect(fieldStatsSignals).toHaveLength(1);
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel top values query" }));

    await waitFor(() => {
      expect(fieldStatsSignals[0].aborted).toBe(true);
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "level top values" })).not.toBeInTheDocument();
    });
  });

  it("moves and hides result columns from the column header menu", async () => {
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() => {
      expect(screen.getAllByText("ERROR").length).toBeGreaterThan(0);
    });

    const initialLabels = getColumnHeaderLabels();
    expect(initialLabels.findIndex((item) => item.includes("time"))).toBeLessThan(
      initialLabels.findIndex((item) => item.includes("level"))
    );

    const levelHeader = getColumnHeaderByText("level");
    expect(within(levelHeader).queryByRole("button", { name: "Hide level column" })).not.toBeInTheDocument();
    fireEvent.click(getColumnHeaderMenuButton(levelHeader, "level"));
    expect(await screen.findByRole("menuitem", { name: "Hide column" })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Move left" }));
    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Move left" })).not.toBeInTheDocument();
    });

    const movedLeftLabels = getColumnHeaderLabels();
    expect(movedLeftLabels.findIndex((item) => item.includes("level"))).toBeLessThan(
      movedLeftLabels.findIndex((item) => item.includes("time"))
    );

    const movedLevelHeader = getColumnHeaderByText("level");
    fireEvent.click(getColumnHeaderMenuButton(movedLevelHeader, "level"));
    expect(await screen.findByRole("menuitem", { name: "Move left" })).toBeDisabled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Move right" }));
    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Move right" })).not.toBeInTheDocument();
    });

    const movedRightLabels = getColumnHeaderLabels();
    expect(movedRightLabels.findIndex((item) => item.includes("time"))).toBeLessThan(
      movedRightLabels.findIndex((item) => item.includes("level"))
    );

    const messageHeader = getColumnHeaderByText("msg");
    const resizeHandle = within(messageHeader).getByRole("button", { name: "Resize msg column" });
    fireEvent.mouseDown(resizeHandle, { button: 0, clientX: 320 });
    fireEvent.mouseMove(window, { clientX: 440 });
    fireEvent.mouseUp(window);
    await waitFor(() => {
      const storedWidths = JSON.parse(
        window.localStorage.getItem("clickvisual-v2-query-result-columns:anonymous:1:default:logs:widths") ?? "{}"
      ) as Record<string, number>;
      expect(storedWidths.__message).toBe(480);
    });
    expect(document.body).not.toHaveClass("cv-query-resizing-column");
    expect(
      Array.from(document.querySelectorAll<HTMLTableColElement>("col.cv-query-result-col--message")).some(
        (column) => column.style.width === "480px"
      )
    ).toBe(true);

    fireEvent.click(getColumnHeaderMenuButton(messageHeader, "msg"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Hide column" }));
    expect(screen.getAllByRole("columnheader").some((header) => header.textContent?.includes("msg"))).toBe(false);
  });

  it("keeps the Auto interval label tied to the automatic bucket size", async () => {
    const defaultFetch = window.fetch;
    const rangeStart = 1784863980;
    const rangeEnd = rangeStart + 6 * 60;
    window.history.replaceState({}, "", `/v2/query?start=${rangeStart}&end=${rangeEnd}`);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

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
                      _time: "2026-07-24 11:35:00",
                      level: "INFO",
                      message: "auto interval sample"
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
                  histograms: Array.from({ length: 6 }, (_, index) => ({
                    count: index === 0 ? 10 : 20,
                    from: rangeStart + index * 60,
                    to: rangeStart + (index + 1) * 60,
                    progress: "100%"
                  }))
                }
              })
          };
        }

        return defaultFetch(input, init);
      })
    );

    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );

    await waitForQueryPageReady();
    const histogramIntervalButton = await screen.findByLabelText("Histogram interval");
    await waitFor(() => {
      expect(histogramIntervalButton).toHaveTextContent("Auto (1m)");
    });

    fireEvent.click(histogramIntervalButton);
    fireEvent.click(await screen.findByRole("option", { name: "10 minutes" }));
    await waitFor(() => {
      expect(histogramIntervalButton).toHaveTextContent("10 minutes");
    });

    fireEvent.click(histogramIntervalButton);
    expect(await screen.findByRole("option", { name: "Auto (1m)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "10 minutes" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("option", { name: "Auto (1m)" }));
    await waitFor(() => {
      expect(histogramIntervalButton).toHaveTextContent("Auto (1m)");
    });
  });

  it("zooms and clears a selected histogram range from keyboard and click shortcuts", () => {
    const onZoom = vi.fn();
    const onCancel = vi.fn();
    const range = {
      startIndex: 0,
      endIndex: 1,
      from: 1784863980,
      to: 1784864100,
      count: 12
    };

    const { rerender } = render(
      <HistogramSelectionOverlay
        range={range}
        style={{ left: "10%", width: "20%" }}
        onZoom={onZoom}
        onCancel={onCancel}
      />
    );

    const selectedRange = screen.getByRole("button", { name: /Selected histogram range:/ });
    fireEvent.keyDown(selectedRange, { key: "Enter" });
    fireEvent.keyDown(selectedRange, { key: " " });
    fireEvent.click(selectedRange);
    fireEvent.keyDown(selectedRange, { key: "Escape" });

    expect(onZoom).toHaveBeenCalledTimes(3);
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <HistogramSelectionOverlay
        range={range}
        style={{ left: "10%", width: "20%" }}
        disabled
        onZoom={onZoom}
        onCancel={onCancel}
      />
    );
    const disabledRange = screen.getByRole("button", { name: /Selected histogram range:/ });
    fireEvent.keyDown(disabledRange, { key: "Enter" });
    fireEvent.click(disabledRange);
    fireEvent.keyDown(disabledRange, { key: "Escape" });

    expect(onZoom).toHaveBeenCalledTimes(3);
    expect(onCancel).toHaveBeenCalledTimes(2);
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
                      code: "[NULL]",
                      method: "[NULL]",
                      comp: "[NULL]",
                      compName: "[NULL]",
                      cost: "[NULL]",
                      event: "[NULL]",
                      ip: "[NULL]",
                      name: "[NULL]",
                      peerIp: "[NULL]",
                      peerName: "[NULL]",
                      type: "[NULL]",
                      ucode: "[NULL]",
                      blank: "   ",
                      "container.name": "svc-front-tracker",
                      _time_nanosecond_: "2026-06-02T13:57:52+08:00",
                      _time_second_: "2026-06-02T13:57:52+08:00",
                      _raw_log_: JSON.stringify({
                        lv: "info",
                        ts: 1780312831.121323,
                        msg: "GetTableRepo",
                        "container.name": "svc-front-tracker",
                        "container.image.name": "registry.example.com/svc-front-tracker:e2b8425",
                        "host.ip": "172.17.9.83",
                        "host.name": "master-1",
                        "k8s.namespace.name": "default",
                        "k8s.node.ip": "172.17.9.83",
                        "k8s.node.name": "master-1",
                        "k8s.pod.name": "svc-front-tracker-6f4c9b9c8d-abcde",
                        "k8s.pod.uid": "pod-uid-9527",
                        lname: "default.log",
                        "log.file.path": "/var/log/containers/app_stdout.log",
                        time: 1780312831,
                        path: "/host/proc/meminfo",
                        request_length: 74,
                        nested: { ok: true }
                      })
                    },
                    {
                      level: "WARN",
                      addr: "[NULL]",
                      "container.name": "svc-front-tracker",
                      _time_nanosecond_: "2026-06-02T13:58:10+08:00",
                      _raw_log_: JSON.stringify({
                        lv: "warn",
                        msg: "NoTimestampInRawLog",
                        "container.name": "svc-front-tracker"
                      })
                    },
                    {
                      level: "ERROR",
                      tid: "trace-ns",
                      msg: "NanosecondStringTimestamp",
                      "container.name": "svc-front-tracker",
                      _time_nanosecond_: "1780379910000000000",
                      _raw_log_: JSON.stringify({
                        lv: "error",
                        msg: "NanosecondStringTimestamp",
                        "container.name": "svc-front-tracker"
                      })
                    },
                    {
                      "container.name": "drive-be-worker",
                      _time_nanosecond_: "2026-06-02T13:58:40+08:00",
                      _time_second_: "2026-06-02T13:58:40+08:00",
                      _raw_log_: JSON.stringify({
                        lv: "info",
                        ts: 1780312920.9174867,
                        msg: "access",
                        lname: "ego.sys",
                        comp: "component.eredis",
                        compName: "redis.db",
                        method: "del",
                        cost: 0.217,
                        req: ["del", "resync-group-lock"],
                        tid: "0af62e9181187917950810e9cc9e67c2",
                        event: "normal",
                        addr: "redis-master:6379",
                        code: 0,
                        ip: "172.17.9.83",
                        name: "drive-be",
                        peerIp: "172.17.9.84",
                        peerName: "redis-master",
                        type: "redis",
                        ucode: "OK"
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

    await screen.findByRole("heading", { name: "Log query" });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() => {
      expect(screen.getAllByText("info").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("GetTableRepo").length).toBeGreaterThan(0);
    expect(screen.getByText("2026-06-02 13:57:52")).toBeInTheDocument();
    expect(screen.getByText("2026-06-02 13:58:10")).toBeInTheDocument();
    expect(screen.getByText("2026-06-02 13:58:30")).toBeInTheDocument();
    expect(screen.queryByText("1780379910000000000")).not.toBeInTheDocument();
    const defaultResultHeaders = getColumnHeaderLabels();
    expect(defaultResultHeaders.some((header) => header.includes("container.name"))).toBe(true);
    expect(defaultResultHeaders.some((header) => header.includes("_container_name_"))).toBe(false);
    expect(document.querySelector(".echChart")).toBeInTheDocument();
    expect(screen.queryByTitle(/：0 条$/)).not.toBeInTheDocument();
    const zoomOutButton = screen.getByRole("button", { name: "Zoom out" });
    expect(zoomOutButton).toHaveClass("cv-query-histogram-action--text");
    expect(zoomOutButton).toHaveTextContent("Zoom out");
    const hideChartButton = screen.getByRole("button", { name: "Hide chart" });
    expect(hideChartButton).toHaveClass("cv-query-histogram-action--icon");
    expect(hideChartButton).toHaveTextContent("");
    fireEvent.click(hideChartButton);
    expect(screen.queryByLabelText("Log time distribution")).not.toBeInTheDocument();
    const showChartButton = screen.getByRole("button", { name: "Show chart" });
    expect(showChartButton).toHaveClass("cv-query-histogram-action--icon");
    expect(showChartButton).toHaveTextContent("");
    fireEvent.click(showChartButton);
    expect(document.querySelector(".echChart")).toBeInTheDocument();
    expect(screen.queryByLabelText("Log details")).not.toBeInTheDocument();
    const bodyScroll = view.container.querySelector<HTMLDivElement>(".cv-query-result-table-scroll");
    const headerScroll = view.container.querySelector<HTMLDivElement>(".cv-query-result-table-header");
    expect(bodyScroll).toBeTruthy();
    expect(headerScroll).toBeTruthy();
    bodyScroll!.scrollLeft = 128;
    headerScroll!.scrollLeft = 128;
    fireEvent.click(screen.getByText("GetTableRepo"));
    const logDetails = screen.getByLabelText("Log details");
    expect(logDetails).toBeInTheDocument();
    expect(logDetails).toHaveClass("cv-query-detail--fields");
    expect(within(logDetails).queryByText("2026-06-02 13:57:52")).not.toBeInTheDocument();
    expect(bodyScroll!.scrollLeft).toBe(0);
    expect(headerScroll!.scrollLeft).toBe(0);
    expect(screen.getAllByRole("columnheader").some((header) => header.textContent?.includes("request_length"))).toBe(false);
    const includeMsgButton = within(logDetails).getByRole("button", { name: "Filter for msg = GetTableRepo" });
    expect(includeMsgButton).toHaveClass("cv-query-detail__icon-button--quick");
    expect(includeMsgButton).not.toHaveClass("cv-query-detail__icon-button--secondary");
    const addRequestLengthButton = screen.getByRole("button", { name: "Add request_length column" });
    expect(addRequestLengthButton).toHaveClass("cv-query-detail__icon-button--secondary");
    fireEvent.click(addRequestLengthButton);
    expect(screen.getAllByRole("columnheader").some((header) => header.textContent?.includes("request_length"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove request_length column" }));
    expect(screen.getAllByRole("columnheader").some((header) => header.textContent?.includes("request_length"))).toBe(false);
    expect(within(logDetails).getByText("path")).toBeInTheDocument();
    expect(within(logDetails).getByText("/host/proc/meminfo")).toBeInTheDocument();
    expect(within(logDetails).queryByText("_raw_log_")).not.toBeInTheDocument();
    expect(screen.queryByText("_time_nanosecond_")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("_time_second_")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("container.image.name")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("host.ip")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("host.name")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("k8s.namespace.name")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("k8s.node.ip")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("k8s.node.name")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("k8s.pod.name")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("k8s.pod.uid")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("lname")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("log.file.path")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("ts")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("time")).not.toBeInTheDocument();
    expect(within(logDetails).queryByText("pod-uid-9527")).not.toBeInTheDocument();
    [
      "addr",
      "code",
      "method",
      "comp",
      "compName",
      "cost",
      "event",
      "ip",
      "name",
      "peerIp",
      "peerName",
      "type",
      "ucode",
      "blank"
    ].forEach((field) => {
      expect(within(logDetails).queryByText(field)).not.toBeInTheDocument();
    });
    expect(screen.getByText("nested")).toBeInTheDocument();
    expect(screen.getByText("{\"ok\":true}")).toBeInTheDocument();
    expect(screen.queryByText("ok")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1 field" }));
    expect(screen.getByText("ok")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show 15 fields" }));
    expect(within(logDetails).getByText("_raw_log_")).toBeInTheDocument();
    expect(screen.getByText("_time_nanosecond_")).toBeInTheDocument();
    expect(screen.getByText("_time_second_")).toBeInTheDocument();
    expect(screen.getByText("container.image.name")).toBeInTheDocument();
    expect(screen.getByText("host.ip")).toBeInTheDocument();
    expect(screen.getByText("host.name")).toBeInTheDocument();
    expect(screen.getByText("k8s.namespace.name")).toBeInTheDocument();
    expect(screen.getByText("k8s.node.ip")).toBeInTheDocument();
    expect(screen.getByText("k8s.node.name")).toBeInTheDocument();
    expect(screen.getByText("k8s.pod.name")).toBeInTheDocument();
    expect(screen.getAllByText("k8s.pod.uid").length).toBeGreaterThan(0);
    expect(screen.getByText("lname")).toBeInTheDocument();
    expect(screen.getByText("log.file.path")).toBeInTheDocument();
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(within(logDetails).getByText("time")).toBeInTheDocument();
    expect(screen.getAllByText("pod-uid-9527").length).toBeGreaterThan(0);
    expect(screen.getAllByText("msg").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("tab", { name: "JSON" }));
    expect(screen.getByLabelText("Log details")).toHaveClass("cv-query-detail--json");
    const inlineJson = screen.getByText(/"_raw_log_"/).closest("pre");
    expect(inlineJson).toHaveTextContent("\"lv\": \"info\"");
    expect(inlineJson).not.toHaveTextContent("\"parsed\"");
    expect(inlineJson).not.toHaveTextContent("\"original\"");
    expect(inlineJson).not.toHaveTextContent("[NULL]");
    const clipboardWriteText = vi.mocked(navigator.clipboard.writeText);
    fireEvent.click(within(logDetails).getByRole("button", { name: "Copy log" }));
    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalled();
    });
    const copiedLogJson = String(clipboardWriteText.mock.calls.at(-1)?.[0] ?? "");
    expect(copiedLogJson).toContain("\"_raw_log_\"");
    expect(copiedLogJson).toContain("\"GetTableRepo\"");
    expect(copiedLogJson).not.toContain("\"parsed\"");
    expect(copiedLogJson).not.toContain("\"original\"");
    expect(copiedLogJson).not.toContain("[NULL]");
    expect(screen.queryByText("全部 JSON")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Fields" }));
    expect(screen.getByLabelText("Log details")).toHaveClass("cv-query-detail--fields");
    expect(screen.getAllByText("k8s.pod.uid").length).toBeGreaterThan(0);
    fireEvent.click(within(logDetails).getByRole("button", { name: "Copy k8s.pod.uid value" }));
    await waitFor(() => {
      expect(clipboardWriteText.mock.calls.at(-1)?.[0]).toBe("pod-uid-9527");
    });
    fireEvent.click(screen.getByText("access"));
    const accessLogDetails = screen.getAllByLabelText("Log details").at(-1)!;
    expect(accessLogDetails).toHaveClass("cv-query-detail--fields");
    [
      "tid",
      "method",
      "addr",
      "comp",
      "compName",
      "cost",
      "event",
      "code",
      "ip",
      "name",
      "peerIp",
      "peerName",
      "type",
      "ucode"
    ].forEach((field) => {
      expect(within(accessLogDetails).getByText(field)).toBeInTheDocument();
    });
    expect(within(accessLogDetails).getByText("del")).toBeInTheDocument();
    expect(within(accessLogDetails).getByText("component.eredis")).toBeInTheDocument();
    expect(within(accessLogDetails).queryByText("lname")).not.toBeInTheDocument();

    expect(screen.queryByRole("columnheader", { name: "k8s.pod.uid" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fields" }));
    const fieldsDialog = screen.getByRole("dialog", { name: "Fields" });
    await waitFor(() => {
      expect(within(fieldsDialog).getByRole("searchbox", { name: "Search fields" })).toHaveFocus();
    });
    const fieldsSearch = within(fieldsDialog).getByRole("searchbox", { name: "Search fields" });
    fireEvent.change(fieldsSearch, { target: { value: "k8s" } });
    fireEvent.keyDown(fieldsSearch, { key: "Escape" });
    expect(fieldsSearch).toHaveValue("");
    expect(screen.getByRole("dialog", { name: "Fields" })).toBeInTheDocument();
    fireEvent.change(fieldsSearch, { target: { value: "k8s.pod.uid" } });
    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Add k8s.pod.uid column" }));
    expect(screen.getByRole("dialog", { name: "Fields" })).toBeInTheDocument();
    fireEvent.change(fieldsSearch, { target: { value: "addr" } });
    fireEvent.click(within(fieldsDialog).getByRole("button", { name: "Add addr column" }));
    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders.some((header) => header.textContent?.includes("k8s.pod.uid"))).toBe(true);
    const addrHeader = columnHeaders.find((header) => header.textContent?.includes("addr"));
    expect(addrHeader).toBeTruthy();
    expect(addrHeader?.closest("table")).not.toHaveTextContent("[NULL]");
    expect(
      window.localStorage.getItem("clickvisual-v2-query-result-columns:anonymous:1:default:logs")
    ).toContain("k8s.pod.uid");
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Fields" })).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Fields" }));
    expect(screen.getByRole("dialog", { name: "Fields" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Fields" })).not.toBeInTheDocument();
    });
    const podUidFieldButton = screen.getByRole("button", { name: "Filter for k8s.pod.uid = pod-uid-9527" });
    fireEvent.click(podUidFieldButton);
    expect(screen.getByRole("button", { name: "k8s.pod.uid = pod-uid-9527" })).toBeInTheDocument();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("query")).toBe("`k8s.pod.uid` = 'pod-uid-9527'");
    });

    view.unmount();
    window.history.replaceState({}, "", "/v2/query");
    render(
      <TimeRangeProvider>
        <QueryPage />
      </TimeRangeProvider>
    );
    await screen.findByRole("heading", { name: "Log query" });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    await waitFor(() => {
      expect(
        screen.getAllByRole("columnheader").some((header) => header.textContent?.includes("k8s.pod.uid"))
      ).toBe(true);
    });
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

    await screen.findByRole("heading", { name: "Log query" });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

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

    await screen.findByRole("heading", { name: "Log query" });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByLabelText("Trace links")).toBeInTheDocument();
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

    await screen.findByRole("heading", { name: "Log query" });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("GetTableRepo")).toBeInTheDocument();

    fireEvent.click(screen.getByText("GetTableRepo"));
    expect(screen.getAllByRole("button", { name: "Correlate logs by msg" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Correlate logs by tid" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Correlate logs by msg" })[0]);

    expect(await screen.findByRole("dialog", { name: "Correlate logs" })).toBeInTheDocument();
    expect(screen.getByText("Field")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Time window: ±5 minutes" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("default.app_logs"));
    fireEvent.click(screen.getByRole("button", { name: "Open correlation" }));

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

    expect(await screen.findByRole("heading", { name: "Log query" })).toBeInTheDocument();
    expect(await openDatasourcePanel()).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "生产 ClickHouse" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Database default" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Database archive" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Database archive" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Table audit_logs" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Table daily_backup" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Table daily_backup" }));
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

    await openDatasourcePanel();
    const instanceButton = screen.getByRole("button", { name: "生产 ClickHouse" });

    fireEvent.contextMenu(instanceButton, { clientX: 120, clientY: 80 });
    await screen.findByRole("menu", { name: "Instance actions" });
    await waitFor(() => {
      expect(screen.getByRole("menu", { name: "Instance actions" })).toBeInTheDocument();
    });
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "Instance actions" })).not.toBeInTheDocument();
    });

    fireEvent.contextMenu(instanceButton, { clientX: 120, clientY: 80 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "New database" }));
    await screen.findByRole("dialog", { name: "新增数据库" });
    fireEvent.change(screen.getByLabelText("数据库"), { target: { value: "analytics" } });
    fireEvent.change(screen.getByLabelText("Cluster"), { target: { value: "cluster-main" } });
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "analytics db" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增数据库" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Database analytics" })).toBeInTheDocument();
      expect(screen.getByText("Focused analytics")).toBeInTheDocument();
    });

    fireEvent.contextMenu(screen.getByRole("button", { name: "Database analytics" }), { clientX: 140, clientY: 120 });
    expect(await screen.findByRole("menu", { name: "Database actions" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Add existing table" }));

    await screen.findByRole("dialog", { name: "接入已有日志表" });
    fireEvent.change(screen.getByLabelText("数据库"), { target: { value: "analytics" } });
    fireEvent.change(screen.getByLabelText("已有日志表"), { target: { value: "app_logs" } });
    fireEvent.change(screen.getByLabelText("时间字段"), { target: { value: "_time" } });
    fireEvent.change(screen.getByLabelText("Cluster"), { target: { value: "cluster-main" } });
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "existing table" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "接入已有日志表" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Table app_logs" })).toBeInTheDocument();
      expect(screen.getByText("Added analytics.app_logs")).toBeInTheDocument();
    });

    fireEvent.contextMenu(screen.getByRole("button", { name: "Database analytics" }), { clientX: 140, clientY: 120 });
    expect(await screen.findByRole("menu", { name: "Database actions" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit database" }));

    await screen.findByRole("dialog", { name: "编辑数据库" });
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "edited analytics db" } });
    fireEvent.click(screen.getByRole("button", { name: "确认" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "编辑数据库" })).not.toBeInTheDocument();
      expect(screen.getByText("Focused analytics")).toBeInTheDocument();
    });

    fireEvent.contextMenu(screen.getByRole("button", { name: "Table app_logs" }), { clientX: 160, clientY: 180 });
    expect(await screen.findByRole("menu", { name: "Table actions" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete table" }));

    await screen.findByRole("dialog", { name: "Delete table" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete table" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Table app_logs" })).not.toBeInTheDocument();
      expect(screen.getByText("Deleted app_logs")).toBeInTheDocument();
    });

    fireEvent.contextMenu(screen.getByRole("button", { name: "Database analytics" }), { clientX: 140, clientY: 120 });
    expect(await screen.findByRole("menu", { name: "Database actions" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete database" }));

    await screen.findByRole("dialog", { name: "Delete database" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete database" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Database analytics" })).not.toBeInTheDocument();
      expect(screen.getByText("Deleted analytics")).toBeInTheDocument();
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

  it("runs the first table with an absolute 15 minute window on page entry", async () => {
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

      await waitForQueryPageReady();
      expect(screen.getByRole("button", { name: "Time range: 04/21 09:15 - 09:30" })).toBeInTheDocument();

      expect((await screen.findAllByText("1 row")).length).toBeGreaterThan(0);
      const resultSummary = document.querySelector(".cv-query-result-bar__summary");
      expect(resultSummary).toHaveTextContent("1 row");
      expect(resultSummary).not.toHaveTextContent("1 - 1");

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Time range: 04/21 09:15 - 09:30" }));
      });
      expect(screen.queryByText(/Relative time/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Last 15 minutes" })).not.toBeInTheDocument();
      const presetRow = screen.getByLabelText("Absolute time shortcuts");
      expect(presetRow).toContainElement(screen.getByRole("button", { name: "Today" }));
      expect(presetRow).toContainElement(screen.getByRole("button", { name: "Apply 15 minute absolute span" }));
      expect(document.querySelector(".cv-query-time-absolute-separator")).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(screen.getByLabelText("Absolute start time"));
      });
      expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
      expect(screen.getByLabelText("Absolute start time field")).toHaveClass("cv-query-time-absolute-field--active");
      act(() => {
        fireEvent.click(screen.getByLabelText("Absolute end time field"));
      });
      expect(screen.getByLabelText("Absolute end time field")).toHaveClass("cv-query-time-absolute-field--active");

      expect(
        requestPaths.some(
          (item) =>
            item.includes("/api/v1/tables/9527/logs") &&
            item.includes(`st=${expectedStart}`) &&
            item.includes(`et=${expectedEnd}`)
        )
      ).toBe(true);
      expect(window.location.search).not.toContain("tab=relative");
    } finally {
      nowSpy.mockRestore();
    }
  });
});
