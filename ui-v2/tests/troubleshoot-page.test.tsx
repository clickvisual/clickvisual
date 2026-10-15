import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import TroubleshootPage from "../src/domains/troubleshoot/pages/TroubleshootPage";

function renderTroubleshoot(path = "/troubleshoot") {
  const router = createMemoryRouter(
    [
      { path: "/troubleshoot", element: <TroubleshootPage /> },
      { path: "/troubleshoot/share/:token", element: <TroubleshootPage /> }
    ],
    { initialEntries: [path] }
  );
  return { ...render(<RouterProvider router={router} />), router };
}

describe("troubleshoot conversation", () => {
  it("shows history on the left by default without a conversation toolbar", async () => {
    renderTroubleshoot();
    await screen.findByText("有什么日志问题？");
    const side = screen.getByRole("complementary", { name: "排查记录" });
    expect(within(side).getByRole("button", { name: "新对话" })).toBeInTheDocument();
    expect(within(side).getByRole("searchbox", { name: "搜索历史记录" })).toBeInTheDocument();
    expect(within(side).getByRole("button", { name: "复制分享链接" })).toBeDisabled();
    expect(document.querySelector(".cv-troubleshoot-header")).toBeNull();
    expect(side.compareDocumentPosition(screen.getByLabelText("现象")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(side).getByRole("searchbox")).not.toHaveFocus();
  });

  it("keeps mobile history closed, traps drawer focus, and restores focus after Escape", async () => {
    const media = window.matchMedia("(max-width: 760px)");
    vi.mocked(window.matchMedia).mockReturnValue({ ...media, matches: true });
    renderTroubleshoot();
    await screen.findByText("有什么日志问题？");
    expect(screen.queryByRole("complementary", { name: "排查记录" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "历史记录" }));
    const history = within(screen.getByRole("complementary", { name: "排查记录" }));
    const search = history.getByRole("searchbox", { name: "搜索历史记录" });
    expect(search).toHaveFocus();
    fireEvent.keyDown(search, { key: "Tab" });
    expect(history.getByRole("button", { name: "新对话" })).toHaveFocus();
    fireEvent.keyDown(history.getByRole("button", { name: "新对话" }), { key: "Tab", shiftKey: true });
    expect(search).toHaveFocus();
    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.queryByRole("complementary", { name: "排查记录" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "历史记录" })).toHaveFocus();
  });

  it("records new conversation IDs, restores URLs, and clears the ID for a new conversation", async () => {
    const { router, unmount } = renderTroubleshoot("/troubleshoot?source=home");
    await screen.findByText("有什么日志问题？");
    fireEvent.change(screen.getByLabelText("现象"), { target: { value: "gateway timeout abc" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await screen.findByText("最近 15 分钟没有匹配日志。");
    await waitFor(() => expect(new URLSearchParams(router.state.location.search).get("sessionId")).toBe("1"));
    expect(new URLSearchParams(router.state.location.search).get("source")).toBe("home");

    const savedPath = router.state.location.pathname + router.state.location.search;
    unmount();
    const restored = renderTroubleshoot(savedPath);
    expect(await screen.findByRole("heading", { name: "gateway timeout abc", exact: true })).toBeInTheDocument();
    expect(await screen.findByText("最近 15 分钟没有匹配日志。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "新对话" }));
    await screen.findByText("有什么日志问题？");
    expect(restored.router.state.location.search).toBe("?source=home");
    const blankPath = restored.router.state.location.pathname + restored.router.state.location.search;
    restored.unmount();
    renderTroubleshoot(blankPath);
    expect(await screen.findByText("有什么日志问题？")).toBeInTheDocument();
    expect(screen.queryByText("最近 15 分钟没有匹配日志。")).not.toBeInTheDocument();
  });

  it("loads a requested session even when it is absent from the history list", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const path = new URL(String(input), "http://localhost").pathname;
      return new Response(JSON.stringify({ code: 0, data: path.endsWith("/37")
        ? { id: 37, title: "指定的对话", status: "idle", messages: [{ id: 1, role: "assistant", kind: "final", text: "保存的分析内容" }] }
        : [] }));
    });
    renderTroubleshoot("/troubleshoot?sessionId=37");
    expect(await screen.findByText("保存的分析内容")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/v2/troubleshoot/sessions/37", expect.anything());
  });

  it("keeps the conversation in sync with history selection and browser navigation", async () => {
    const { router } = renderTroubleshoot();
    await screen.findByText("有什么日志问题？");
    for (const text of ["gateway timeout", "svc-auth error"]) {
      fireEvent.change(screen.getByLabelText("现象"), { target: { value: text } });
      fireEvent.click(screen.getByRole("button", { name: "发送" }));
      await screen.findByText("最近 15 分钟没有匹配日志。");
      fireEvent.click(screen.getByRole("button", { name: "新对话" }));
      await screen.findByText("有什么日志问题？");
    }
    fireEvent.click(screen.getByRole("button", { name: "gateway timeout", exact: true }));
    await screen.findByRole("heading", { name: "gateway timeout", exact: true });
    expect(router.state.location.search).toBe("?sessionId=1");
    fireEvent.click(screen.getByRole("button", { name: "svc-auth error", exact: true }));
    await screen.findByRole("heading", { name: "svc-auth error", exact: true });
    expect(router.state.location.search).toBe("?sessionId=2");
    await act(async () => { await router.navigate(-1); });
    await screen.findByRole("heading", { name: "gateway timeout", exact: true });
    await act(async () => { await router.navigate(1); });
    await screen.findByRole("heading", { name: "svc-auth error", exact: true });
  });

  it.each(["0", "-1", "abc", "1.5", "9007199254740992"])("rejects an invalid session ID %s", async (id) => {
    renderTroubleshoot(`/troubleshoot?sessionId=${id}`);
    expect(await screen.findByRole("status")).toHaveTextContent("对话 ID 无效");
    expect(vi.mocked(fetch).mock.calls.some(([input]) => /\/sessions\//.test(String(input)))).toBe(false);
  });

  it("ignores a previous session load after navigating to a new conversation", async () => {
    let resolveSession!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).endsWith("/37")) return new Promise<Response>((resolve) => { resolveSession = resolve; });
      return new Response(JSON.stringify({ code: 0, data: [] }));
    });
    const { router } = renderTroubleshoot("/troubleshoot?sessionId=37");
    await waitFor(() => expect(resolveSession).toBeTypeOf("function"));
    await act(async () => { await router.navigate("/troubleshoot"); });
    await screen.findByText("有什么日志问题？");
    await act(async () => {
      resolveSession(new Response(JSON.stringify({ code: 0, data: {
        id: 37, title: "旧对话", status: "idle", messages: [{ id: 1, role: "assistant", kind: "final", text: "旧请求的回复" }]
      } })));
    });
    expect(screen.queryByText("旧请求的回复")).not.toBeInTheDocument();
    expect(router.state.location.search).toBe("");
  });

  it("does not change the URL when an answer arrives after leaving Ask", async () => {
    const originalFetch = vi.mocked(fetch).getMockImplementation()!;
    let resolveSession!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (init?.method === "POST") return new Promise<Response>((resolve) => { resolveSession = resolve; });
      return originalFetch(input, init);
    });
    const { router } = renderTroubleshoot();
    await screen.findByText("有什么日志问题？");
    fireEvent.change(screen.getByLabelText("现象"), { target: { value: "慢查询" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(resolveSession).toBeTypeOf("function"));
    await act(async () => { await router.navigate("/troubleshoot/share/demo"); });
    await screen.findByText("最近 15 分钟有 3 条超时。");
    await act(async () => {
      resolveSession(new Response(JSON.stringify({ code: 0, data: {
        id: 37, title: "慢查询", status: "idle", messages: [{ id: 1, role: "assistant", kind: "final", text: "延迟的回复" }]
      } })));
    });
    expect(router.state.location.pathname).toBe("/troubleshoot/share/demo");
    expect(router.state.location.search).toBe("");
    expect(screen.queryByText("延迟的回复")).not.toBeInTheDocument();
  });

  it("formats assistant answers as Markdown and keeps user messages literal", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      code: 0,
      data: {
        id: 9, title: "耗时分析", status: "idle",
        messages: [
          { id: 1, role: "user", kind: "text", text: "查一下 **queueUpDuration**" },
          {
            id: 2, role: "assistant", kind: "final",
            text: "### 耗时结论\n\n主要耗时在 **排队阶段**。\n\n- 检查 `queueUpDuration`\n- 保留日志证据\n\n| 字段 | 耗时 |\n| --- | --- |\n| queueUpDuration | 89.9 |\n\n[查询来源](https://example.com/logs)\n\n```sql\nSELECT duration FROM logs\n```"
          }
        ]
      }
    })));
    renderTroubleshoot("/troubleshoot/share/demo");

    const heading = await screen.findByRole("heading", { name: "耗时结论" });
    const answer = heading.closest("article")!;
    expect(within(answer).getByText("排队阶段").tagName).toBe("STRONG");
    expect(within(answer).getAllByRole("listitem")).toHaveLength(2);
    expect(within(answer).getByRole("table")).toHaveTextContent("queueUpDuration");
    expect(answer.querySelector("pre")).toHaveTextContent("SELECT duration FROM logs");
    const source = within(answer).getByRole("link", { name: /^查询来源/ });
    expect(source).toHaveAttribute("href", "https://example.com/logs");
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByText("查一下 **queueUpDuration**")).toBeInTheDocument();
  });

  it("does not execute HTML or unsafe links in model answers", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      code: 0,
      data: {
        id: 9, title: "日志分析", status: "idle",
        messages: [{
          id: 1, role: "assistant", kind: "final",
          text: '分析结果\n\n<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[异常链接](javascript:alert(1))'
        }]
      }
    })));
    renderTroubleshoot("/troubleshoot/share/demo");

    const answer = (await screen.findByText("分析结果")).closest("article")!;
    expect(answer.querySelector("script, [onerror]")).toBeNull();
    expect(answer.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it("shows only the conversation and attaches the query link to the answer", async () => {
    renderTroubleshoot();

    expect(await screen.findByRole("heading", { name: "日志排查", exact: true })).toBeInTheDocument();
    expect(await screen.findByText("有什么日志问题？")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("现象"), { target: { value: "gateway timeout abc" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    const answer = await screen.findByText("最近 15 分钟没有匹配日志。");
    expect(screen.queryByText("找到 1 张日志表")).not.toBeInTheDocument();
    expect(document.querySelector("details")).not.toBeInTheDocument();
    expect(within(answer.closest("article")!).getByRole("link", { name: "在查询页打开" })).toHaveAttribute(
      "href",
      "/v2/query?instanceId=1&database=pro_log&table=ego_stdout&tableId=7&query=trace_id+%3D+%27abc%27&st=100&et=200"
    );
    expect(screen.getByRole("button", { name: /gateway timeout abc/ })).toBeInTheDocument();
  });

  it("asks before a window longer than 6 hours and runs after confirmation", async () => {
    renderTroubleshoot();
    expect(await screen.findByText("有什么日志问题？")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("现象"), { target: { value: "最近 12 小时的错误" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findAllByText(/时间范围超过 6 小时/)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "确认并查询" }));

    expect(await screen.findByText("这 12 小时里有 3 条错误。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "确认并查询" })).not.toBeInTheDocument();
  });

  it("keeps the draft when the API returns an empty success", async () => {
    renderTroubleshoot();
    expect(await screen.findByText("有什么日志问题？")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("现象"), { target: { value: "坏响应" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByText("排障接口没有返回对话")).toBeInTheDocument();
    expect(screen.getByLabelText("现象")).toHaveValue("坏响应");
    expect(screen.getByText("有什么日志问题？")).toBeInTheDocument();
  });

  it("fills an example without sending and keeps Chinese composition from submitting", async () => {
    renderTroubleshoot();
    const example = await screen.findByRole("button", { name: /gateway 最近 15 分钟的 timeout/ });
    fireEvent.click(example);
    const draft = screen.getByLabelText("现象");
    expect(draft).toHaveValue("gateway 最近 15 分钟的 timeout 有哪些？");
    fireEvent.keyDown(draft, { key: "Enter", keyCode: 229, isComposing: true });
    expect(draft).toHaveValue("gateway 最近 15 分钟的 timeout 有哪些？");
    expect(screen.getByText("有什么日志问题？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("最近 15 分钟没有匹配日志。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "新对话" }));
    expect(screen.getByText("有什么日志问题？")).toBeInTheDocument();
    expect(draft).toHaveValue("");
  });

  it("searches history, preserves selection, and opens a previous conversation", async () => {
    renderTroubleshoot();
    await screen.findByText("有什么日志问题？");
    fireEvent.change(screen.getByLabelText("现象"), { target: { value: "gateway timeout abc" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await screen.findByText("最近 15 分钟没有匹配日志。");
    fireEvent.click(screen.getByRole("button", { name: "新对话" }));
    fireEvent.change(screen.getByLabelText("现象"), { target: { value: "svc-auth 最近 1 小时的错误" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await screen.findByText("最近 15 分钟没有匹配日志。");

    const history = within(screen.getByRole("complementary", { name: "排查记录" }));
    const search = history.getByRole("searchbox", { name: "搜索历史记录" });
    fireEvent.focus(search);
    expect(history.getByRole("button", { name: "svc-auth 最近 1 小时的错误" })).toHaveAttribute("aria-current", "true");
    fireEvent.change(search, { target: { value: "GATEWAY" } });
    expect(history.queryByRole("button", { name: "svc-auth 最近 1 小时的错误" })).not.toBeInTheDocument();
    expect(history.getByRole("button", { name: "gateway timeout abc" })).toHaveAttribute("title", "gateway timeout abc");
    fireEvent.change(search, { target: { value: "不存在的服务" } });
    expect(history.getByText("没有匹配的对话")).toBeInTheDocument();
    fireEvent.click(history.getByRole("button", { name: "清空搜索" }));
    expect(search).toHaveValue("");
    fireEvent.click(history.getByRole("button", { name: "gateway timeout abc" }));
    await screen.findByRole("heading", { name: "gateway timeout abc", exact: true });
    expect(screen.getByRole("complementary", { name: "排查记录" })).toBeInTheDocument();
    expect(history.getByRole("button", { name: "gateway timeout abc" })).toHaveAttribute("aria-current", "true");
  });

  it("closes history with Escape and returns focus to its trigger", async () => {
    renderTroubleshoot();
    await screen.findByText("有什么日志问题？");
    fireEvent.click(screen.getByRole("button", { name: "收起历史记录" }));
    const trigger = screen.getByRole("button", { name: "历史记录" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "搜索历史记录" }), { key: "Escape" });
    expect(screen.queryByRole("complementary", { name: "排查记录" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "历史记录" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "历史记录" })).toHaveFocus();
  });

  it("renders a shared transcript without the composer", async () => {
    renderTroubleshoot("/troubleshoot/share/demo");

    expect(await screen.findByText("最近 15 分钟有 3 条超时。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "在查询页打开" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "发送" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "新对话" })).not.toBeInTheDocument();
  });

  it("hides tool results and internal actions in shared conversations without duplicating links", async () => {
    const link = { tid: 7, query: "level = 'error'", st: 100, et: 200 };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      code: 0,
      data: {
        id: 9, title: "超时排查", status: "idle",
        messages: [
          { id: 1, role: "user", kind: "text", text: "查一下超时" },
          { id: 2, role: "assistant", kind: "tool", text: '{"action":"tool"}' },
          { id: 3, role: "tool", kind: "tool", summary: "查询返回 3 条", detail: "internal SQL result", link },
          {
            id: 4, role: "assistant", kind: "final", text: "发现 3 条超时。", link,
            result: { count: 3, preview: '1. {"time":"10:15:00","trace_id":"trace-123","message":"upstream timeout after 3000ms"}' }
          }
        ]
      }
    })));
    renderTroubleshoot("/troubleshoot/share/demo");

    const answer = await screen.findByText("发现 3 条超时。");
    expect(screen.getByText("查一下超时")).toBeInTheDocument();
    expect(screen.queryByText("查询返回 3 条")).not.toBeInTheDocument();
    expect(screen.queryByText("internal SQL result")).not.toBeInTheDocument();
    expect(screen.queryByText('{"action":"tool"}')).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "在查询页打开" })).toHaveLength(1);
    const logs = screen.getByRole("region", { name: "日志内容" });
    expect(logs).toHaveTextContent("upstream timeout after 3000ms");
    expect(logs).toHaveTextContent("trace-123");
    expect(answer.closest("article")).toContainElement(logs);
    expect(within(answer.closest("article")!).getByRole("link", { name: "在查询页打开" })).toHaveAttribute(
      "href", "/v2/query?tableId=7&query=level+%3D+%27error%27&st=100&et=200"
    );
  });
});
