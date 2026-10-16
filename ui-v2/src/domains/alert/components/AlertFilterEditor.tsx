import { useEffect, useRef, useState } from "react";
import { EuiIcon } from "@elastic/eui";
import { filterSignature, previewAlarmFilter, type AlarmFilter } from "../api/alerts";
import type { QueryLogsResponse, QuerySourceInstance } from "../../query/types/contracts";
import { AlertIconButton, alertError } from "./AlertControls";

export function newAlarmFilter(): AlarmFilter {
  return { tid: 0, when: "1=1", mode: 0, typ: 0, exp: "", conditions: [{ typ: 0, exp: 0, cond: 0, val1: 1, val2: 0 }] };
}
function localTime(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function AlertFilterEditor({ filter, index, sources, disabled, onChange, onRemove, onVerified }: {
  filter: AlarmFilter; index: number; sources: QuerySourceInstance[]; disabled: boolean;
  onChange: (filter: AlarmFilter) => void; onRemove: () => void; onVerified: (signature: string) => void;
}) {
  const [start, setStart] = useState(() => localTime(Date.now() / 1000 - 900));
  const [end, setEnd] = useState(() => localTime(Date.now() / 1000));
  const [result, setResult] = useState<QueryLogsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rawVerified, setRawVerified] = useState("");
  const [page, setPage] = useState(1);
  const [stage, setStage] = useState<number | undefined>();
  const request = useRef<AbortController>();
  const signature = filterSignature(filter);
  useEffect(() => {
    request.current?.abort(); setLoading(false); setResult(null); setRawVerified(""); setError(""); setPage(1);
    return () => request.current?.abort();
  }, [signature, start, end]);

  async function preview(nextStage?: number, nextPage = 1) {
    const st = new Date(start).getTime() / 1000;
    const et = new Date(end).getTime() / 1000;
    if (!filter.tid || !filter.when.trim() || !Number.isFinite(st) || !Number.isFinite(et) || st >= et) {
      setError("请选择日志表、填写查询条件及有效时间范围"); return;
    }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try {
      const data = await previewAlarmFilter(filter, st, et, nextPage, nextStage, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setResult(data); setStage(nextStage); setPage(nextPage);
      if (filter.mode === 0 || nextStage === 2) onVerified(signature);
      else setRawVerified(signature);
    } catch (err) { if (!controller.signal.aborted) setError(alertError(err)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  function condition(index: number, values: Partial<AlarmFilter["conditions"][number]>) {
    onChange({ ...filter, conditions: filter.conditions.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item) });
  }
  const columns = result?.logs?.length ? Object.keys(result.logs[0]) : [];
  const knownTable = sources.some((source) => source.databases.some((database) => database.tables.some((table) => table.id === filter.tid)));

  return <fieldset className="cv-rule-filter" disabled={disabled}>
    <legend>查询条件 {index + 1}</legend>
    <div className="cv-rule-filter-toolbar">
      <label className="cv-rule-field"><span>日志表</span><select className="cv-input" aria-label={`日志表 ${index + 1}`} required value={filter.tid}
        onChange={(event) => onChange({ ...filter, tid: Number(event.target.value) })}>
        <option value={0}>选择日志表</option>
        {filter.tid && !knownTable ? <option value={filter.tid}>{filter.tableName || `#${filter.tid}`}</option> : null}
        {sources.flatMap((source) => source.databases.map((database) => <optgroup key={database.id} label={`${source.name} / ${database.name}`}>
          {database.tables.map((table) => <option key={table.id} value={table.id}>{table.name}{table.desc ? ` (${table.desc})` : ""}</option>)}
        </optgroup>))}
      </select></label>
      <label className="cv-rule-field"><span>查询模式</span><select className="cv-input" aria-label={`查询模式 ${index + 1}`} value={filter.mode}
        onChange={(event) => onChange({ ...filter, mode: Number(event.target.value) })}><option value={0}>普通模式</option><option value={1}>聚合模式</option></select></label>
      <AlertIconButton icon="trash" label={`删除查询条件 ${index + 1}`} onClick={onRemove} />
    </div>
    <label className="cv-rule-field"><span>{filter.mode === 1 ? "聚合 SQL" : "查询条件"}</span><textarea className="cv-textarea cv-rule-sql" required rows={3} aria-label={`查询表达式 ${index + 1}`} value={filter.when}
      onChange={(event) => onChange({ ...filter, when: event.target.value })} /></label>
    <div className="cv-rule-preview-toolbar">
      <input className="cv-input" type="datetime-local" aria-label={`预览开始时间 ${index + 1}`} value={start} onChange={(event) => setStart(event.target.value)} />
      <span>至</span><input className="cv-input" type="datetime-local" aria-label={`预览结束时间 ${index + 1}`} value={end} onChange={(event) => setEnd(event.target.value)} />
      <button type="button" className="cv-secondary-button" disabled={loading} onClick={() => void preview(filter.mode === 1 ? 1 : undefined)}>
        <EuiIcon type="play" size="m" />{loading ? "查询中..." : filter.mode === 1 ? "预览聚合数据" : "预览日志"}
      </button>
      {filter.mode === 1 ? <button type="button" className="cv-secondary-button" disabled={loading || rawVerified !== signature} onClick={() => void preview(2)}>预览告警指标</button> : null}
    </div>
    {error ? <p className="cv-rules-error" role="alert">{error}</p> : null}
    {result ? <div className="cv-rule-preview" aria-label={`查询预览 ${index + 1}`}>
      <div className="cv-rule-preview-toolbar"><span>{stage === 2 ? "告警指标" : "查询结果"} · {result.count} 条</span>
        <AlertIconButton icon="arrowLeft" label={`预览上一页 ${index + 1}`} disabled={loading || page === 1} onClick={() => void preview(stage, page - 1)} />
        <span>第 {page} 页</span><AlertIconButton icon="arrowRight" label={`预览下一页 ${index + 1}`} disabled={loading || page * 20 >= result.count} onClick={() => void preview(stage, page + 1)} />
      </div>
      {result.logs?.length ? <div className="cv-table-wrap"><table className="cv-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{result.logs.map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column}>{typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column] ?? "")}</td>)}</tr>)}</tbody></table></div> : <div className="cv-rules-empty">当前窗口无匹配数据</div>}
    </div> : null}
    <div className="cv-rule-conditions">
      <span>触发条件</span>
      {filter.conditions.map((item, conditionIndex) => <div className="cv-rule-condition" key={conditionIndex}>
        <select className="cv-input" aria-label={`条件连接 ${index + 1}-${conditionIndex + 1}`} disabled={conditionIndex === 0} value={item.typ}
          onChange={(event) => condition(conditionIndex, { typ: Number(event.target.value) })}>
          {conditionIndex === 0 ? <option value={0}>WHEN</option> : <><option value={1}>AND</option><option value={2}>OR</option></>}
        </select>
        <select className="cv-input" aria-label={`统计函数 ${index + 1}-${conditionIndex + 1}`} value={item.exp} onChange={(event) => condition(conditionIndex, { exp: Number(event.target.value) })}>
          {["avg", "min", "max", "sum", "count"].map((value, index) => <option key={value} value={index}>{value}</option>)}
        </select>
        <select className="cv-input" aria-label={`比较方式 ${index + 1}-${conditionIndex + 1}`} value={item.cond} onChange={(event) => condition(conditionIndex, { cond: Number(event.target.value) })}>
          {["高于", "低于", "区间外", "区间内"].map((value, index) => <option key={value} value={index}>{value}</option>)}
        </select>
        <input className="cv-input" type="number" step={1} required aria-label={`阈值 ${index + 1}-${conditionIndex + 1}`} value={item.val1 ?? ""} onChange={(event) => condition(conditionIndex, { val1: event.target.valueAsNumber })} />
        {item.cond > 1 ? <><span>至</span><input className="cv-input" type="number" step={1} required aria-label={`上限 ${index + 1}-${conditionIndex + 1}`} value={item.val2 ?? ""} onChange={(event) => condition(conditionIndex, { val2: event.target.valueAsNumber })} /></> : null}
        {conditionIndex > 0 ? <AlertIconButton icon="trash" label={`删除阈值 ${index + 1}-${conditionIndex + 1}`} onClick={() => onChange({ ...filter, conditions: filter.conditions.filter((_, idx) => idx !== conditionIndex) })} /> : null}
      </div>)}
      <button type="button" className="cv-secondary-button" onClick={() => onChange({ ...filter, conditions: [...filter.conditions, { typ: filter.conditions.length ? 1 : 0, exp: 0, cond: 0, val1: 1, val2: 0 }] })}><EuiIcon type="plus" size="m" />添加触发条件</button>
    </div>
  </fieldset>;
}
