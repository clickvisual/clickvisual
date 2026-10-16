import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { EuiIcon } from "@elastic/eui";
import { Modal } from "rsuite";
import AlertSubnav from "../components/AlertSubnav";
import AlertRuleEditor from "../components/AlertRuleEditor";
import AlertRuleDetail from "../components/AlertRuleDetail";
import { AlertIconButton, AlertPagination, alertError, alertTime } from "../components/AlertControls";
import { ALARM_LEVELS, ALARM_STATUSES, ALARM_UNITS, deleteAlarmRule, getAlarmRule, listAlarmRules, updateAlarmRule, type AlarmRule } from "../api/alerts";
import { listQuerySourceInstances } from "../../query/api/query";
import type { QuerySourceInstance } from "../../query/types/contracts";
import "./alert-rules.css";

export default function AlertRulesPage() {
  const [search, setSearch] = useSearchParams();
  const [rules, setRules] = useState<AlarmRule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [sources, setSources] = useState<QuerySourceInstance[]>([]);
  const [sourceError, setSourceError] = useState("");
  const [name, setName] = useState(search.get("name") || "");
  const [alarmId, setAlarmId] = useState(search.get("alarmId") || "");
  const [editor, setEditor] = useState<AlarmRule | "new" | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<AlarmRule | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const reloadRequested = useRef(false);
  const current = Math.max(1, Number(search.get("current")) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(search.get("pageSize"))) ? Number(search.get("pageSize")) : 20;
  const iid = Number(search.get("iid")) || 0;
  const did = Number(search.get("did")) || 0;
  const databases = sources.find((source) => source.id === iid)?.databases ?? [];
  const tables = databases.find((database) => database.id === did)?.tables ?? [];
  const searchKey = search.toString();

  useEffect(() => {
    let active = true;
    listQuerySourceInstances().then((items) => { if (active) setSources(items); })
      .catch((err) => { if (active) setSourceError(alertError(err)); });
    return () => { active = false; };
  }, []);
  useEffect(() => { setName(search.get("name") || ""); setAlarmId(search.get("alarmId") || ""); }, [searchKey]);
  useEffect(() => {
    const controller = new AbortController();
    const params = Object.fromEntries(new URLSearchParams(searchKey));
    const isReload = reloadRequested.current;
    reloadRequested.current = false;
    setLoading(true); setError("");
    // v1 expects only the most specific source id.
    listAlarmRules({ ...params, current, pageSize, iid: params.tid || params.did ? undefined : params.iid,
      did: params.tid ? undefined : params.did, isReload: isReload ? 1 : undefined }, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setRules(result.data ?? []); setTotal(result.pagination.total);
        const lastPage = Math.max(1, Math.ceil(result.pagination.total / pageSize));
        if (current > lastPage) setSearch((previous) => { const next = new URLSearchParams(previous); next.set("current", String(lastPage)); return next; }, { replace: true });
      }).catch((err) => { if (!controller.signal.aborted) { setRules([]); setError(alertError(err)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [searchKey, current, pageSize, revision, setSearch]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 3500); return () => window.clearTimeout(timer); }, [message]);

  function change(values: Record<string, string | number>) {
    const next = new URLSearchParams(search);
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, String(value)); else next.delete(key); });
    if (!("current" in values)) next.delete("current");
    setSearch(next);
  }
  function searchRules(event: FormEvent) { event.preventDefault(); change({ name: name.trim(), alarmId }); }
  async function edit(rule: AlarmRule) {
    setBusy(true);
    try { setEditor(await getAlarmRule(rule.id)); } catch (err) { setMessage(alertError(err)); } finally { setBusy(false); }
  }
  async function toggle(rule: AlarmRule) {
    setBusy(true);
    try { await updateAlarmRule(rule.id, { status: rule.status === 1 ? 2 : 1 }); setMessage(rule.status === 1 ? "告警规则已启用" : "告警规则已暂停"); setRevision((value) => value + 1); }
    catch (err) { setMessage(alertError(err)); } finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true); setDeleteError("");
    try { await deleteAlarmRule(deleting.id); setDeleting(null); setMessage("告警规则已删除"); setRevision((value) => value + 1); }
    catch (err) { setDeleteError(alertError(err)); } finally { setBusy(false); }
  }

  return <section className="cv-page cv-rules-page">
    <header className="cv-page-toolbar">
      <div className="cv-page-toolbar__main">
        <div className="cv-breadcrumb" aria-label="页面路径"><span>告警</span><span aria-hidden="true">/</span><span className="cv-breadcrumb__current">告警规则</span></div>
        <h1 className="cv-page-title cv-sr-only">告警规则</h1><AlertSubnav />
      </div>
      <div className="cv-header-actions">
        <AlertIconButton icon="refresh" label="刷新告警规则" disabled={loading || busy} onClick={() => { reloadRequested.current = true; setRevision((value) => value + 1); }} />
        <button type="button" className="cv-action-button" disabled={busy} onClick={() => setEditor("new")}><EuiIcon type="plus" size="m" />新建规则</button>
      </div>
    </header>
    <section className="cv-panel cv-rules-panel" aria-label="告警规则列表" aria-busy={loading}>
      <form className="cv-rules-toolbar" onSubmit={searchRules}>
        <select aria-label="筛选实例" className="cv-input" value={iid} onChange={(event) => change({ iid: event.target.value, did: "", tid: "" })}>
          <option value={0}>全部实例</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
        </select>
        <select aria-label="筛选数据库" className="cv-input" value={did} disabled={!iid} onChange={(event) => change({ did: event.target.value, tid: "" })}>
          <option value={0}>全部数据库</option>{databases.map((database) => <option key={database.id} value={database.id}>{database.name}</option>)}
        </select>
        <select aria-label="筛选日志表" className="cv-input" value={search.get("tid") || ""} disabled={!did} onChange={(event) => change({ tid: event.target.value })}>
          <option value="">全部日志表</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.name}{table.desc ? ` (${table.desc})` : ""}</option>)}
        </select>
        <select aria-label="筛选规则状态" className="cv-input" value={search.get("status") || ""} onChange={(event) => change({ status: event.target.value })}>
          <option value="">全部状态</option>{ALARM_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
        <input className="cv-input" type="search" aria-label="搜索告警规则" placeholder="告警名称" value={name} onChange={(event) => setName(event.target.value)} />
        <input className="cv-input cv-rules-id" type="number" min={1} aria-label="告警 ID" placeholder="告警 ID" value={alarmId} onChange={(event) => setAlarmId(event.target.value)} />
        <button type="submit" className="cv-secondary-button" disabled={loading}><EuiIcon type="search" size="m" />搜索</button>
        <AlertIconButton icon="cross" label="重置规则筛选" disabled={loading} onClick={() => setSearch(new URLSearchParams())} />
      </form>
      {sourceError ? <div className="cv-rules-error" role="alert">数据源加载失败：{sourceError}</div> : null}
      {error ? <div className="cv-rules-empty" role="alert">{error}<button className="cv-secondary-button" onClick={() => setRevision((value) => value + 1)}>重试</button></div>
        : loading ? <div className="cv-rules-empty" role="status">正在加载告警规则...</div>
          : !rules.length ? <div className="cv-rules-empty">暂无匹配的告警规则</div>
            : <div className="cv-table-wrap"><table className="cv-table cv-rules-table">
              <thead><tr><th>告警名称</th><th>关联日志表</th><th>检查频率</th><th>更新人 / 时间</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>{rules.map((rule) => <tr key={rule.id}>
                <td><button type="button" className="cv-rules-name" onClick={() => setDetailId(rule.id)}>{rule.alarmName}</button><div className="cv-muted">#{rule.id} · {ALARM_LEVELS[rule.level] ?? "-"}</div></td>
                <td>{rule.relatedList?.map((related) => <div key={related.table.id} title={related.table.desc}>{related.instance.name} / {related.table.database.name} / {related.table.name}</div>)}</td>
                <td>{rule.interval} {ALARM_UNITS[rule.unit] ?? "-"}</td>
                <td><span>{rule.user?.nickname || rule.user?.username || "-"}</span><div className="cv-muted">{alertTime(rule.utime)}</div></td>
                <td><span className={`cv-rules-state cv-rules-state--${rule.status}`}>{ALARM_STATUSES.find((status) => status.value === rule.status)?.label ?? "未知"}</span></td>
                <td><div className="cv-rules-actions">
                  {rule.status !== 0 ? <AlertIconButton icon={rule.status === 1 ? "play" : "pause"} label={`${rule.status === 1 ? "启用" : "暂停"} ${rule.alarmName}`} disabled={busy} onClick={() => void toggle(rule)} /> : null}
                  <AlertIconButton icon="pencil" label={`编辑 ${rule.alarmName}`} disabled={busy} onClick={() => void edit(rule)} />
                  <AlertIconButton icon="document" label={`详情 ${rule.alarmName}`} disabled={busy} onClick={() => setDetailId(rule.id)} />
                  <AlertIconButton icon="trash" label={`删除 ${rule.alarmName}`} disabled={busy} onClick={() => { setDeleteError(""); setDeleting(rule); }} />
                </div></td>
              </tr>)}</tbody>
            </table></div>}
      <AlertPagination current={current} pageSize={pageSize} total={total} disabled={loading} onChange={(page, size) => change({ current: page, pageSize: size })} />
    </section>
    {editor ? <AlertRuleEditor rule={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setMessage("告警规则已保存"); setRevision((value) => value + 1); }} /> : null}
    {detailId ? <AlertRuleDetail id={detailId} onClose={() => setDetailId(null)} /> : null}
    <Modal open={deleting !== null} onClose={() => { if (!busy) setDeleting(null); }} size="xs" backdrop="static" keyboard={!busy}>
      <Modal.Header closeButton={!busy}><Modal.Title>删除告警规则</Modal.Title></Modal.Header>
      <Modal.Body>确认删除「{deleting?.alarmName}」？{deleteError ? <p role="alert" className="cv-rules-error">{deleteError}</p> : null}</Modal.Body>
      <Modal.Footer><button className="cv-secondary-button" disabled={busy} onClick={() => setDeleting(null)}>取消</button><button className="cv-action-button" disabled={busy} onClick={() => void remove()}>确认删除</button></Modal.Footer>
    </Modal>
    {message ? <div className="cv-settings-toast" role="status">{message}</div> : null}
  </section>;
}
