import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accessQueryLogLibrary,
  createQueryDatabase,
  createQueryFilter,
  createQueryShareShortUrl,
  deleteQueryDatabase,
  deleteQueryFilter,
  deleteQueryTable,
  getQueryAnalysisFields,
  getQueryAutocomplete,
  getQueryFilter,
  getQueryCharts,
  getQueryLogs,
  runQueryV2,
  listQueryExistingDatabases,
  listQueryExistingTables,
  listQueryManageInstances,
  listQuerySourceDatabases,
  listQuerySourceInstances,
  listQuerySourceTables,
  listQueryFilters,
  resolveQueryTableId,
  updateQueryDatabase,
  updateQueryFilter
} from "../src/domains/query/api/query";

describe("query api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads instances, databases and tables from source apis", async () => {
    const requestUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requestUrls.push(`${init?.method || "GET"} ${url}`);
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: [
              {
                id: 1,
                instanceName: "生产 ClickHouse",
                desc: "本地测试实例",
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
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await listQuerySourceInstances()).toEqual([
      {
        id: 1,
        name: "生产 ClickHouse",
        desc: "本地测试实例",
        databases: [
          {
            id: 11,
            iid: 1,
            name: "default",
            desc: "",
            cluster: "",
            tables: [{ id: 9527, did: 11, name: "logs", desc: "" }]
          }
        ]
      }
    ]);
    expect(await listQuerySourceDatabases(1)).toEqual([
      { id: 11, iid: 1, name: "default", desc: "", cluster: "", tables: [{ id: 9527, did: 11, name: "logs", desc: "" }] }
    ]);
    expect(await listQuerySourceTables(1, "default")).toEqual([{ id: 9527, did: 11, name: "logs", desc: "" }]);
    expect(requestUrls.every((item) => item.includes("/api/v2/base/instances"))).toBe(true);
  });

  it("resolves table id with v1 query params", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          code: 0,
          msg: "succ",
          data: 88
        })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const tableId = await resolveQueryTableId({
      instance: "1",
      database: "default",
      datasource: "clickhouse",
      table: "logs"
    });

    expect(tableId).toBe(88);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/table/id?instance=1&database=default&datasource=clickhouse&table=logs"
      ),
      expect.any(Object)
    );
  });

  it("loads logs and charts from v1 query apis", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/logs?")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                count: 1,
                cost: 12,
                keys: [{ field: "message", alias: "message" }],
                query: "level:error",
                logs: [{ message: "timeout" }]
              }
            })
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              histograms: [{ count: 10, from: 1, to: 2, progress: "100%" }]
            }
          })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const params = { st: 1, et: 2, query: "level:error", page: 1, pageSize: 20 };
    const logs = await getQueryLogs(99, params);
    const charts = await getQueryCharts(99, params);

    expect(logs.logs).toEqual([{ message: "timeout" }]);
    expect(charts).toEqual([{ count: 10, from: 1, to: 2, progress: "100%" }]);
  });

  it("loads analysis fields and autocomplete suggestions", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/analysis-fields")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                baseFields: ["service"],
                logFields: ["message"]
              }
            })
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              logs: [{ suggestion: "service:gateway" }],
              isNeedSort: false,
              sortRule: []
            }
          })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const fields = await getQueryAnalysisFields(99);
    const auto = await getQueryAutocomplete(1, "serv");

    expect(fields.baseFields).toEqual([{ field: "service", orderField: "service" }]);
    expect(fields.logFields).toEqual([{ field: "message", orderField: "message" }]);
    expect(auto.logs).toEqual([{ suggestion: "service:gateway" }]);
  });

  it("runs structured v2 query requests", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/api/v2/query/run");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        tid: 99,
        conditions: [
          {
            field: { fieldKey: "lv" },
            operator: "contains",
            value: "error"
          }
        ]
      });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              count: 1,
              cost: 8,
              keys: [{ field: "msg", alias: "msg" }],
              logs: [{ msg: "error" }],
              query: "SELECT * FROM logs",
              sql: "SELECT * FROM logs",
              plan: { table: "logs", plannedConditions: [], warnings: [], orderBy: [] }
            }
          })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runQueryV2({
      tid: 99,
      st: 1,
      et: 2,
      page: 1,
      pageSize: 20,
      conditions: [
        {
          field: {
            fieldKey: "lv",
            displayName: "lv",
            source: "json_path",
            path: "lv",
            valueType: "string",
            isAccelerated: false
          },
          operator: "contains",
          value: "error"
        }
      ],
      sorts: [],
      displayFields: []
    });

    expect(result.logs).toEqual([{ msg: "error" }]);
    expect(result.plan.table).toBe("logs");
  });

  it("supports instance tree management helpers", async () => {
    const requests: Array<{ method: string; url: string; body?: string }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "GET";
      requests.push({
        method,
        url,
        body: typeof init?.body === "string" ? init.body : undefined
      });

      if (method === "GET" && url.includes("/api/v2/base/settings/instances")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: [{ id: 1, name: "生产 ClickHouse", clusters: ["cluster-main"], mode: 1 }]
            })
        };
      }

      if (method === "GET" && url.includes("/api/v1/instances/1/databases-exist")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: [{ name: "default", tables: [] }, { name: "archive", tables: [] }]
            })
        };
      }

      if (method === "GET" && url.includes("/api/v2/query/instances/1/databases/analytics/tables")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: [{ name: "app_logs" }, { name: "audit_logs" }]
            })
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: null
          })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await listQueryManageInstances()).toEqual([
      { id: 1, name: "生产 ClickHouse", clusters: ["cluster-main"], mode: 1 }
    ]);
    expect(await listQueryExistingDatabases(1)).toEqual(["default", "archive"]);
    expect(await listQueryExistingTables(1, "analytics")).toEqual(["app_logs", "audit_logs"]);

    await createQueryDatabase(1, {
      databaseName: "analytics",
      cluster: "cluster-main",
      desc: "analytics db",
      type: 0
    });
    await accessQueryLogLibrary(1, {
      databaseName: "analytics",
      tableName: "app_logs",
      timeField: "_time",
      timeFieldType: 1,
      cluster: "cluster-main",
      desc: "access existing table"
    });
    await updateQueryDatabase(11, {
      cluster: "cluster-main",
      desc: "edited db"
    });
    await deleteQueryDatabase(11);
    await deleteQueryTable(9527);

    expect(requests.some((item) => item.method === "POST" && item.url.includes("/api/v1/instances/1/databases"))).toBe(true);
    expect(
      requests.some(
        (item) =>
          item.method === "POST" &&
          item.url.includes("/api/v1/instances/1/tables-exist") &&
          item.body?.includes("\"tableName\":\"app_logs\"")
      )
    ).toBe(true);
    expect(requests.some((item) => item.method === "PATCH" && item.url.includes("/api/v1/databases/11"))).toBe(true);
    expect(requests.some((item) => item.method === "DELETE" && item.url.includes("/api/v1/databases/11"))).toBe(true);
    expect(requests.some((item) => item.method === "DELETE" && item.url.includes("/api/v1/tables/9527"))).toBe(true);
  });

  it("requests saved filters by instance database and table", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          code: 0,
          msg: "succ",
          data: []
        })
    }));
    vi.stubGlobal("fetch", fetchMock);

    await listQueryFilters({ instanceId: 1, database: "default", table: "logs" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v2/query/filters?instanceId=1&database=default&table=logs"),
      expect.any(Object)
    );
  });

  it("supports saved-filter CRUD and shorturl helpers", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "GET";
      if (method === "POST" && url.includes("/api/v2/query/filters")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                id: 1,
                name: "gateway timeout",
                instanceId: 1,
                instanceName: "生产 ClickHouse",
                database: "default",
                table: "logs",
                timeRange: { startTime: "2026-04-21T08:30", endTime: "2026-04-21T09:30" },
                conditions: [],
                creator: "tester",
                updater: "tester",
                ctime: 1,
                utime: 1
              }
            })
        };
      }
      if (method === "GET" && url.includes("/api/v2/query/filters/1")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                id: 1,
                name: "gateway timeout",
                instanceId: 1,
                instanceName: "生产 ClickHouse",
                database: "default",
                table: "logs",
                timeRange: { startTime: "2026-04-21T08:30", endTime: "2026-04-21T09:30" },
                conditions: [],
                creator: "tester",
                updater: "tester",
                ctime: 1,
                utime: 1
              }
            })
        };
      }
      if (method === "PUT" && url.includes("/api/v2/query/filters/1")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: {
                id: 1,
                name: "gateway timeout v2",
                instanceId: 1,
                instanceName: "生产 ClickHouse",
                database: "default",
                table: "logs",
                timeRange: { startTime: "2026-04-21T08:30", endTime: "2026-04-21T09:30" },
                conditions: [],
                creator: "tester",
                updater: "tester",
                ctime: 1,
                utime: 2
              }
            })
        };
      }
      if (method === "DELETE" && url.includes("/api/v2/query/filters/1")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: { id: 1 }
            })
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: "http://localhost/share/abcd"
          })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      name: "gateway timeout",
      instanceId: 1,
      instanceName: "生产 ClickHouse",
      database: "default",
      table: "logs",
      timeRange: { startTime: "2026-04-21T08:30", endTime: "2026-04-21T09:30" },
      conditions: []
    };
    const created = await createQueryFilter(payload);
    const fetched = await getQueryFilter(created.id);
    const updated = await updateQueryFilter(created.id, { ...payload, name: "gateway timeout v2" });
    const removed = await deleteQueryFilter(created.id);
    const shortUrl = await createQueryShareShortUrl({
      originUrl: "http://localhost/query?instanceId=1"
    });

    expect(fetched.id).toBe(1);
    expect(updated.name).toBe("gateway timeout v2");
    expect(removed.id).toBe(1);
    expect(shortUrl).toContain("/share/");
  });
});
