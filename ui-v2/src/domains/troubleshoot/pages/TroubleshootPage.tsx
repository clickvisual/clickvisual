import { useEffect, useRef, useState } from "react";
import { EuiIcon, EuiMarkdownFormat, getDefaultEuiMarkdownProcessingPlugins } from "@elastic/eui";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getV2BasePath } from "../../../shared/layout/VersionSwitcher";
import {
  confirmTroubleshoot,
  getSharedTroubleshoot,
  getTroubleshootSession,
  listTroubleshootSessions,
  replyTroubleshoot,
  shareTroubleshoot,
  startTroubleshoot,
  troubleshootQueryHref,
  type TroubleshootMessage,
  type TroubleshootSession
} from "../api/troubleshoot";

function sessionSummary(session: TroubleshootSession): TroubleshootSession {
  return {
    id: session.id,
    title: session.title,
    status: session.status,
    shareToken: session.shareToken,
    updatedAt: session.updatedAt,
    pending: session.pending
  };
}

function upsertSession(list: TroubleshootSession[], session: TroubleshootSession) {
  const summary = sessionSummary(session);
  const rest = list.filter((item) => item.id !== session.id);
  return [summary, ...rest];
}

const examples = [
  "gateway 最近 15 分钟的 timeout 有哪些？",
  "帮我追踪 trace_id 对应的请求链路",
  "最近 1 小时哪个服务的错误最多？",
  "这批日志主要耗时在哪里？",
  "帮我分析最近的 warning 日志",
  "展开这次查询的具体日志"
];

const markdownProcessingPlugins = getDefaultEuiMarkdownProcessingPlugins({
  linkProps: { target: "_blank", rel: "noopener noreferrer" }
});

function sessionTime(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  return {
    dateTime: date.toISOString(),
    label: date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
  };
}

function QueryLink({ message }: { message: TroubleshootMessage }) {
  if (!message.link?.tid) return null;
  return (
    <footer className="cv-troubleshoot-sources">
      <Link className="cv-troubleshoot-query-link" to={troubleshootQueryHref(message.link)}>
        在查询页打开
        <EuiIcon type="arrowRight" size="s" aria-hidden="true" />
      </Link>
    </footer>
  );
}

function MessageItem({ message }: { message: TroubleshootMessage }) {
  const mine = message.role === "user";
  return (
    <article className={`cv-troubleshoot-bubble cv-troubleshoot-bubble--${mine ? "user" : "assistant"}`}>
      {mine ? <p>{message.text}</p> : (
        <EuiMarkdownFormat className="cv-troubleshoot-markdown" textSize="relative" color="inherit" processingPluginList={markdownProcessingPlugins}>
          {message.text}
        </EuiMarkdownFormat>
      )}
      {!mine && message.result && message.result.count > 0 && message.result.preview ? (
        <section className="cv-troubleshoot-log-result" aria-label="日志内容">
          <div className="cv-troubleshoot-log-result-label">日志样本</div>
          <pre>{message.result.preview}</pre>
        </section>
      ) : null}
      <QueryLink message={message} />
    </article>
  );
}

export default function TroubleshootPage() {
  const params = useParams<{ token?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdParam = searchParams.get("sessionId");
  const shareToken = params.token || "";
  const shareMode = Boolean(shareToken);
  const [sessions, setSessions] = useState<TroubleshootSession[]>([]);
  const [active, setActive] = useState<TroubleshootSession | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(() => !window.matchMedia("(max-width: 760px)").matches);
  const [historySearch, setHistorySearch] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const historyTriggerRef = useRef<HTMLButtonElement>(null);
  const historySearchRef = useRef<HTMLInputElement>(null);
  const historySideRef = useRef<HTMLElement>(null);
  const previousHistoryOpen = useRef(historyOpen);
  const savedSessionRef = useRef<TroubleshootSession | null>(null);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const updateHistory = (event: MediaQueryListEvent) => setHistoryOpen(!event.matches);
    media.addEventListener("change", updateHistory);
    return () => media.removeEventListener("change", updateHistory);
  }, []);

  function setSessionUrl(id: number | null, replace = false) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (id === null) next.delete("sessionId");
      else next.set("sessionId", String(id));
      return next;
    }, { replace });
  }

  useEffect(() => {
    if (previousHistoryOpen.current !== historyOpen) {
      if (historyOpen) historySearchRef.current?.focus();
      else historyTriggerRef.current?.focus();
    }
    previousHistoryOpen.current = historyOpen;
  }, [historyOpen]);

  function dismissMobileHistory() {
    if (window.matchMedia("(max-width: 760px)").matches) setHistoryOpen(false);
  }

  function closeHistory() {
    setHistoryOpen(false);
  }

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Ask · ClickVisual";
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    const textarea = draftRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [draft]);

  function newConversation() {
    savedSessionRef.current = null;
    setSessionUrl(null);
    setActive(null);
    setDraft("");
    dismissMobileHistory();
    setHistorySearch("");
    draftRef.current?.focus();
  }

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [active?.messages, active?.pending, sending]);

  useEffect(() => {
    let cancelled = false;
    if (shareMode) return;
    void listTroubleshootSessions().then((list) => {
      if (!cancelled) setSessions((current) => {
        const known = new Set(current.map((session) => session.id));
        return [...current, ...list.filter((session) => !known.has(session.id))];
      });
    }).catch((error) => {
      if (!cancelled) setNotice(error instanceof Error ? error.message : "加载历史记录失败");
    });
    return () => { cancelled = true; };
  }, [shareMode]);

  useEffect(() => {
    let cancelled = false;
    requestVersionRef.current += 1;
    async function load() {
      setLoading(true);
      setSending(false);
      setDraft("");
      dismissMobileHistory();
      setActive(null);
      try {
        if (shareToken) {
          const session = await getSharedTroubleshoot(shareToken);
          if (!cancelled) setActive(session);
          return;
        }
        if (sessionIdParam !== null) {
          const id = Number(sessionIdParam);
          if (!/^[1-9]\d*$/.test(sessionIdParam) || !Number.isSafeInteger(id)) {
            throw new Error("对话 ID 无效");
          }
          // Reuse the response when creating a conversation adds its ID to the URL.
          const saved = savedSessionRef.current;
          savedSessionRef.current = null;
          const session = saved?.id === id ? saved : await getTroubleshootSession(id);
          if (!cancelled) setActive(session);
        }
      } catch (error) {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      requestVersionRef.current += 1;
    };
  }, [shareToken, sessionIdParam]);

  function openSession(id: number) {
    setDraft("");
    dismissMobileHistory();
    setSessionUrl(id);
  }

  async function sendMessage() {
    const text = draft.trim();
    const current = active;
    if (!text || loading || sending || shareMode || current?.status === "waiting_confirm") return;
    const version = requestVersionRef.current;
    const optimistic: TroubleshootSession = {
      id: current?.id || 0,
      title: current?.title || text.slice(0, 32),
      status: "idle",
      messages: [...(current?.messages || []), { id: -Date.now(), role: "user", kind: "text", text }]
    };
    setDraft("");
    setActive(optimistic);
    setSending(true);
    try {
      const session = current?.id ? await replyTroubleshoot(current.id, text) : await startTroubleshoot(text);
      if (version !== requestVersionRef.current) return;
      setActive(session);
      setSessions((list) => upsertSession(list, session));
      if (!current?.id) {
        savedSessionRef.current = session;
        setSessionUrl(session.id, true);
      }
    } catch (error) {
      if (version !== requestVersionRef.current) return;
      setActive(current);
      setDraft(text);
      setNotice(error instanceof Error ? error.message : "发送失败");
    } finally {
      if (version === requestVersionRef.current) setSending(false);
    }
  }

  async function confirm(accept: boolean) {
    if (!active || sending) return;
    const version = requestVersionRef.current;
    setSending(true);
    try {
      const session = await confirmTroubleshoot(active.id, accept);
      if (version !== requestVersionRef.current) return;
      setActive(session);
      setSessions((current) => upsertSession(current, session));
    } catch (error) {
      if (version !== requestVersionRef.current) return;
      setNotice(error instanceof Error ? error.message : "确认失败");
    } finally {
      if (version === requestVersionRef.current) setSending(false);
    }
  }

  async function copyShareLink() {
    if (!active) return;
    try {
      const { token } = await shareTroubleshoot(active.id);
      const href = `${window.location.origin}${getV2BasePath()}/v2/ask/share/${token}`;
      await navigator.clipboard.writeText(href);
      setActive({ ...active, shareToken: token });
      setNotice("分享链接已复制");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "复制失败");
    }
  }

  const messages = (active?.messages || []).filter((message) =>
    message.role === "user" || (message.role === "assistant" && message.kind !== "tool")
  );
  const waiting = active?.status === "waiting_confirm" && active.pending;
  const searchTerm = historySearch.trim().toLocaleLowerCase();
  const filteredSessions = sessions.filter((session) => (session.title || "未命名").toLocaleLowerCase().includes(searchTerm));

  return (
    <section className="cv-page cv-troubleshoot-page" onKeyDown={(event) => {
      if (historyOpen && event.key === "Escape") {
        event.preventDefault();
        closeHistory();
      }
      if (historyOpen && event.key === "Tab" && window.matchMedia("(max-width: 760px)").matches) {
        const controls = historySideRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }}>
      <h1 className="cv-sr-only">{active?.title || "日志排查"}</h1>
      <div className={`cv-troubleshoot${shareMode ? " cv-troubleshoot--shared" : historyOpen ? " cv-troubleshoot--history" : " cv-troubleshoot--collapsed"}`}>
        {!shareMode && !historyOpen ? (
          <div className="cv-troubleshoot-rail">
            <button ref={historyTriggerRef} type="button" className="cv-troubleshoot-icon-button" title="展开历史记录" aria-label="历史记录" aria-expanded={false} aria-controls="ask-history" onClick={() => setHistoryOpen(true)}>
              <EuiIcon type="menuLeft" size="m" aria-hidden="true" />
            </button>
            <button type="button" className="cv-troubleshoot-icon-button" title="新对话" aria-label="新对话" onClick={newConversation} disabled={sending || loading}>
              <EuiIcon type="plus" size="m" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {!shareMode && historyOpen ? (
          <button type="button" className="cv-troubleshoot-history-backdrop" aria-label="关闭历史记录" tabIndex={-1} onClick={closeHistory} />
        ) : null}
        {!shareMode && historyOpen ? (
          <aside ref={historySideRef} id="ask-history" className="cv-troubleshoot-side" aria-label="排查记录">
            <div className="cv-troubleshoot-side-actions">
              <button type="button" className="cv-troubleshoot-new" onClick={newConversation} disabled={sending || loading}>
                <EuiIcon type="plus" size="m" aria-hidden="true" />新对话
              </button>
              <button type="button" className="cv-troubleshoot-icon-button" title="收起历史记录" aria-label="收起历史记录" aria-expanded={true} aria-controls="ask-history" onClick={closeHistory}>
                <EuiIcon type="menuLeft" size="m" aria-hidden="true" />
              </button>
            </div>
            <div className="cv-troubleshoot-history-heading">
              <h2>历史记录</h2>
              <span className="cv-troubleshoot-history-count" aria-label={`${filteredSessions.length} 个对话`}>{searchTerm ? `${filteredSessions.length} / ${sessions.length}` : sessions.length}</span>
            </div>
            <div className="cv-troubleshoot-history-search">
              <EuiIcon type="search" size="s" aria-hidden="true" />
              <input ref={historySearchRef} type="search" aria-label="搜索历史记录" placeholder="搜索对话" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} />
              {historySearch ? (
                <button type="button" className="cv-troubleshoot-icon-button" aria-label="清空搜索" title="清空搜索" onClick={() => { setHistorySearch(""); historySearchRef.current?.focus(); }}>
                  <EuiIcon type="cross" size="s" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="cv-troubleshoot-history-list">
              {filteredSessions.length === 0 ? (
                <p className="cv-troubleshoot-history-empty">{sessions.length === 0 ? "暂无对话" : "没有匹配的对话"}</p>
              ) : (
                <ol className="cv-troubleshoot-sessions">
                  {filteredSessions.map((session) => {
                    const updated = sessionTime(session.updatedAt);
                    const title = session.title || "未命名";
                    return (
                      <li key={session.id}>
                        <button
                          type="button"
                          className={session.id === active?.id ? "is-active" : undefined}
                          disabled={sending}
                          aria-label={title}
                          title={title}
                          aria-current={session.id === active?.id ? "true" : undefined}
                          onClick={() => void openSession(session.id)}
                        >
                          <EuiIcon type="editorAlignLeft" size="s" aria-hidden="true" />
                          <span className="cv-troubleshoot-session-copy">
                            <span className="cv-troubleshoot-session-title">{title}</span>
                            <span className="cv-troubleshoot-session-meta">
                              {updated ? <time dateTime={updated.dateTime}>{updated.label}</time> : null}
                              {session.status === "waiting_confirm" ? <em>待确认</em> : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
            <div className="cv-troubleshoot-side-footer">
              <button type="button" className="cv-troubleshoot-share" title="复制分享链接" aria-label="复制分享链接" onClick={() => void copyShareLink()} disabled={!active?.id || sending || loading}>
                <EuiIcon type="share" size="m" aria-hidden="true" />分享对话
              </button>
            </div>
          </aside>
        ) : null}
        <div className="cv-troubleshoot-main">
          {shareMode ? <span className="cv-troubleshoot-readonly">只读</span> : null}
          <div className="cv-troubleshoot-thread" ref={threadRef} aria-live="polite" aria-busy={loading || sending}>
            <div className={`cv-troubleshoot-transcript${messages.length === 0 ? " cv-troubleshoot-transcript--empty" : ""}`}>
              {loading ? <p className="cv-troubleshoot-empty">正在加载对话</p> : null}
              {!loading && messages.length === 0 ? (
                <div className="cv-troubleshoot-welcome">
                  <h2>{shareMode ? "这个对话还没有消息" : "有什么日志问题？"}</h2>
                  {!shareMode ? (
                    <div className="cv-troubleshoot-examples">
                      {examples.map((example) => (
                        <button key={example} type="button" onClick={() => { setDraft(example); draftRef.current?.focus(); }}>
                          {example}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
              {sending ? <div className="cv-troubleshoot-progress" role="status"><span aria-hidden="true" />正在排查…</div> : null}
            </div>
          </div>
          {shareMode ? null : (
            <form
              className="cv-troubleshoot-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
            >
              {waiting ? (
                <div className="cv-troubleshoot-confirm">
                  <p>{active.pending?.summary}</p>
                  <div>
                    <button type="button" className="cv-action-button" onClick={() => void confirm(true)} disabled={sending}>
                      确认并查询
                    </button>
                    <button type="button" className="cv-secondary-button" onClick={() => void confirm(false)} disabled={sending}>
                      取消
                    </button>
                  </div>
                </div>
              ) : null}
              <label className="cv-sr-only" htmlFor="troubleshoot-draft">
                现象
              </label>
              <span className="cv-troubleshoot-composer-source" title="日志排查" aria-hidden="true"><EuiIcon type="search" size="m" /></span>
              <textarea
                id="troubleshoot-draft"
                ref={draftRef}
                rows={1}
                value={draft}
                placeholder="服务名、Trace ID，或一段报错…"
                disabled={loading || sending || Boolean(waiting)}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button type="submit" className="cv-troubleshoot-send" aria-label="发送" title="发送" disabled={loading || sending || !draft.trim() || Boolean(waiting)}>
                <EuiIcon type="arrowUp" size="m" aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </div>
      {notice ? (
        <p className="cv-troubleshoot-toast" role="status">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
