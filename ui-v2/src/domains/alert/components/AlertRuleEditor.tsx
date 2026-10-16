import { useEffect, useRef, useState, type FormEvent } from "react";
import { EuiIcon } from "@elastic/eui";
import { Modal, CheckPicker } from "rsuite";
import { ALARM_LEVELS, ALARM_UNITS, alarmDraft, createAlarmRule, filterSignature, updateAlarmRule, type AlarmRule } from "../api/alerts";
import { listQuerySourceInstances } from "../../query/api/query";
import { listSettingsAlarmChannels, type SettingsAlarmChannel } from "../../settings/api/settings";
import { listPermissionUsers } from "../../permission/api/permission";
import type { QuerySourceInstance } from "../../query/types/contracts";
import AlertFilterEditor, { newAlarmFilter } from "./AlertFilterEditor";
import { AlertIconButton, alertError } from "./AlertControls";
import { getV2BasePath } from "../../../shared/layout/VersionSwitcher";

export default function AlertRuleEditor({ rule, onClose, onSaved }: { rule?: AlarmRule; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(() => alarmDraft(rule));
  const [sources, setSources] = useState<QuerySourceInstance[]>([]);
  const [channels, setChannels] = useState<SettingsAlarmChannel[]>([]);
  const [users, setUsers] = useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [userError, setUserError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelError, setChannelError] = useState("");
  const verified = useRef(new Set((rule?.filters ?? []).map(filterSignature)));
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError("");
    Promise.all([listQuerySourceInstances(), listSettingsAlarmChannels()]).then(([sources, channels]) => {
      if (active) { setSources(sources); setChannels(channels ?? []); }
    }).catch((err) => { if (active) setLoadError(alertError(err)); }).finally(() => { if (active) setLoading(false); });
    async function loadUsers() {
      const first = await listPermissionUsers({ current: 1, pageSize: 1000 });
      const list = [...(first.list ?? [])];
      for (let current = 2; list.length < first.total; current += 1) {
        if (!active) break;
        const page = await listPermissionUsers({ current, pageSize: 1000 });
        if (!page.list?.length) break;
        list.push(...page.list);
      }
      return list;
    }
    loadUsers().then((list) => {
      if (active) { setUsers(list.map((user) => ({ value: user.uid, label: user.nickname || user.username }))); setUserError(""); }
    }).catch((err) => { if (active) setUserError(alertError(err)); });
    return () => { active = false; };
  }, [revision]);

  async function reloadChannels() {
    setChannelLoading(true); setChannelError("");
    try { setChannels((await listSettingsAlarmChannels()) ?? []); }
    catch (err) { setChannelError(alertError(err)); }
    finally { setChannelLoading(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || loading || loadError) return;
    setError("");
    if (!draft.alarmName.trim() || !draft.channelIds.length || !draft.filters.length) { setError("请填写告警名称、选择告警渠道并添加查询条件"); return; }
    if (draft.filters.some((filter) => !filter.tid || !filter.when.trim() || !filter.conditions.length || filter.conditions.some((condition) => !Number.isInteger(condition.val1) || (condition.cond > 1 && (!Number.isInteger(condition.val2) || condition.val2 < condition.val1))))) {
      setError("请补全日志表、查询表达式和有效的触发阈值"); return;
    }
    if (draft.filters.some((filter) => !verified.current.has(filterSignature(filter)))) { setError("请先预览新增或修改的查询；聚合模式还需预览告警指标"); return; }
    setBusy(true);
    try {
      const payload = { ...draft, alarmName: draft.alarmName.trim() };
      if (rule) await updateAlarmRule(rule.id, payload); else await createAlarmRule(payload);
      onSaved();
    } catch (err) { setError(alertError(err)); } finally { setBusy(false); }
  }
  const channelOptions = channels.map((channel) => ({ value: channel.id, label: channel.name }));
  draft.channelIds.forEach((id) => { if (!channelOptions.some((option) => option.value === id)) channelOptions.push({ value: id, label: `渠道 #${id}` }); });
  const userOptions = [...users];
  draft.dutyOfficers.forEach((id) => { if (!userOptions.some((option) => option.value === id)) userOptions.push({ value: id, label: `用户 #${id}` }); });

  return <Modal open onClose={() => { if (!busy) onClose(); }} size="lg" className="cv-rule-modal" backdrop="static" keyboard={!busy}>
    <Modal.Header closeButton={!busy}><Modal.Title>{rule ? "编辑告警规则" : "新建告警规则"}</Modal.Title></Modal.Header>
    <Modal.Body>
      {loading ? <div role="status">正在加载规则配置...</div> : loadError ? <div className="cv-rules-error" role="alert">{loadError}<button className="cv-secondary-button" onClick={() => setRevision((value) => value + 1)}>重试</button></div> : null}
      <form id="alarm-rule-form" className="cv-rule-form" onSubmit={(event) => void save(event)}>
        <fieldset disabled={loading || busy || !!loadError} className="cv-rule-fields">
          <div className="cv-rule-form-grid">
            <label className="cv-rule-field"><span>告警名称</span><input className="cv-input" required maxLength={64} value={draft.alarmName} onChange={(event) => setDraft({ ...draft, alarmName: event.target.value })} /></label>
            <label className="cv-rule-field"><span>级别</span><select className="cv-input" value={draft.level} onChange={(event) => setDraft({ ...draft, level: Number(event.target.value) })}>{ALARM_LEVELS.map((label, index) => <option value={index} key={label}>{label}</option>)}</select></label>
            <label className="cv-rule-field"><span>检查频率</span><span className="cv-rule-inline"><input className="cv-input" type="number" min={1} step={1} required aria-label="检查间隔" value={draft.interval} onChange={(event) => setDraft({ ...draft, interval: event.target.valueAsNumber })} /><select className="cv-input" aria-label="频率单位" value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: Number(event.target.value) })}>{ALARM_UNITS.map((unit, index) => <option key={unit} value={index}>{unit}</option>)}</select></span></label>
            <label className="cv-rule-field"><span>无数据处理</span><select className="cv-input" value={draft.noDataOp} onChange={(event) => setDraft({ ...draft, noDataOp: Number(event.target.value) })}><option value={0}>No Data</option><option value={1}>OK</option><option value={2}>Alert</option></select></label>
            <div className="cv-rule-field"><span id="alarm-channels-label">告警渠道</span><div className="cv-rule-channel-picker"><CheckPicker aria-labelledby="alarm-channels-label" data={channelOptions} value={draft.channelIds} onChange={(value) => setDraft({ ...draft, channelIds: value })} block disabled={busy || loading || !!loadError} placeholder="选择告警渠道" /><a className="cv-icon-button" title="新建告警渠道" aria-label="新建告警渠道" target="_blank" rel="noreferrer" href={`${getV2BasePath()}/v2/alerts/channels?create=1`}><EuiIcon type="plus" size="m" /></a><AlertIconButton icon="refresh" label="刷新渠道选项" disabled={busy || channelLoading} onClick={() => void reloadChannels()} /></div>{channelError ? <span className="cv-rules-error" role="alert">{channelError}</span> : null}</div>
            <div className="cv-rule-field"><span id="alarm-officers-label">负责人</span><CheckPicker aria-labelledby="alarm-officers-label" data={userOptions} value={draft.dutyOfficers} onChange={(value) => setDraft({ ...draft, dutyOfficers: value })} block disabled={busy || loading || !!loadError || !!userError} placeholder="选择负责人" />{userError ? <span className="cv-muted">负责人列表加载失败，已保留原设置</span> : null}</div>
            <label className="cv-rule-field"><span>AI 分析去重间隔（秒）</span><input className="cv-input" type="number" min={0} max={604800} step={1} required value={draft.aiCooldownSeconds} onChange={(event) => setDraft({ ...draft, aiCooldownSeconds: event.target.valueAsNumber })} /></label>
            <label className="cv-rule-checkbox"><input type="checkbox" checked={draft.isDisableResolve === 1} onChange={(event) => setDraft({ ...draft, isDisableResolve: event.target.checked ? 1 : 0 })} />禁用恢复通知</label>
          </div>
          <label className="cv-rule-field"><span>描述</span><textarea className="cv-textarea" rows={2} value={draft.desc} onChange={(event) => setDraft({ ...draft, desc: event.target.value })} /></label>
        </fieldset>
        {draft.filters.map((filter, index) => <AlertFilterEditor key={index} filter={filter} index={index} sources={sources} disabled={busy || loading || !!loadError}
          onChange={(next) => setDraft((current) => ({ ...current, filters: current.filters.map((item, idx) => idx === index ? next : item) }))}
          onRemove={() => setDraft((current) => ({ ...current, filters: current.filters.filter((_, idx) => idx !== index) }))}
          onVerified={(signature) => verified.current.add(signature)} />)}
        <button type="button" className="cv-secondary-button" disabled={loading || busy || !!loadError} onClick={() => setDraft({ ...draft, filters: [...draft.filters, newAlarmFilter()] })}><EuiIcon type="plus" size="m" />添加日志表</button>
        {error ? <p className="cv-rules-error" role="alert">{error}</p> : null}
      </form>
    </Modal.Body>
    <Modal.Footer><button className="cv-secondary-button" disabled={busy} onClick={onClose}>取消</button><button className="cv-action-button" type="submit" form="alarm-rule-form" disabled={busy || loading || !!loadError}><EuiIcon type="save" size="m" />{busy ? "保存中..." : "保存"}</button></Modal.Footer>
  </Modal>;
}
