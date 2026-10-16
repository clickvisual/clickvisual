import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AlertChannelsPage from "../src/domains/alert/pages/AlertChannelsPage";
import type { SettingsAlarmChannel } from "../src/domains/settings/api/settings";

let channels: SettingsAlarmChannel[];
let failList = false;
let failSave = false;
let failTest = false;

beforeEach(() => {
  failList = failSave = failTest = false;
  channels = [
    { id: 1, name: "生产告警", key: "https://oapi.dingtalk.com/robot/send?access_token=secret", typ: 1, uid: 1 },
    { id: 2, name: "飞书告警", key: "https://open.feishu.cn/open-apis/bot/v2/hook/test", typ: 3, uid: 1, aiAnalysisEnabled: false }
  ];
  vi.stubGlobal("fetch", vi.fn(async (path: string, init?: RequestInit) => {
    const method = init?.method || "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const reply = (data: unknown = null, code = 0) => ({ ok: true, text: async () => JSON.stringify({ code, msg: code ? "接口暂不可用" : "succ", data }) });
    if (path.endsWith("/send-test")) return reply(null, failTest ? 1 : 0);
    const id = Number(path.split("/").pop());
    if (method === "GET") return failList ? reply(null, 1) : reply(id ? channels.find((channel) => channel.id === id) : channels);
    if (failSave) return reply(null, 1);
    if (method === "POST") channels.push({ ...body, id: 3, uid: 1 });
    if (method === "PATCH") channels = channels.map((channel) => channel.id === id ? { ...channel, ...body } : channel);
    if (method === "DELETE") channels = channels.filter((channel) => channel.id !== id);
    return reply();
  }));
});

async function openPage() {
  render(<MemoryRouter><AlertChannelsPage /></MemoryRouter>);
  await screen.findByRole("switch", { name: "生产告警 AI 分析" });
}

describe("alert channel configuration", () => {
  it("lists channels with legacy defaults, hides URL keys and filters by name and type", async () => {
    await openPage();
    expect(screen.getByRole("switch", { name: "生产告警 AI 分析" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "飞书告警 AI 分析" })).not.toBeChecked();
    expect(screen.getByText("oapi.dingtalk.com")).toBeInTheDocument();
    expect(screen.queryByText(/access_token=secret/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "筛选渠道类型" }), { target: { value: "3" } });
    expect(screen.queryByRole("switch", { name: "生产告警 AI 分析" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing" } });
    expect(screen.getByText("没有匹配的告警渠道")).toBeInTheDocument();
  });

  it.each([1, 2, 3, 4, 5, 6])("creates and tests channel type %i with AI disabled", async (typ) => {
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: "新建渠道" }));
    const form = within(screen.getByRole("dialog"));
    fireEvent.change(form.getByLabelText("渠道名称"), { target: { value: " 新渠道 " } });
    fireEvent.change(form.getByLabelText("渠道类型"), { target: { value: String(typ) } });
    fireEvent.change(form.getByLabelText("URL / Key"), { target: { value: " https://example.test/webhook " } });
    fireEvent.click(form.getByRole("switch", { name: "AI 分析" }));
    fireEvent.click(form.getByRole("button", { name: "测试发送" }));
    await screen.findByText("测试消息已发送");
    expect(fetch).toHaveBeenCalledWith("/api/v2/base/settings/alarm-channels/send-test", expect.objectContaining({
      method: "POST", body: JSON.stringify({ name: "新渠道", typ, key: "https://example.test/webhook", aiAnalysisEnabled: false })
    }));
    fireEvent.submit(form.getByLabelText("渠道名称").closest("form")!);
    await screen.findByText("告警渠道已保存");
    expect(channels.find((channel) => channel.id === 3)).toMatchObject({ name: "新渠道", typ, aiAnalysisEnabled: false });
    expect(await screen.findByRole("switch", { name: "新渠道 AI 分析" })).not.toBeChecked();
  });

  it("edits without resetting a disabled switch, then toggles it persistently", async () => {
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: "编辑 飞书告警" }));
    const form = within(await screen.findByRole("dialog"));
    expect(form.getByRole("switch", { name: "AI 分析" })).not.toBeChecked();
    fireEvent.change(form.getByLabelText("渠道名称"), { target: { value: "飞书更新" } });
    fireEvent.submit(form.getByLabelText("渠道名称").closest("form")!);
    fireEvent.click(await screen.findByRole("switch", { name: "飞书更新 AI 分析" }));
    await screen.findByText("AI 分析已开启");
    expect(channels.find((channel) => channel.id === 2)).toMatchObject({ typ: 3, key: "https://open.feishu.cn/open-apis/bot/v2/hook/test", aiAnalysisEnabled: true });
    fireEvent.click(screen.getByRole("button", { name: "刷新告警渠道" }));
    expect(await screen.findByRole("switch", { name: "飞书更新 AI 分析" })).toBeChecked();
  });

  it("keeps the prior switch value on a failed save", async () => {
    await openPage();
    failSave = true;
    fireEvent.click(screen.getByRole("switch", { name: "生产告警 AI 分析" }));
    await screen.findByText("接口暂不可用");
    expect(screen.getByRole("switch", { name: "生产告警 AI 分析" })).toBeChecked();
  });

  it("shows save and test errors in the editor and preserves the draft", async () => {
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: "编辑 飞书告警" }));
    const form = within(await screen.findByRole("dialog"));
    failTest = true;
    fireEvent.click(form.getByRole("button", { name: "测试发送" }));
    await form.findByRole("alert");
    expect(form.getByLabelText("渠道名称")).toHaveValue("飞书告警");
    failSave = true;
    fireEvent.submit(form.getByLabelText("渠道名称").closest("form")!);
    await form.findByRole("alert");
    expect(form.getByRole("switch", { name: "AI 分析" })).not.toBeChecked();
  });

  it("deletes only after confirmation and supports cancellation", async () => {
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: "删除 生产告警" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "取消" }));
    expect(channels).toHaveLength(2);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "删除 生产告警" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "确认删除" }));
    await screen.findByText("告警渠道已删除");
    expect(channels).toHaveLength(1);
    expect(screen.queryByRole("switch", { name: "生产告警 AI 分析" })).not.toBeInTheDocument();
  });

  it("supports a failed load followed by retry and a real empty list", async () => {
    failList = true;
    render(<MemoryRouter><AlertChannelsPage /></MemoryRouter>);
    await screen.findByRole("alert");
    failList = false;
    channels = [];
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(await screen.findByText("暂无告警渠道")).toBeInTheDocument();
  });
});
