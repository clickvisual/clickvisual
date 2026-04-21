import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import PermissionRolesPage from "../src/domains/permission/pages/PermissionRolesPage";

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

function createRoleFetchMock() {
  const postPayloads: Array<Record<string, unknown>> = [];
  const putPayloads: Array<Record<string, unknown>> = [];
  let roles = [
    {
      id: 11,
      name: "instance_viewer",
      desc: "实例只读角色",
      belongResource: "instance",
      roleType: 1,
      resourceId: 0,
      details: [
        {
          id: 101,
          pmsRoleId: 11,
          subResources: ["log", "pandas"],
          acts: ["view"]
        }
      ]
    },
    {
      id: 12,
      name: "instance_editor",
      desc: "实例编辑角色",
      belongResource: "instance",
      roleType: 2,
      resourceId: 101,
      details: [
        {
          id: 102,
          pmsRoleId: 12,
          subResources: ["log"],
          acts: ["edit"]
        }
      ]
    }
  ];

  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : input.toString();
    const url = new URL(rawUrl, "http://localhost");
    const method = init?.method || "GET";

    if (method === "GET" && url.pathname.endsWith("/api/v1/pms/commonInfo")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              prefixes_info: [
                { name: "instance", desc: "实例" }
              ],
              all_acts_info: [
                { name: "view", desc: "查看" },
                { name: "edit", desc: "编辑" }
              ],
              app_subResources_info: [
                { name: "log", desc: "日志" },
                { name: "pandas", desc: "分析结果" }
              ]
            }
          })
      };
    }

    if (method === "GET" && url.pathname.endsWith("/api/v1/pms/role")) {
      const belongResource = url.searchParams.get("belongResource") || "";
      const list = roles.filter((item) => !belongResource || item.belongResource === belongResource);

      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: list
          })
      };
    }

    if (method === "GET" && url.pathname.endsWith("/api/v1/pms/role/12")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              id: 12,
              name: "instance_editor",
              desc: "实例编辑角色",
              belongResource: "instance",
              roleType: 2,
              resourceId: 101,
              details: [
                {
                  id: 102,
                  pmsRoleId: 12,
                  subResources: ["log"],
                  acts: ["edit"]
                }
              ]
            }
          })
      };
    }

    if (method === "POST" && url.pathname.endsWith("/api/v1/pms/role")) {
      const payload = JSON.parse(String(init?.body || "{}"));
      postPayloads.push(payload);
      roles = roles.concat({
        id: 13,
        ...payload
      });
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

    if (method === "PUT" && url.pathname.endsWith("/api/v1/pms/role/12")) {
      const payload = JSON.parse(String(init?.body || "{}"));
      putPayloads.push(payload);
      roles = roles.map((item) => (item.id === 12 ? { ...item, ...payload } : item));
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

    if (method === "DELETE" && url.pathname.endsWith("/api/v1/pms/role/12")) {
      roles = roles.filter((item) => item.id !== 12);
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
    postPayloads,
    putPayloads
  };
}

describe("permission roles page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads role list, filters by resource, and shows role details", async () => {
    const mock = createRoleFetchMock();
    vi.stubGlobal("fetch", mock.fetch);

    render(
      <MemoryRouter>
        <PermissionRolesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("instance_viewer")).toBeInTheDocument();
    expect(screen.getByText("instance_editor")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("所属资源过滤"), {
      target: { value: "instance" }
    });
    fireEvent.click(screen.getByRole("button", { name: "查询角色" }));

    expect(await screen.findByText("实例只读角色")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看角色 instance_editor" }));

    expect(await screen.findByText("角色名称：instance_editor")).toBeInTheDocument();
    expect(screen.getByText("角色类型：自定义角色")).toBeInTheDocument();
    expect(screen.getByText("子资源：log")).toBeInTheDocument();
    expect(screen.getByText("动作：edit")).toBeInTheDocument();
  });

  it("creates, edits, and deletes roles", async () => {
    const mock = createRoleFetchMock();
    vi.stubGlobal("fetch", mock.fetch);

    render(
      <MemoryRouter>
        <PermissionRolesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("instance_viewer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增角色" }));
    fireEvent.change(screen.getByLabelText("角色英文名"), {
      target: { value: "instance_auditor" }
    });
    fireEvent.change(screen.getByLabelText("角色说明"), {
      target: { value: "审计角色" }
    });
    expect(screen.queryByLabelText("资源 ID")).not.toBeInTheDocument();
    setMultiSelectValue(screen.getByRole("button", { name: "子资源 1" }), ["日志 (log)"]);
    setMultiSelectValue(screen.getByRole("button", { name: "准许操作 1" }), ["查看 (view)"]);
    fireEvent.click(screen.getByRole("button", { name: "新增资源授权" }));
    setMultiSelectValue(screen.getByRole("button", { name: "子资源 2" }), ["分析结果 (pandas)"]);
    setMultiSelectValue(screen.getByRole("button", { name: "准许操作 2" }), ["查看 (view)"]);
    fireEvent.click(screen.getByRole("button", { name: "保存角色" }));

    expect(await screen.findByText("instance_auditor")).toBeInTheDocument();
    expect(mock.postPayloads.at(-1)).toMatchObject({
      name: "instance_auditor",
      desc: "审计角色",
      belongResource: "instance",
      roleType: 1,
      resourceId: 0,
      details: [
        { subResources: ["log"], acts: ["view"] },
        { subResources: ["pandas"], acts: ["view"] }
      ]
    });

    fireEvent.click(screen.getByRole("button", { name: "编辑角色 instance_editor" }));
    fireEvent.change(screen.getByLabelText("角色说明"), {
      target: { value: "实例编辑角色-更新" }
    });
    setMultiSelectValue(
      screen.getByRole("button", { name: "子资源 1" }),
      ["日志 (log)", "分析结果 (pandas)"]
    );
    fireEvent.click(screen.getByRole("button", { name: "保存角色" }));

    expect(await screen.findByText("实例编辑角色-更新")).toBeInTheDocument();
    expect(mock.putPayloads.at(-1)).toMatchObject({
      name: "instance_editor",
      desc: "实例编辑角色-更新",
      belongResource: "instance",
      roleType: 2,
      resourceId: 101,
      details: [{ subResources: ["log", "pandas"], acts: ["edit"] }]
    });

    fireEvent.click(screen.getByRole("button", { name: "删除角色 instance_editor" }));
    expect(await screen.findByText("角色已删除")).toBeInTheDocument();
    expect(screen.queryByText("instance_editor")).not.toBeInTheDocument();
  });
});
