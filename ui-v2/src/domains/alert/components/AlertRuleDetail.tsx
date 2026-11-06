import { useEffect, useState } from "react";
import { Modal } from "rsuite";
import { ALARM_LEVELS, ALARM_STATUSES, ALARM_UNITS, alarmQueryHref, getAlarmRule, listAlarmHistory, type AlarmHistory, type AlarmRule } from "../api/alerts";
import { AlertIconButton, AlertPagination, alertError, alertTime } from "./AlertControls";

function RuleHistory({ id }: { id: number }) {
  const [rows, setRows] = useState<AlarmHistory[]>([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [succ, setSucc] = useState(0);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [range, setRange] = useState<{ startTime?: number; endTime?: number }>({});
  const [error, setError] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    listAlarmHistory(id, { ...range, current, pageSize }, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) { setRows(result.data.list ?? []); setTotal(result.pagination.total); setSucc(result.data.succ); }
    }).catch((err) => { if (!controller.signal.aborted) { setRows([]); setError(alertError(err)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, current, pageSize, range, revision]);
  function applyRange() {
    const startTime = start ? new Date(start).getTime() / 1000 : undefined;
    const endTime = end ? new Date(end).getTime() / 1000 : undefined;
    if (startTime !== undefined && endTime !== undefined && startTime >= endTime) { setRangeError("开始时间需早于结束时间"); return; }
    setRangeError(""); setCurrent(1); setRange({ startTime, endTime });
  }
  return <div>
    <div className="cv-rule-history-toolbar">
      <input className="cv-input" type="datetime-local" aria-label="历史开始时间" value={start} onChange={(event) => setStart(event.target.value)} />
      <span>至</span><input className="cv-input" type="datetime-local" aria-label="历史结束时间" value={end} onChange={(event) => setEnd(event.target.value)} />
      <button className="cv-secondary-button" onClick={applyRange}>筛选</button>
      <button className="cv-secondary-button" onClick={() => { setStart(""); setEnd(""); setRange({}); setCurrent(1); setRangeError(""); }}>重置</button>
      <AlertIconButton icon="refresh" label="刷新告警历史" disabled={loading} onClick={() => setRevision((value) => value + 1)} />
    </div>
    {rangeError ? <p className="cv-rules-error" role="alert">{rangeError}</p> : null}
    {error ? <div className="cv-rules-empty" role="alert">{error}</div> : loading ? <div className="cv-rules-empty" role="status">正在加载告警历史...</div> : <>
      <div className="cv-rule-history-summary">触发 {total} 次 · 推送成功 {succ} 次 · 成功率 {total ? `${(succ / total * 100).toFixed(1)}%` : "-"}</div>
      {rows.length ? <div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>记录 ID</th><th>推送状态</th><th>触发时间</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>#{row.id}</td><td>{row.isPushed === 0 ? "重复告警，未推送" : row.isPushed === 1 ? "推送成功" : "推送失败"}</td><td>{alertTime(row.ctime)}</td></tr>)}</tbody></table></div> : <div className="cv-rules-empty">暂无告警记录</div>}
    </>}
    <AlertPagination current={current} pageSize={pageSize} total={total} disabled={loading} onChange={(page, size) => { setCurrent(page); setPageSize(size); }} />
  </div>;
}

function RuleConfig({ entries, fallback, label }: { entries?: Record<string, string>; fallback?: string; label: string }) {
  const keys = Object.keys(entries ?? {});
  const [selected, setSelected] = useState(keys[0] ?? "");
  const code = keys.length ? entries?.[selected] ?? "" : fallback ?? "";
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => { if (!copied) return; const timer = window.setTimeout(() => setCopied(false), 2500); return () => window.clearTimeout(timer); }, [copied]);
  return <div className="cv-rule-config">
    <div className="cv-rule-config-toolbar">
      {keys.length ? <select className="cv-input" aria-label={label} value={selected} onChange={(event) => setSelected(event.target.value)}>{keys.map((key) => <option key={key} value={key}>{key}</option>)}</select> : <span>{label}</span>}
      <AlertIconButton icon={copied ? "check" : "copy"} label={copied ? "已复制" : `复制${label}`} disabled={!code} onClick={() => {
        setCopyError("");
        void Promise.resolve().then(() => navigator.clipboard.writeText(code)).then(() => setCopied(true)).catch(() => setCopyError("复制失败，请选择内容后复制"));
      }} />
    </div>
    {copyError ? <p className="cv-rules-error" role="alert">{copyError}</p> : null}
    {code ? <pre>{code}</pre> : <div className="cv-rules-empty">暂无配置</div>}
  </div>;
}

export default function AlertRuleDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const [rule, setRule] = useState<AlarmRule | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("history");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setRule(null); setError("");
    getAlarmRule(id, { signal: controller.signal }).then((data) => { if (!controller.signal.aborted) setRule(data); })
      .catch((err) => { if (!controller.signal.aborted) setError(alertError(err)); });
    return () => controller.abort();
  }, [id, revision]);
  return <Modal open size="lg" className="cv-rule-modal" onClose={onClose}>
    <Modal.Header><Modal.Title>{rule?.alarmName ?? "告警规则详情"}</Modal.Title></Modal.Header>
    <Modal.Body>
      {error ? <div className="cv-rules-error" role="alert">{error}<button className="cv-secondary-button" onClick={() => setRevision((value) => value + 1)}>重试</button></div> : !rule ? <div role="status">正在加载告警详情...</div> : <>
        <dl className="cv-rule-detail-info">
          <div><dt>状态</dt><dd>{ALARM_STATUSES.find((status) => status.value === rule.status)?.label ?? "未知"} · {ALARM_LEVELS[rule.level]}</dd></div>
          <div><dt>检查频率</dt><dd>{rule.interval} {ALARM_UNITS[rule.unit]}</dd></div>
          <div><dt>更新人</dt><dd>{rule.nickname || rule.username || "-"}</dd></div>
          <div><dt>更新时间</dt><dd>{alertTime(rule.utime)}</dd></div>
          <div><dt>UUID</dt><dd>{rule.uuid}</dd></div>
          <div><dt>创建时间</dt><dd>{alertTime(rule.ctime)}</dd></div>
        </dl>
        {rule.desc ? <p className="cv-rule-description">{rule.desc}</p> : null}
        <div className="cv-rule-loglinks">{rule.filters?.map((filter, index) => <a key={filter.id ?? index} href={alarmQueryHref(filter)} target="_blank" rel="noreferrer" className="cv-secondary-button">{filter.tableName || `日志表 #${filter.tid}`} · 查询日志</a>)}</div>
        <div className="cv-rule-tabs" role="tablist" aria-label="告警详情视图">{[{ key: "history", label: "告警历史" }, { key: "view", label: "物化视图" }, { key: "rule", label: "Prometheus 规则" }].map((item) =>
          <button type="button" key={item.key} role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)}>{item.label}</button>)}</div>
        <div role="tabpanel">
          {tab === "history" ? <RuleHistory id={id} /> : tab === "view" ? <RuleConfig key="view" label="物化视图" entries={rule.viewDDLs} fallback={rule.view} /> : <RuleConfig key="rule" label="Prometheus 规则" entries={rule.alertRules} fallback={rule.alertRule} />}
        </div>
      </>}
    </Modal.Body>
    <Modal.Footer><button className="cv-secondary-button" onClick={onClose}>关闭</button></Modal.Footer>
  </Modal>;
}
