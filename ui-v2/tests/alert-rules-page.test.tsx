import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AlertRulesPage from "../src/domains/alert/pages/AlertRulesPage";
import AlertRuleEditor from "../src/domains/alert/components/AlertRuleEditor";
import { alarmDraft, alarmQueryHref, type AlarmRule } from "../src/domains/alert/api/alerts";

let rule: AlarmRule;
let failList = false;
let failWrite = false;
let failPreview = false;
let removed = false;
let saved: Record<string, unknown> | undefined;

beforeEach(() => {
  failList = failWrite = failPreview = removed = false;
  saved = undefined;
  rule = {
    id: 42, alarmName: "真实静态资源告警", uuid: "real-rule-42", status: 3,
    desc: "监测资源加载失败", interval: 5, unit: 0, level: 2, noDataOp: 1, isDisableResolve: 1,
    channelIds: [7], dutyOfficers: [9], aiCooldownSeconds: 1800, ctime: 1792100000, utime: 1792110000,
    tag: { env: "production" }, user: { nickname: "张三", username: "zhangsan" },
    filters: [{ id: 13, tid: 8, tableName: "front_log", mode: 0, when: "level=21", typ: 0, exp: "",
      conditions: [{ typ: 0, exp: 3, cond: 0, val1: 5, val2: 0 }] }],
    relatedList: [{ instance: { id: 1, name: "生产环境" }, table: { id: 8, name: "front_log", database: { id: 2, name: "logs" } } }],
    viewDDLs: { "1|cv_alert": "CREATE MATERIALIZED VIEW cv_alert AS SELECT 1" },
    alertRules: { "1": "groups:\n- name: production" }
  };
  vi.stubGlobal("fetch", vi.fn(async (path: string, init?: RequestInit) => {
    const url = new URL(path, "http://localhost");
    const method = init?.method || "GET";
    const reply = (data: unknown = null, code = 0, pagination?: unknown) => ({ ok: true, text: async () => JSON.stringify({ code, msg: code ? "permission verification failed" : "succ", data, pagination }) });
    if (url.pathname.endsWith("/api/v2/base/instances")) return reply([{ id: 1, instanceName: "生产环境", databases: [{ id: 2, iid: 1, databaseName: "logs", tables: [{ id: 8, did: 2, tableName: "front_log" }, { id: 9, did: 2, tableName: "server_log" }] }] }]);
    if (url.pathname.endsWith("/alarm-channels")) return reply([{ id: 7, name: "生产渠道", typ: 1, key: "https://example.test", uid: 1 }]);
    if (url.pathname.endsWith("/base/users")) return reply({ total: 1, list: [{ uid: 9, nickname: "张三", username: "zhangsan" }] });
    if (url.pathname.endsWith("/logs")) return reply({ count: 1, logs: [{ message: "Resource failed to load", value: 12 }] }, failPreview ? 1 : 0);
    if (url.pathname.endsWith("/alarms-histories")) return reply({ total: 40, succ: 30, list: [{ id: 99, alarmId: 42, isPushed: 1, ctime: 1792110000 }] }, 0, { current: Number(url.searchParams.get("current")), pageSize: Number(url.searchParams.get("pageSize")), total: 40 });
    if (method === "GET" && url.pathname.endsWith("/alarms")) return reply(removed ? [] : [rule], failList ? 1 : 0, { current: Number(url.searchParams.get("current")), pageSize: Number(url.searchParams.get("pageSize")), total: removed ? 0 : 42 });
    if (method === "GET" && url.pathname.endsWith("/alarms/42")) return reply(rule);
    if (method !== "GET") {
      if (failWrite) return reply(null, 1);
      if (method === "DELETE") removed = true;
      else { saved = JSON.parse(String(init?.body)); if (saved?.status) rule.status = Number(saved.status); }
      return reply();
    }
    throw new Error(`Unexpected request ${method} ${path}`);
  }));
});

async function openPage(path = "/v2/alerts/rules") {
  render(<MemoryRouter initialEntries={[path]}><AlertRulesPage /></MemoryRouter>);
  await screen.findByRole("button", { name: "真实静态资源告警" });
}
async function editor() {
  fireEvent.click(screen.getByRole("button", { name: "编辑 真实静态资源告警" }));
  const form = within(await screen.findByRole("dialog"));
  await waitFor(() => expect(form.getByRole("button", { name: "保存" })).toBeEnabled());
  return form;
}
function requests(part: string) {
  return vi.mocked(fetch).mock.calls.filter(([path]) => String(path).includes(part));
}

describe("real alert rules", () => {
  it("lists actual v1 data and server pagination without sample recommendations", async () => {
    await openPage();
    expect(screen.getByText("共 42 条")).toBeInTheDocument();
    expect(screen.getByText("生产环境 / logs / front_log")).toBeInTheDocument();
    expect(screen.queryByText("svc-auth 错误率过高")).not.toBeInTheDocument();
    expect(screen.queryByText("AI 规则建议")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    await waitFor(() => expect(requests("/api/v1/alarms?").some(([path]) => String(path).includes("current=2"))).toBe(true));
  });

  it("uses the most specific source filter and restores name/id filters from URL", async () => {
    await openPage("/v2/alerts/rules?iid=1&did=2&tid=8&status=3&name=resource&alarmId=42&current=2");
    const url = new URL(String(requests("/api/v1/alarms?")[0][0]), "http://localhost");
    expect(url.searchParams.get("tid")).toBe("8");
    expect(url.searchParams.has("iid")).toBe(false);
    expect(url.searchParams.has("did")).toBe(false);
    expect(screen.getByLabelText("搜索告警规则")).toHaveValue("resource");
    expect(screen.getByLabelText("告警 ID")).toHaveValue(42);
    fireEvent.change(screen.getByLabelText("搜索告警规则"), { target: { value: "新的名称" } });
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    await waitFor(() => expect(requests("/api/v1/alarms?").some(([path]) => new URL(String(path), "http://localhost").searchParams.get("name") === "新的名称")).toBe(true));
    expect(new URL(String(requests("/api/v1/alarms?").at(-1)![0]), "http://localhost").searchParams.get("current")).toBe("1");
  });

  it("requests a Prometheus reload only for explicit refresh", async () => {
    await openPage();
    expect(requests("isReload=1")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "刷新告警规则" }));
    await waitFor(() => expect(requests("isReload=1")).toHaveLength(1));
  });

  it("clears deep-linked table filters", async () => {
    await openPage("/v2/alerts/rules?tid=8&name=resource");
    fireEvent.click(screen.getByRole("button", { name: "重置规则筛选" }));
    await waitFor(() => {
      const url = new URL(String(requests("/api/v1/alarms?").at(-1)![0]), "http://localhost");
      expect(url.searchParams.has("tid")).toBe(false);
      expect(url.searchParams.has("name")).toBe(false);
    });
    expect(screen.getByLabelText("搜索告警规则")).toHaveValue("");
  });

  it("keeps a rule status on failed toggle", async () => {
    await openPage(); failWrite = true;
    fireEvent.click(screen.getByRole("button", { name: "暂停 真实静态资源告警" }));
    await screen.findByText("permission verification failed");
    expect(screen.getByRole("button", { name: "暂停 真实静态资源告警" })).toBeEnabled();
    expect(rule.status).toBe(3);
  });

  it("pauses and enables a rule with status-only v1 patches", async () => {
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: "暂停 真实静态资源告警" }));
    await screen.findByText("告警规则已暂停");
    expect(saved).toEqual({ status: 1 });
    fireEvent.click(await screen.findByRole("button", { name: "启用 真实静态资源告警" }));
    await screen.findByText("告警规则已启用");
    expect(saved).toEqual({ status: 2 });
  });

  it("preserves all settings when editing, without resending status or generated fields", async () => {
    await openPage(); const form = await editor();
    fireEvent.change(form.getByLabelText("告警名称"), { target: { value: "新名称" } });
    fireEvent.submit(form.getByLabelText("告警名称").closest("form")!);
    await screen.findByText("告警规则已保存");
    expect(saved).toMatchObject({ alarmName: "新名称", channelIds: [7], dutyOfficers: [9], isDisableResolve: 1, aiCooldownSeconds: 1800, tags: { env: "production" }, noDataOp: 1, filters: rule.filters });
    expect(saved).not.toHaveProperty("status");
    expect(saved).not.toHaveProperty("viewDDLs");
  });

  it("requires successful preview after changing a query and keeps a failed save draft", async () => {
    await openPage(); const form = await editor();
    fireEvent.change(form.getByLabelText("查询表达式 1"), { target: { value: "level=22" } });
    fireEvent.submit(form.getByLabelText("告警名称").closest("form")!);
    await form.findByText(/请先预览新增或修改/);
    expect(saved).toBeUndefined();
    failPreview = true;
    fireEvent.click(form.getByRole("button", { name: "预览日志" }));
    await form.findByText("permission verification failed");
    failPreview = false;
    fireEvent.click(form.getByRole("button", { name: "预览日志" }));
    await form.findByText("Resource failed to load");
    failWrite = true;
    fireEvent.submit(form.getByLabelText("告警名称").closest("form")!);
    await waitFor(() => expect(form.getAllByText("permission verification failed")).toHaveLength(1));
    expect(form.getByLabelText("查询表达式 1")).toHaveValue("level=22");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("requires both aggregation preview stages", async () => {
    await openPage(); const form = await editor();
    fireEvent.change(form.getByLabelText("查询模式 1"), { target: { value: "1" } });
    fireEvent.change(form.getByLabelText("查询表达式 1"), { target: { value: "SELECT count() FROM front_log" } });
    fireEvent.click(form.getByRole("button", { name: "预览聚合数据" }));
    await form.findByText("Resource failed to load");
    fireEvent.submit(form.getByLabelText("告警名称").closest("form")!);
    await form.findByText(/请先预览新增或修改/);
    expect(saved).toBeUndefined();
    fireEvent.click(form.getByRole("button", { name: "预览告警指标" }));
    await form.findByText("告警指标 · 1 条");
    expect(requests("alarmMode=1")).toHaveLength(1);
    expect(requests("alarmMode=2")).toHaveLength(1);
    fireEvent.submit(form.getByLabelText("告警名称").closest("form")!);
    await screen.findByText("告警规则已保存");
    expect(saved).toMatchObject({ filters: [{ mode: 1, when: "SELECT count() FROM front_log" }] });
  });

  it("saves multiple log tables with AND/OR and range thresholds", async () => {
    await openPage(); const form = await editor();
    fireEvent.click(form.getByRole("button", { name: "添加日志表" }));
    fireEvent.change(form.getByLabelText("日志表 2"), { target: { value: "9" } });
    fireEvent.change(form.getByLabelText("查询表达式 2"), { target: { value: "code=500" } });
    fireEvent.click(form.getAllByRole("button", { name: "预览日志" })[1]);
    await form.findByText("Resource failed to load");
    fireEvent.change(form.getByLabelText("比较方式 2-1"), { target: { value: "3" } });
    fireEvent.change(form.getByLabelText("阈值 2-1"), { target: { value: "5" } });
    fireEvent.change(form.getByLabelText("上限 2-1"), { target: { value: "20" } });
    fireEvent.click(form.getAllByRole("button", { name: "添加触发条件" })[1]);
    fireEvent.change(form.getByLabelText("条件连接 2-2"), { target: { value: "2" } });
    fireEvent.change(form.getByLabelText("阈值 2-2"), { target: { value: "30" } });
    fireEvent.submit(form.getByLabelText("告警名称").closest("form")!);
    await screen.findByText("告警规则已保存");
    expect(saved).toMatchObject({ filters: [rule.filters![0], { tid: 9, when: "code=500", conditions: [{ typ: 0, cond: 3, val1: 5, val2: 20 }, { typ: 2, val1: 30 }] }] });
  });

  it("deletes only after confirmation and keeps the dialog on permission failure", async () => {
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: "删除 真实静态资源告警" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "取消" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(removed).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "删除 真实静态资源告警" }));
    failWrite = true;
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "确认删除" }));
    await within(screen.getByRole("dialog")).findByText("permission verification failed");
    expect(removed).toBe(false);
    failWrite = false;
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "确认删除" }));
    await screen.findByText("告警规则已删除");
    expect(removed).toBe(true);
  });

  it("loads actual history, counts and generated SQL/rules, and opens query links in a new tab", async () => {
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: "真实静态资源告警" }));
    const detail = within(await screen.findByRole("dialog"));
    await detail.findByText("触发 40 次 · 推送成功 30 次 · 成功率 75.0%");
    expect(requests("/alarms-histories?")[0][0]).toContain("alarmId=42");
    expect(detail.getByRole("link", { name: "front_log · 查询日志" })).toHaveAttribute("target", "_blank");
    fireEvent.change(detail.getByLabelText("历史开始时间"), { target: { value: "2026-10-16T10:00" } });
    fireEvent.change(detail.getByLabelText("历史结束时间"), { target: { value: "2026-10-16T11:00" } });
    fireEvent.click(detail.getByRole("button", { name: "筛选" }));
    await waitFor(() => expect(requests("/alarms-histories?").at(-1)![0]).toContain("startTime="));
    fireEvent.click(detail.getByRole("button", { name: "下一页" }));
    await waitFor(() => expect(requests("/alarms-histories?").at(-1)![0]).toContain("current=2"));
    fireEvent.click(detail.getByRole("tab", { name: "物化视图" }));
    await detail.findByText("CREATE MATERIALIZED VIEW cv_alert AS SELECT 1");
    fireEvent.click(detail.getByRole("tab", { name: "Prometheus 规则" }));
    await detail.findByText(/groups:/);
  });

  it("shows an API permission error instead of sample data and supports retry", async () => {
    failList = true;
    render(<MemoryRouter><AlertRulesPage /></MemoryRouter>);
    await screen.findByRole("alert");
    expect(screen.queryByText("svc-auth 错误率过高")).not.toBeInTheDocument();
    failList = false;
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    await screen.findByRole("button", { name: "真实静态资源告警" });
  });

  it("creates a rule through v1 using all configured fields", async () => {
    render(<AlertRuleEditor onClose={vi.fn()} onSaved={vi.fn()} />);
    const form = within(await screen.findByRole("dialog"));
    await waitFor(() => expect(form.getByRole("button", { name: "保存" })).toBeEnabled());
    expect(form.getByRole("link", { name: "新建告警渠道" })).toHaveAttribute("target", "_blank");
    fireEvent.change(form.getByLabelText("告警名称"), { target: { value: "新告警" } });
    fireEvent.click(form.getByRole("combobox", { name: "告警渠道" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "生产渠道" }));
    fireEvent.click(form.getByRole("button", { name: "添加日志表" }));
    fireEvent.change(form.getByLabelText("日志表 1"), { target: { value: "8" } });
    fireEvent.click(form.getByRole("button", { name: "预览日志" }));
    await form.findByText("Resource failed to load");
    fireEvent.submit(form.getByLabelText("告警名称").closest("form")!);
    await waitFor(() => expect(saved?.alarmName).toBe("新告警"));
    expect(requests("/api/v1/alarms").some(([, init]) => init?.method === "POST")).toBe(true);
  });

  it("keeps deployment prefixes and encodes complete query expressions", () => {
    window.history.replaceState({}, "", "/clickvisual/v2/alerts/rules");
    const href = alarmQueryHref({ ...rule.filters![0], when: "message='a&b'" });
    expect(href).toMatch(/^\/clickvisual\/v2\/query\?/);
    expect(new URL(href, "http://localhost").searchParams.get("query")).toBe("message='a&b'");
    expect(alarmDraft(rule).tags).toEqual({ env: "production" });
    window.history.replaceState({}, "", "/");
  });
});
