import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPermissionRole,
  createPermissionUser,
  deletePermissionUser,
  getPermissionCommonInfo,
  getPermissionInstanceGrant,
  getPermissionRoleDetail,
  getPermissionRootUids,
  grantPermissionRootUids,
  listPermissionRoles,
  listPermissionUsers,
  resetPermissionUserPassword,
  updatePermissionRole,
  updatePermissionInstanceGrant,
  updatePermissionUser,
  deletePermissionRole
} from "../src/domains/permission/api/permission";

describe("permission api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("requests paged user list with query string", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          code: 0,
          msg: "succ",
          data: {
            total: 1,
            list: [
              {
                uid: 7,
                username: "alice",
                nickname: "Alice",
                email: "",
                phone: "",
                avatar: ""
              }
            ]
          }
        })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await listPermissionUsers({
      username: "ali",
      current: 2,
      pageSize: 20
    });

    expect(result.total).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v2/base/users?username=ali&current=2&pageSize=20"),
      expect.objectContaining({
        method: "GET"
      })
    );
  });

  it("sends create, update, reset and delete requests with the expected payloads", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          code: 0,
          msg: "succ",
          data: {
            username: "alice",
            password: "Temp1234"
          }
        })
    }));
    vi.stubGlobal("fetch", fetchMock);

    await createPermissionUser({
      username: "alice",
      nickname: "Alice"
    });
    await updatePermissionUser(7, {
      nickname: "Alice Chen",
      email: "alice@example.com",
      phone: "13800138000"
    });
    await resetPermissionUserPassword(7);
    await deletePermissionUser(7);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/v2/base/users"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "alice",
          nickname: "Alice"
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/v2/base/users/7"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          nickname: "Alice Chen",
          email: "alice@example.com",
          phone: "13800138000"
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("/api/v2/base/users/7/password-reset"),
      expect.objectContaining({
        method: "PATCH"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("/api/v2/base/users/7"),
      expect.objectContaining({
        method: "DELETE"
      })
    );
  });

  it("loads common permission metadata and updates instance grants", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
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
                }
              ]
            }
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              iid: 9,
              roles: []
            }
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: null
          })
      });
    vi.stubGlobal("fetch", fetchMock);

    const commonInfo = await getPermissionCommonInfo();
    const instanceGrant = await getPermissionInstanceGrant(9);
    await updatePermissionInstanceGrant(9, {
      iid: 9,
      roles: []
    });

    expect(commonInfo.domainCascader[0]?.value).toBe("*");
    expect(instanceGrant.iid).toBe(9);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/v1/pms/commonInfo?iid=0"),
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/v1/pms/instance/9/role/grant"),
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("/api/v1/pms/instance/9/role/grant"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          iid: 9,
          roles: []
        })
      })
    );
  });

  it("loads roles list and role detail from legacy pms endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: [
              {
                id: 11,
                name: "instance_viewer",
                desc: "viewer",
                belongResource: "instance",
                roleType: 1,
                resourceId: 0,
                details: []
              }
            ]
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              id: 11,
              name: "instance_viewer",
              desc: "viewer",
              belongResource: "instance",
              roleType: 1,
              resourceId: 0,
              details: []
            }
          })
      });
    vi.stubGlobal("fetch", fetchMock);

    const list = await listPermissionRoles({
      name: "viewer",
      belongResource: "instance"
    });
    const detail = await getPermissionRoleDetail(11);

    expect(list[0]?.name).toBe("instance_viewer");
    expect(detail.id).toBe(11);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/v1/pms/role?name=viewer&belongResource=instance"),
      expect.objectContaining({ method: "GET" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/v1/pms/role/11"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("creates, updates and deletes roles through legacy pms role endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: null
          })
      });
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      name: "instance_editor",
      desc: "editor",
      belongResource: "instance",
      roleType: 2,
      resourceId: 101,
      details: [
        {
          subResources: ["log"],
          acts: ["edit"]
        }
      ]
    };

    await createPermissionRole(payload);
    await updatePermissionRole(12, payload);
    await deletePermissionRole(12, {
      belongResource: "instance",
      resourceId: 101
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/v1/pms/role"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload)
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/v1/pms/role/12"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(payload)
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("/api/v1/pms/role/12"),
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({
          belongResource: "instance",
          resourceId: 101
        })
      })
    );
  });

  it("loads and grants root users through legacy pms root endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: {
              root_uids: [1, 3]
            }
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "succ",
            data: null
          })
      });
    vi.stubGlobal("fetch", fetchMock);

    const roots = await getPermissionRootUids();
    await grantPermissionRootUids({
      root_uids: [1, 2, 3]
    });

    expect(roots.root_uids).toEqual([1, 3]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/v1/pms/root/uids"),
      expect.objectContaining({ method: "GET" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/v1/pms/root/grant"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          root_uids: [1, 2, 3]
        })
      })
    );
  });
});
