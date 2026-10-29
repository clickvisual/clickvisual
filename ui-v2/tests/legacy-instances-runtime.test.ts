import { describe, expect, it, vi } from "vitest";
import { loadInstanceList } from "../../ui/src/services/instanceRuntime";
import type { InstanceListItem } from "../../ui/src/services/instanceRuntime";

function setup() {
  let items: InstanceListItem[] = [];
  let version = 0;
  const api = { getInstances: vi.fn(), getInstanceRuntime: vi.fn() };
  const load = () => {
    const currentVersion = ++version;
    return loadInstanceList(api, (update) => {
      items = typeof update === "function" ? update(items) : update;
    }, () => version === currentVersion, "Check failed");
  };
  return { api, load, items: () => items, invalidate: () => { version += 1; } };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const instance = (id: number) => ({ id, name: `instance-${id}`, mode: 0, clusters: null, clusterInfo: null });
const runtime = (cluster: string) => ({ code: 0, data: { mode: 1, clusters: [cluster], clusterInfo: [cluster], error: "" } });

describe("v1 instance runtime loading", () => {
  it("displays metadata before checks finish and updates each instance independently", async () => {
    const { api, load, items } = setup();
    const slow = deferred<ReturnType<typeof runtime>>();
    const fast = deferred<ReturnType<typeof runtime>>();
    api.getInstances.mockResolvedValue({ code: 0, data: [instance(1), instance(2)] });
    api.getInstanceRuntime.mockImplementation((id) => id === 1 ? slow.promise : fast.promise);

    await load();
    expect(items()).toHaveLength(2);
    expect(items().every((item) => item.runtimeLoading)).toBe(true);
    expect(items()[0].clusters).toEqual([]);

    fast.resolve(runtime("fast-cluster"));
    await vi.waitFor(() => expect(items()[1].runtimeLoading).toBe(false));
    expect(items()[0].runtimeLoading).toBe(true);
    expect(items()[1].clusters).toEqual(["fast-cluster"]);
    expect(items()[1].runtimeLoading).toBe(false);
    slow.resolve(runtime("slow-cluster"));
    await vi.waitFor(() => expect(items()[0].runtimeLoading).toBe(false));
    expect(items()[0].clusters).toEqual(["slow-cluster"]);
  });

  it("keeps check failures on their row and normalizes null runtime arrays", async () => {
    const { api, load, items } = setup();
    api.getInstances.mockResolvedValue({ code: 0, data: [instance(1), instance(2)] });
    api.getInstanceRuntime.mockImplementation(async (id) => {
      if (id === 1) throw new Error("connection timed out");
      return { code: 0, data: { mode: 0, clusters: null, clusterInfo: null, error: "" } };
    });
    await load();
    await vi.waitFor(() => expect(items().every((item) => !item.runtimeLoading)).toBe(true));
    expect(items()[0].error).toBe("connection timed out");
    expect(items()[1].error).toBe("");
    expect(items()[1].clusters).toEqual([]);
    expect(items()[1].clusterInfo).toEqual([]);
  });

  it("ignores stale runtime results after a list refresh", async () => {
    const { api, load, items } = setup();
    const old = deferred<ReturnType<typeof runtime>>();
    api.getInstances.mockResolvedValue({ code: 0, data: [instance(1)] });
    api.getInstanceRuntime.mockReturnValueOnce(old.promise).mockResolvedValueOnce(runtime("new-cluster"));
    await load();
    await load();
    old.resolve(runtime("old-cluster"));
    await old.promise;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await vi.waitFor(() => expect(items()[0].runtimeLoading).toBe(false));
    expect(items()[0].clusters).toEqual(["new-cluster"]);
  });

  it("shows application-level failures as a failed check", async () => {
    const { api, load, items } = setup();
    api.getInstances.mockResolvedValue({ code: 0, data: [instance(1)] });
    api.getInstanceRuntime.mockResolvedValue({ code: 1, msg: "authentication failed" });
    await load();
    await vi.waitFor(() => expect(items()[0].runtimeLoading).toBe(false));
    expect(items()[0].error).toBe("authentication failed");
  });

  it("ignores check failures after the request has been invalidated", async () => {
    const { api, load, items, invalidate } = setup();
    const pending = deferred<ReturnType<typeof runtime>>();
    api.getInstances.mockResolvedValue({ code: 0, data: [instance(1)] });
    api.getInstanceRuntime.mockReturnValue(pending.promise);
    await load();
    const before = items();
    invalidate();
    pending.reject(new Error("stale failure"));
    await pending.promise.catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(items()).toBe(before);
  });

  it("ignores an older metadata response that finishes after a refresh", async () => {
    const { api, load, items } = setup();
    const old = deferred<{ code: number; data: ReturnType<typeof instance>[] }>();
    api.getInstances.mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce({ code: 0, data: [instance(2)] });
    api.getInstanceRuntime.mockResolvedValue(runtime("new-cluster"));
    const firstLoad = load();
    await load();
    old.resolve({ code: 0, data: [instance(1)] });
    await firstLoad;
    expect(items().map((item) => item.id)).toEqual([2]);
    expect(api.getInstanceRuntime).toHaveBeenCalledTimes(1);
    expect(api.getInstanceRuntime).toHaveBeenCalledWith(2);
  });

  it("keeps a database-reported error separate from the instance description", async () => {
    const { api, load, items } = setup();
    api.getInstances.mockResolvedValue({ code: 0, data: [{ ...instance(1), desc: "primary" }] });
    api.getInstanceRuntime.mockResolvedValue({ code: 0, data: {
      mode: 0, clusters: [], clusterInfo: [], error: "ClickHouse unavailable"
    } });
    await load();
    await vi.waitFor(() => expect(items()[0].runtimeLoading).toBe(false));
    expect(items()[0].desc).toBe("primary");
    expect(items()[0].error).toBe("ClickHouse unavailable");
  });
});
