import { describe, expect, it, vi, afterEach } from "vitest";
import { client } from "../src/shared/http/client";

describe("http client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reports a clear error when upstream returns an empty 500 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => ""
      }))
    );

    await expect(client.get("/api/v2/reports/list")).rejects.toThrow(
      "接口请求失败（HTTP 500）"
    );
  });

  it("redirects to login when api responds with code 302", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        assign,
        pathname: "/console/v2/reports"
      },
      writable: true
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 302,
            msg: "redirect",
            data: "/console/user/login"
          })
      }))
    );

    await expect(client.get("/api/v2/reports/list")).rejects.toThrow("需要重新登录");
    expect(assign).toHaveBeenCalledWith("/console/user/login");
  });

  it("falls back to the default login route when redirect payload is empty", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        assign,
        pathname: "/console/v2/reports"
      },
      writable: true
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 302,
            msg: "redirect",
            data: ""
          })
      }))
    );

    await expect(client.get("/api/v2/reports/list")).rejects.toThrow("需要重新登录");
    expect(assign).toHaveBeenCalledWith("/console/user/login");
  });
});
