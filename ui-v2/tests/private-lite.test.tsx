import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createV2Routes } from "../src/app/router";

function renderPrivateLiteRoute(path: string) {
  window.__CLICKVISUAL_V2_CONFIG__ = { edition: "private-lite" };
  const memoryRouter = createMemoryRouter(createV2Routes(true), {
    initialEntries: [path]
  });
  render(<RouterProvider router={memoryRouter} />);
}

afterEach(() => {
  delete window.__CLICKVISUAL_V2_CONFIG__;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("v2 private-lite edition", () => {
  it("shows only query navigation", async () => {
    renderPrivateLiteRoute("/v2/query");

    await screen.findByRole("heading", { name: "日志查询" });
    expect(screen.getByRole("link", { name: "日志查询" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "总览大盘" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "数据开发" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "数据报表" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "告警中心" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "配置中心" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "权限中心" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "创建日志库" })).not.toBeInTheDocument();
  });

  it("keeps the default page on query", async () => {
    renderPrivateLiteRoute("/v2");

    expect(await screen.findByRole("heading", { name: "日志查询" })).toBeInTheDocument();
  });

  it("renders the v2 login page and submits credentials", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        assign,
        pathname: "/v2/login"
      },
      writable: true
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, msg: "succ", data: "" })
      }))
    );
    renderPrivateLiteRoute("/v2/login");

    expect(screen.getByRole("heading", { name: "ClickVisual v2" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "clickvisual" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/users/login",
        expect.objectContaining({
          credentials: "same-origin",
          method: "POST"
        })
      );
      expect(assign).toHaveBeenCalledWith("/v2/query");
    });
    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    const body = requestInit?.body as URLSearchParams;
    expect(body.get("password")).toBe("c37de4f875d7f764d27cd57dccfa0e56");
    expect(body.get("passwordEncoded")).toBe("md5");
    expect(body.get("password")).not.toBe("clickvisual");
  });
});
