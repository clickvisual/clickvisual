import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EuiIcon } from "@elastic/eui";
import { Modal } from "rsuite";
import AlertSubnav from "../components/AlertSubnav";
import {
  createSettingsAlarmChannel, deleteSettingsAlarmChannel, getSettingsAlarmChannel,
  listSettingsAlarmChannels, sendSettingsAlarmChannelTest, updateSettingsAlarmChannel,
  type SettingsAlarmChannel, type SettingsAlarmChannelPayload
} from "../../settings/api/settings";
import "./alert-channels.css";

const CHANNEL_TYPES = [
  { value: 1, label: "钉钉" },
  { value: 2, label: "企业微信" },
  { value: 3, label: "飞书" },
  { value: 4, label: "Slack" },
  { value: 5, label: "Webhook" },
  { value: 6, label: "Telegram" }
];

function typeLabel(typ: number) {
  return CHANNEL_TYPES.find((item) => item.value === typ)?.label || `类型 ${typ}`;
}

function destination(key: string) {
  try { return new URL(key).host; } catch { return "已配置"; }
}

function draftOf(channel?: SettingsAlarmChannel): SettingsAlarmChannelPayload {
  return {
    name: channel?.name || "", typ: channel?.typ || 1, key: channel?.key || "",
    aiAnalysisEnabled: channel?.aiAnalysisEnabled !== false
  };
}

function trimmed(draft: SettingsAlarmChannelPayload) {
  return { ...draft, name: draft.name.trim(), key: draft.key.trim() };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后重试";
}

export default function AlertChannelsPage() {
  const [channels, setChannels] = useState<SettingsAlarmChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [typ, setTyp] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<{ id?: number; draft: SettingsAlarmChannelPayload } | null>(null);
  const [formError, setFormError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SettingsAlarmChannel | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function loadChannels() {
    setLoading(true);
    setLoadError("");
    try { setChannels((await listSettingsAlarmChannels()) || []); }
    catch (error) { setLoadError(errorMessage(error)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadChannels(); }, []);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const filtered = useMemo(() => channels.filter((channel) =>
    (!typ || channel.typ === typ) &&
    `${channel.name} ${typeLabel(channel.typ)}`.toLowerCase().includes(keyword.trim().toLowerCase())
  ), [channels, typ, keyword]);

  function openCreate() {
    setFormError("");
    setEditor({ draft: draftOf() });
  }

  async function openEdit(channel: SettingsAlarmChannel) {
    setBusy(true);
    try {
      const detail = await getSettingsAlarmChannel(channel.id);
      setFormError("");
      setEditor({ id: channel.id, draft: draftOf(detail) });
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || busy) return;
    const payload = trimmed(editor.draft);
    if (!payload.name || !payload.key) { setFormError("请填写渠道名称和 URL / Key"); return; }
    setBusy(true);
    setFormError("");
    try {
      if (editor.id) await updateSettingsAlarmChannel(editor.id, payload);
      else await createSettingsAlarmChannel(payload);
      setEditor(null);
      setMessage("告警渠道已保存");
      await loadChannels();
    } catch (error) { setFormError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function test(draft: SettingsAlarmChannelPayload, inEditor = false) {
    const payload = trimmed(draft);
    if (!payload.name || !payload.key) { setFormError("请填写渠道名称和 URL / Key"); return; }
    setBusy(true);
    setFormError("");
    try {
      await sendSettingsAlarmChannelTest(payload);
      setMessage("测试消息已发送");
    } catch (error) {
      if (inEditor) setFormError(errorMessage(error));
      else setMessage(errorMessage(error));
    } finally { setBusy(false); }
  }

  async function toggle(channel: SettingsAlarmChannel) {
    setBusy(true);
    try {
      // Read the latest full record so changing the switch preserves its current URL and type.
      const current = await getSettingsAlarmChannel(channel.id);
      const enabled = current.aiAnalysisEnabled === false;
      await updateSettingsAlarmChannel(channel.id, { ...draftOf(current), aiAnalysisEnabled: enabled });
      setChannels((rows) => rows.map((row) => row.id === channel.id ? { ...current, aiAnalysisEnabled: enabled } : row));
      setMessage(enabled ? "AI 分析已开启" : "AI 分析已关闭");
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!pendingDelete || busy) return;
    setBusy(true);
    setDeleteError("");
    try {
      await deleteSettingsAlarmChannel(pendingDelete.id);
      setPendingDelete(null);
      setMessage("告警渠道已删除");
      await loadChannels();
    } catch (error) { setDeleteError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return (
    <section className="cv-page cv-alert-channels-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>告警</span><span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">告警渠道</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">告警渠道</h1>
          <AlertSubnav />
        </div>
        <div className="cv-header-actions">
          <button className="cv-icon-button" type="button" title="刷新" aria-label="刷新告警渠道"
            disabled={loading || busy} onClick={() => void loadChannels()}><EuiIcon type="refresh" size="m" /></button>
          <button className="cv-action-button" type="button" disabled={busy || loading} onClick={openCreate}>
            <EuiIcon type="plus" size="m" />新建渠道
          </button>
        </div>
      </header>

      <section className="cv-panel cv-alert-channels-panel" aria-label="告警渠道列表" aria-busy={loading}>
        <div className="cv-alert-channels-toolbar">
          <label className="cv-search">
            <EuiIcon type="search" size="m" />
            <input type="search" aria-label="搜索告警渠道" placeholder="搜索渠道名称" value={keyword}
              onChange={(event) => setKeyword(event.target.value)} />
          </label>
          <select className="cv-input" aria-label="筛选渠道类型" value={typ} onChange={(event) => setTyp(Number(event.target.value))}>
            <option value={0}>全部类型</option>
            {CHANNEL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <span className="cv-muted">{filtered.length} 个渠道</span>
        </div>
        {loadError ? (
          <div className="cv-alert-channels-empty" role="alert">
            <span>{loadError}</span><button type="button" className="cv-secondary-button" onClick={() => void loadChannels()}>重试</button>
          </div>
        ) : loading ? <div className="cv-alert-channels-empty" role="status">正在加载告警渠道...</div>
          : filtered.length === 0 ? <div className="cv-alert-channels-empty">{channels.length ? "没有匹配的告警渠道" : "暂无告警渠道"}</div>
          : <div className="cv-table-wrap cv-table-wrap--compact">
            <table className="cv-table cv-alert-channels-table">
              <thead><tr><th>渠道名称</th><th>类型</th><th>推送地址</th><th>AI 分析</th><th className="cv-alert-channels-actions-heading">操作</th></tr></thead>
              <tbody>{filtered.map((channel) => <tr key={channel.id}>
                <td><strong>{channel.name}</strong><div className="cv-muted">#{channel.id}</div></td>
                <td>{typeLabel(channel.typ)}</td>
                <td className="cv-muted">{destination(channel.key)}</td>
                <td><label className="cv-channel-switch">
                  <input type="checkbox" role="switch" aria-label={`${channel.name} AI 分析`} checked={channel.aiAnalysisEnabled !== false}
                    disabled={busy} onChange={() => void toggle(channel)} />
                  <span>{channel.aiAnalysisEnabled !== false ? "开启" : "关闭"}</span>
                </label></td>
                <td><div className="cv-alert-channels-actions">
                  <button type="button" className="cv-icon-button" aria-label={`测试 ${channel.name}`} title="发送测试消息" disabled={busy}
                    onClick={() => void test(draftOf(channel))}><EuiIcon type="play" size="m" /></button>
                  <button type="button" className="cv-icon-button" aria-label={`编辑 ${channel.name}`} title="编辑" disabled={busy}
                    onClick={() => void openEdit(channel)}><EuiIcon type="pencil" size="m" /></button>
                  <button type="button" className="cv-icon-button" aria-label={`删除 ${channel.name}`} title="删除" disabled={busy}
                    onClick={() => { setDeleteError(""); setPendingDelete(channel); }}><EuiIcon type="trash" size="m" /></button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>}
      </section>

      {message ? <div className="cv-settings-toast cv-channel-toast" role="status">{message}</div> : null}

      <Modal open={editor !== null} onClose={() => { if (!busy) setEditor(null); }} size="sm" className="cv-channel-modal"
        backdrop="static" keyboard={!busy}>
        <Modal.Header closeButton={!busy}><Modal.Title>{editor?.id ? "编辑告警渠道" : "新建告警渠道"}</Modal.Title></Modal.Header>
        <Modal.Body>{editor ? <form id="alert-channel-form" className="cv-form-grid" onSubmit={(event) => void save(event)}>
          <label className="cv-form-row"><span>渠道名称</span>
            <input className="cv-input" autoFocus required maxLength={128} value={editor.draft.name} disabled={busy}
              onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, name: event.target.value } })} />
          </label>
          <label className="cv-form-row"><span>渠道类型</span>
            <select className="cv-input" value={editor.draft.typ} disabled={busy}
              onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, typ: Number(event.target.value) } })}>
              {CHANNEL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="cv-form-row"><span>URL / Key</span>
            <textarea className="cv-textarea" rows={3} required spellCheck={false} value={editor.draft.key} disabled={busy}
              onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, key: event.target.value } })} />
          </label>
          <label className="cv-channel-switch cv-channel-switch--form"><span>AI 分析</span>
            <input type="checkbox" role="switch" checked={editor.draft.aiAnalysisEnabled} disabled={busy}
              onChange={(event) => setEditor({ ...editor, draft: { ...editor.draft, aiAnalysisEnabled: event.target.checked } })} />
          </label>
          {formError ? <p className="cv-channel-error" role="alert">{formError}</p> : null}
        </form> : null}</Modal.Body>
        <Modal.Footer>
          <button type="button" className="cv-secondary-button" disabled={busy} onClick={() => { if (editor) void test(editor.draft, true); }}>
            <EuiIcon type="play" size="m" />测试发送
          </button>
          <button type="submit" form="alert-channel-form" className="cv-action-button" disabled={busy}>{busy ? "处理中..." : "保存"}</button>
        </Modal.Footer>
      </Modal>

      <Modal open={pendingDelete !== null} onClose={() => { if (!busy) setPendingDelete(null); }} size="xs" className="cv-channel-modal"
        backdrop="static" keyboard={!busy}>
        <Modal.Header closeButton={!busy}><Modal.Title>删除告警渠道</Modal.Title></Modal.Header>
        <Modal.Body>
          <p>确认删除「{pendingDelete?.name}」？</p>
          {deleteError ? <p className="cv-channel-error" role="alert">{deleteError}</p> : null}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="cv-secondary-button" disabled={busy} onClick={() => setPendingDelete(null)}>取消</button>
          <button type="button" className="cv-action-button" disabled={busy} onClick={() => void remove()}>{busy ? "删除中..." : "确认删除"}</button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}
