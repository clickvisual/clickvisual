import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import PermissionUsersPage from "../src/domains/permission/pages/PermissionUsersPage";

type MockUser = {
  uid: number;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  avatar: string;
};

function createPermissionFetchMock() {
  let users: MockUser[] = [
    {
      uid: 1,
      username: "alice",
      nickname: "Alice",
      email: "alice@example.com",
      phone: "13800138000",
      avatar: ""
    },
    {
      uid: 2,
      username: "bob",
      nickname: "Bob",
      email: "bob@example.com",
      phone: "13900139000",
      avatar: ""
    }
  ];
  let instanceGrant = {
    iid: 101,
    roles: [
      {
        id: 11,
        roleType: 1,
        name: "日志只读",
        desc: "查看日志和分析结果",
        details: [
          {
            sub_resources: ["log", "pandas"],
            acts: ["view"]
          }
        ],
        grant: [
          {
            created: 1,
            domain: ["*"],
            userIds: [1]
          }
        ]
      },
      {
        id: 12,
        roleType: 2,
        name: "日志维护",
        desc: "编辑日志配置",
        details: [
          {
            sub_resources: ["log"],
            acts: ["edit"]
          }
        ],
        grant: [
          {
            created: 1,
            domain: ["BaseDatabase", "8"],
            userIds: [2]
          }
        ]
      }
    ]
  };

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : input.toString();
    const url = new URL(rawUrl, "http://localhost");
    const method = init?.method || "GET";

    if (method === "GET" && url.pathname.endsWith("/api/v2/base/users")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              total: users.length,
              list: users
            }
          })
      };
    }

    if (method === "GET" && url.pathname.endsWith("/api/v2/base/settings/instances")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: [
              {
                id: 101,
                name: "核心日志实例",
                datasource: "ch",
                desc: "primary",
                clusters: ["cluster-main"],
                clusterInfo: [],
                mode: 1,
                error: ""
              }
            ]
          })
      };
    }

    if (method === "GET" && url.pathname.endsWith("/api/v1/pms/commonInfo")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              domainCascader: [
                {
                  label: "全部数据域",
                  value: "*"
                },
                {
                  label: "数据库",
                  value: "BaseDatabase",
                  children: [
                    {
                      label: "db-orders",
                      value: "8"
                    }
                  ]
                }
              ]
            }
          })
      };
    }

    if (method === "GET" && url.pathname.endsWith("/api/v1/pms/instance/101/role/grant")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: instanceGrant
          })
      };
    }

    if (method === "POST" && url.pathname.endsWith("/api/v2/base/users")) {
      const payload = JSON.parse(String(init?.body || "{}")) as {
        username: string;
        nickname: string;
      };
      users = users.concat({
        uid: 3,
        username: payload.username,
        nickname: payload.nickname,
        email: "",
        phone: "",
        avatar: ""
      });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              username: payload.username,
              password: "Temp1234"
            }
          })
      };
    }

    if (method === "PUT" && url.pathname.endsWith("/api/v1/pms/instance/101/role/grant")) {
      instanceGrant = JSON.parse(String(init?.body || "{}")) as typeof instanceGrant;
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

    if (method === "PATCH" && url.pathname.endsWith("/api/v2/base/users/1")) {
      const payload = JSON.parse(String(init?.body || "{}")) as {
        nickname: string;
        email: string;
        phone: string;
      };
      users = users.map((item) =>
        item.uid === 1 ? { ...item, ...payload } : item
      );
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

    if (method === "PATCH" && url.pathname.endsWith("/api/v2/base/users/1/password-reset")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              username: "alice",
              password: "Reset888"
            }
          })
      };
    }

    if (method === "DELETE" && url.pathname.endsWith("/api/v2/base/users/2")) {
      users = users.filter((item) => item.uid !== 2);
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

describe("permission users page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads and displays the user list", async () => {
    vi.stubGlobal("fetch", createPermissionFetchMock());

    render(
      <MemoryRouter>
        <PermissionUsersPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增用户" })).toBeInTheDocument();
    expect(screen.getByText("核心日志实例")).toBeInTheDocument();
    expect(screen.getByText("日志只读")).toBeInTheDocument();
  });

  it("creates a user and shows the generated password", async () => {
    vi.stubGlobal("fetch", createPermissionFetchMock());

    render(
      <MemoryRouter>
        <PermissionUsersPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "新增用户" }));
    fireEvent.change(screen.getByLabelText("登录名"), {
      target: { value: "charlie" }
    });
    fireEvent.change(screen.getByLabelText("显示名"), {
      target: { value: "Charlie" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存用户" }));

    expect(await screen.findByText("charlie")).toBeInTheDocument();
    expect(screen.getByText("初始密码：Temp1234")).toBeInTheDocument();
  });

  it("edits, resets password, and deletes users", async () => {
    vi.stubGlobal("fetch", createPermissionFetchMock());

    render(
      <MemoryRouter>
        <PermissionUsersPage />
      </MemoryRouter>
    );

    await screen.findByText("alice");

    fireEvent.click(screen.getByRole("button", { name: "编辑 Alice" }));
    fireEvent.change(screen.getByLabelText("昵称"), {
      target: { value: "Alice Chen" }
    });
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "alice.chen@example.com" }
    });
    fireEvent.change(screen.getByLabelText("手机号"), {
      target: { value: "13700137000" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存资料" }));

    expect(await screen.findByText("Alice Chen")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重置密码 Alice Chen" }));
    expect(await screen.findByText("重置密码成功：Reset888")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "删除 Bob" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(screen.queryByText("bob")).not.toBeInTheDocument();
    });
  });

  it("adds and removes grants from the selected user detail view", async () => {
    vi.stubGlobal("fetch", createPermissionFetchMock());

    render(
      <MemoryRouter>
        <PermissionUsersPage />
      </MemoryRouter>
    );

    await screen.findByText("日志只读");

    fireEvent.click(screen.getByRole("button", { name: "新增授权" }));
    fireEvent.change(screen.getByLabelText("授权实例"), {
      target: { value: "101" }
    });
    fireEvent.change(screen.getByLabelText("角色"), {
      target: { value: "12" }
    });
    fireEvent.change(screen.getByLabelText("数据域"), {
      target: { value: "*" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存授权" }));

    expect(await screen.findByText("授权已更新")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "移除授权 日志只读 *" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "移除授权 日志只读 *" })).not.toBeInTheDocument();
    });
  });
});
