import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getQueryAnalysisFields,
  getQueryAutocomplete,
  getQueryCharts,
  getQueryLogs,
  listQuerySourceDatabases,
  listQuerySourceInstances,
  listQuerySourceTables,
  resolveQueryTableId
} from "../src/domains/query/api/query";

describe("query api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads instances, databases and tables from source apis", async () => {
    expect(await listQuerySourceInstances()).toEqual([
      {
        id: 1,
        name: "生产 ClickHouse",
        desc: "本地测试实例",
        clusters: []
      }
    ]);
    expect(await listQuerySourceDatabases(1)).toEqual([{ name: "default" }]);
    expect(await listQuerySourceTables(1, "default")).toEqual([{ name: "logs" }]);
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

    expect(fields.baseFields).toEqual(["service"]);
    expect(fields.logFields).toEqual(["message"]);
    expect(auto.logs).toEqual([{ suggestion: "service:gateway" }]);
  });
});
