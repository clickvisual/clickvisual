// @vitest-environment node

import { describe, expect, it } from "vitest";
import config from "../vite.config";

describe("vite dev proxy", () => {
  it("proxies /api requests to the backend server", () => {
    const server = config.server;
    expect(server).toBeDefined();
    expect(server?.proxy).toBeDefined();

    const apiProxy = server?.proxy?.["/api"];
    expect(apiProxy).toBeDefined();
    expect(typeof apiProxy).toBe("object");
    expect(apiProxy).toMatchObject({
      target: "http://127.0.0.1:19001",
      changeOrigin: true
    });
  });

  it("injects local proxy auth headers for backend requests", () => {
    const apiProxy = config.server?.proxy?.["/api"];
    expect(apiProxy).toBeDefined();
    expect(typeof apiProxy).toBe("object");
    expect(apiProxy).toMatchObject({
      headers: {
        "X-CLICKVISUAL-USER": "clickvisual",
        "X-CLICKVISUAL-NICKNAME": "clickvisual"
      }
    });
  });
});
