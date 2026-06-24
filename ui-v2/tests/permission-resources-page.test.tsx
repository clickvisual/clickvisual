import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import PermissionResourcesPage from "../src/domains/permission/pages/PermissionResourcesPage";

function setMultiSelectValue(trigger: HTMLElement, labels: string[]) {
  fireEvent.click(trigger);
  const root = trigger.closest(".cv-multi-select") as HTMLElement;
  const checkboxes = within(root).getAllByRole("checkbox") as HTMLInputElement[];
  checkboxes.forEach((checkbox) => {
    const label = checkbox.parentElement?.textContent?.trim() || "";
    const shouldBeChecked = labels.includes(label);
    if (checkbox.checked !== shouldBeChecked) {
      fireEvent.click(checkbox);
    }
  });
  fireEvent.click(trigger);
}

function createResourceFetchMock() {
  const putPayloads: Array<Record<string, unknown>> = [];
  const roleTemplates = [
    {
      id: 11,
      name: "instance_viewer",
      desc: "实例只读角色",
      belongResource: "instance",
      roleType: 1,
      resourceId: 0,
      details: []
    },
    {
      id: 12,
      name: "instance_operator",
      desc: "实例运维角色",
      belongResource: "instance",
      roleType: 1,
      resourceId: 0,
      details: [
        {
          subResources: ["log"],
          acts: ["edit"]
        }
      ]
    }
  ];
  let grant = {
    iid: 101,
    roles: [
      {
        id: 11,
        roleType: 1,
        name: "instance_viewer",
        desc: "实例只读角色",
        details: [],
        grant: [
          {
            created: 1,
            domain: ["*"],
            userIds: [1]
          }
        ]
      }
    ]
  };

  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : input.toString();
    const url = new URL(rawUrl, "http://localhost");
    const method = init?.method || "GET";

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

    if (method === "GET" && url.pathname.endsWith("/api/v2/base/users")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              total: 2,
              list: [
                { uid: 1, username: "alice", nickname: "Alice", email: "", phone: "", avatar: "" },
                { uid: 2, username: "bob", nickname: "Bob", email: "", phone: "", avatar: "" }
              ]
            }
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
              all_acts_info: [
                { name: "view", desc: "查看" },
                { name: "edit", desc: "编辑" }
              ],
              app_subResources_info: [
                { name: "log", desc: "日志" },
                { name: "pandas", desc: "分析结果" }
              ],
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
            data: grant
          })
      };
    }

    if (method === "GET" && url.pathname.endsWith("/api/v1/pms/role")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: roleTemplates
          })
      };
    }

    if (method === "PUT" && url.pathname.endsWith("/api/v1/pms/instance/101/role/grant")) {
      putPayloads.push(JSON.parse(String(init?.body || "{}")));
      grant = JSON.parse(String(init?.body || "{}")) as typeof grant;
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

  return {
    fetch,
    putPayloads
  };
}

describe("permission resources page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads instance grants and updates grant rows from the resource perspective", async () => {
    const mock = createResourceFetchMock();
    vi.stubGlobal("fetch", mock.fetch);

    render(
      <MemoryRouter>
        <PermissionResourcesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("核心日志实例")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看实例 核心日志实例" }));

    expect(await screen.findByText("角色：instance_viewer")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("作用域：*"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("用户：Alice"))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "调整授权 instance_viewer" }));
    fireEvent.click(screen.getByRole("button", { name: "新增授权" }));
    fireEvent.change(screen.getByLabelText("作用域 2"), {
      target: { value: "BaseDatabase__8" }
    });
    setMultiSelectValue(screen.getByRole("button", { name: "授权用户 2" }), ["Bob (2)"]);
    fireEvent.click(screen.getByRole("button", { name: "保存调整" }));

    expect(await screen.findByText((content) => content.includes("作用域：BaseDatabase / 8"))).toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes("用户：Bob"))).toBeInTheDocument();
    expect(mock.putPayloads.at(-1)).toMatchObject({
      iid: 101,
      roles: [
        {
          id: 11,
          grant: [
            { created: 1, domain: ["*"], userIds: [1] },
            { created: 0, domain: ["BaseDatabase", "8"], userIds: [2] }
          ]
        }
      ]
    });
  });

  it("binds a template role to the selected instance", async () => {
    const mock = createResourceFetchMock();
    vi.stubGlobal("fetch", mock.fetch);

    render(
      <MemoryRouter>
        <PermissionResourcesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("核心日志实例")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看实例 核心日志实例" }));
    fireEvent.click(screen.getByRole("button", { name: "选择角色模板" }));
    fireEvent.change(screen.getByLabelText("角色模板"), {
      target: { value: "12" }
    });
    fireEvent.click(screen.getByRole("button", { name: "下一步配置授权" }));
    setMultiSelectValue(screen.getByRole("button", { name: "授权用户 1" }), ["Bob (2)"]);
    fireEvent.change(screen.getByLabelText("作用域 1"), {
      target: { value: "BaseDatabase__8" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存调整" }));

    expect(await screen.findByText("角色：instance_operator")).toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes("作用域：BaseDatabase / 8"))).toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes("用户：Bob"))).toBeInTheDocument();
    expect(mock.putPayloads.at(-1)).toMatchObject({
      iid: 101,
      roles: [
        {
          id: 11
        },
        {
          id: 12,
          roleType: 1,
          name: "instance_operator",
          desc: "实例运维角色",
          details: [{ sub_resources: ["log"], acts: ["edit"] }],
          grant: [{ created: 0, domain: ["BaseDatabase", "8"], userIds: [2] }]
        }
      ]
    });
  });
});
