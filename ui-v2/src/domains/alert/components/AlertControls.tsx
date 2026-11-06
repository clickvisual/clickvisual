import { EuiIcon } from "@elastic/eui";

export function AlertIconButton({ icon, label, disabled, onClick }: {
  icon: string; label: string; disabled?: boolean; onClick: () => void;
}) {
  return <button className="cv-icon-button" type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick}>
    <EuiIcon type={icon} size="m" />
  </button>;
}
export function AlertPagination({ current, pageSize, total, disabled, onChange }: {
  current: number; pageSize: number; total: number; disabled?: boolean;
  onChange: (current: number, pageSize: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="cv-rules-pagination">
    <span>共 {total} 条</span>
    <select className="cv-input" aria-label="每页条数" value={pageSize} disabled={disabled} onChange={(event) => onChange(1, Number(event.target.value))}>
      {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} 条 / 页</option>)}
    </select>
    <AlertIconButton icon="arrowLeft" label="上一页" disabled={disabled || current <= 1} onClick={() => onChange(current - 1, pageSize)} />
    <span>{current} / {pages}</span>
    <AlertIconButton icon="arrowRight" label="下一页" disabled={disabled || current >= pages} onClick={() => onChange(current + 1, pageSize)} />
  </div>;
}
export function alertError(error: unknown) { return error instanceof Error ? error.message : "操作失败，请稍后重试"; }
export function alertTime(value: number) { return value ? new Date(value * 1000).toLocaleString("zh-CN", { hour12: false }) : "-"; }
