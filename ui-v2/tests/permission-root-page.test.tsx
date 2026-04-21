import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import PermissionRootPage from "../src/domains/permission/pages/PermissionRootPage";

function createRootFetchMock() {
  let rootUids = [3];
  const users = [
    { uid: 1, username: "alice", nickname: "平台管理员", email: "", phone: "", avatar: "" },
    { uid: 2, username: "bob", nickname: "日志运营", email: "", phone: "", avatar: "" },
    { uid: 3, username: "charlie", nickname: "Charlie", email: "", phone: "", avatar: "" }
  ];

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : input.toString();
    const url = new URL(rawUrl, "http://localhost");
    const method = init?.method || "GET";

    if (method === "GET" && url.pathname.endsWith("/api/v1/pms/root/uids")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              root_uids: rootUids
            }
          })
      };
    }

    if (method === "GET" && url.pathname.endsWith("/api/v2/base/users")) {
      const current = Number(url.searchParams.get("current") || "1");
      const pageSize = Number(url.searchParams.get("pageSize") || "10");
      const start = (current - 1) * pageSize;
      const end = start + pageSize;

      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              total: users.length,
              list: users.slice(start, end)
            }
          })
      };
    }

    if (method === "POST" && url.pathname.endsWith("/api/v1/pms/root/grant")) {
      const payload = JSON.parse(String(init?.body || "{}")) as { root_uids: number[] };
      rootUids = payload.root_uids;
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
    }

    return {
      ok: false,
      status: 500,
      text: async () =>
        JSON.stringify({
          code: 1,
          msg: `unhandled request: ${method} ${url.pathname}`,
          data: null
        })
    };
  });
}

describe("permission root page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads root users and grants root access to another user from the search modal", async () => {
    vi.stubGlobal("fetch", createRootFetchMock());

    render(
      <MemoryRouter>
        <PermissionRootPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Charlie")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "选择用户授予 Root" }));
    expect(await screen.findByRole("dialog", { name: "选择 Root 用户" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("搜索 Root 用户"), {
      target: { value: "运营" }
    });
    fireEvent.click(screen.getByRole("button", { name: "选择用户 日志运营" }));
    fireEvent.click(screen.getByRole("button", { name: "确认授予" }));
    expect(await screen.findByRole("dialog", { name: "Root 权限确认" })).toBeInTheDocument();
    expect(screen.getByText("日志运营 (bob)")).toBeInTheDocument();
    expect(screen.getByText("Root 变更会立即生效。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认授予" }));

    expect(await screen.findByText("日志运营")).toBeInTheDocument();
  });
});
