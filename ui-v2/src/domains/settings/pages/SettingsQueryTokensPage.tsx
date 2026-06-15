import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { listQuerySourceInstances } from "../../query/api/query";
import type { QuerySourceInstance } from "../../query/types/contracts";
import {
  createSettingsQueryToken,
  listSettingsQueryTokenAudits,
  listSettingsQueryTokens,
  updateSettingsQueryToken,
  updateSettingsQueryTokenGrants,
  type SettingsQueryToken,
  type SettingsQueryTokenAudit
} from "../api/settings";

const TOKEN_STATUS_ENABLED = 1;
const TOKEN_STATUS_DISABLED = 2;

interface TokenFormState {
  name: string;
  desc: string;
  expireMode: "never" | "time";
  expireAtLocal: string;
  tableIds: number[];
}

interface TableOption {
  id: number;
  label: string;
  instanceName: string;
  databaseName: string;
  tableName: string;
}

function unixToDateTimeLocal(value: number) {
  if (!value) {
    return "";
  }
  const date = new Date(value * 1000);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function dateTimeLocalToUnix(value: string) {
  if (!value) {
    return 0;
  }
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 0;
  }
  return Math.floor(timestamp / 1000);
}

function formatUnixTime(value: number) {
  if (!value) {
    return "永久";
  }
  return new Date(value * 1000).toLocaleString();
}

function flattenTables(instances: QuerySourceInstance[]): TableOption[] {
  return instances.flatMap((instance) =>
    instance.databases.flatMap((database) =>
      database.tables.map((table) => ({
        id: table.id,
        label: `${instance.name} / ${database.name}.${table.name}`,
        instanceName: instance.name,
        databaseName: database.name,
        tableName: table.name
      }))
    )
  );
}

function buildEmptyForm(): TokenFormState {
  return {
    name: "",
    desc: "",
    expireMode: "never",
    expireAtLocal: "",
    tableIds: []
  };
}

function buildTokenForm(token: SettingsQueryToken): TokenFormState {
  return {
    name: token.name,
    desc: token.desc || "",
    expireMode: token.expireAt > 0 ? "time" : "never",
    expireAtLocal: unixToDateTimeLocal(token.expireAt),
    tableIds: token.tableIds || []
  };
}

function formExpireAt(form: TokenFormState) {
  if (form.expireMode === "never") {
    return 0;
  }
  return dateTimeLocalToUnix(form.expireAtLocal);
}

function SettingsSubnav() {
  return (
    <nav className="cv-settings-subnav" aria-label="配置中心导航">
      <NavLink to="/v2/settings/datasource" className={({ isActive }) => `cv-settings-subnav__item${isActive ? " cv-settings-subnav__item--active" : ""}`}>
        数据源配置
      </NavLink>
      <NavLink to="/v2/settings/query-tokens" className={({ isActive }) => `cv-settings-subnav__item${isActive ? " cv-settings-subnav__item--active" : ""}`}>
        查询 Token
      </NavLink>
    </nav>
  );
}

export default function SettingsQueryTokensPage() {
  const [tokens, setTokens] = useState<SettingsQueryToken[]>([]);
  const [sourceTree, setSourceTree] = useState<QuerySourceInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SettingsQueryToken | null>(null);
  const [grantTarget, setGrantTarget] = useState<SettingsQueryToken | null>(null);
  const [auditTarget, setAuditTarget] = useState<SettingsQueryToken | null>(null);
  const [audits, setAudits] = useState<SettingsQueryTokenAudit[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [createdToken, setCreatedToken] = useState("");
  const [form, setForm] = useState<TokenFormState>(buildEmptyForm);

  const tableOptions = useMemo(() => flattenTables(sourceTree), [sourceTree]);
  const tableLabelById = useMemo(() => {
    const mapping = new Map<number, string>();
    tableOptions.forEach((table) => mapping.set(table.id, table.label));
    return mapping;
  }, [tableOptions]);
  const enabledCount = tokens.filter((token) => token.status === TOKEN_STATUS_ENABLED).length;
  const expiredCount = tokens.filter((token) => token.expireAt > 0 && token.expireAt < Math.floor(Date.now() / 1000)).length;

  async function loadPage() {
    setLoading(true);
    setError("");
    try {
      const [nextTokens, nextSourceTree] = await Promise.all([
        listSettingsQueryTokens(),
        listQuerySourceInstances()
      ]);
      setTokens(Array.isArray(nextTokens) ? nextTokens : []);
      setSourceTree(Array.isArray(nextSourceTree) ? nextSourceTree : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "查询 Token 加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  function openCreate() {
    setCreatedToken("");
    setForm(buildEmptyForm());
    setCreateOpen(true);
  }

  function openEdit(token: SettingsQueryToken) {
    setForm(buildTokenForm(token));
    setEditTarget(token);
  }

  function openGrant(token: SettingsQueryToken) {
    setForm(buildTokenForm(token));
    setGrantTarget(token);
  }

  async function openAudits(token: SettingsQueryToken) {
    setAuditTarget(token);
    setAuditLoading(true);
    setAudits([]);
    try {
      setAudits(await listSettingsQueryTokenAudits(token.id, { current: 1, pageSize: 30 }));
    } catch (auditError) {
      setError(auditError instanceof Error ? auditError.message : "审计记录加载失败");
    } finally {
      setAuditLoading(false);
    }
  }

  function updateForm(next: Partial<TokenFormState>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function toggleTable(tableId: number) {
    setForm((current) => {
      const exists = current.tableIds.includes(tableId);
      return {
        ...current,
        tableIds: exists
          ? current.tableIds.filter((id) => id !== tableId)
          : [...current.tableIds, tableId]
      };
    });
  }

  async function submitCreate() {
    if (!form.name.trim()) {
      setError("Token 名称不能为空");
      return;
    }
    if (form.expireMode === "time" && !form.expireAtLocal) {
      setError("请选择 Token 过期时间，或切换为永不过期");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await createSettingsQueryToken({
        name: form.name.trim(),
        desc: form.desc.trim(),
        expireAt: formExpireAt(form),
        tableIds: form.tableIds
      });
      setCreatedToken(created.token || "");
      setCreateOpen(false);
      setMessage("查询 Token 已创建，明文只展示一次");
      await loadPage();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit() {
    if (!editTarget) {
      return;
    }
    if (!form.name.trim()) {
      setError("Token 名称不能为空");
      return;
    }
    if (form.expireMode === "time" && !form.expireAtLocal) {
      setError("请选择 Token 过期时间，或切换为永不过期");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateSettingsQueryToken(editTarget.id, {
        name: form.name.trim(),
        desc: form.desc.trim(),
        status: editTarget.status,
        expireAt: formExpireAt(form)
      });
      setEditTarget(null);
      setMessage("查询 Token 已更新");
      await loadPage();
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "更新失败");
    } finally {
      setSaving(false);
    }
  }

  async function submitGrant() {
    if (!grantTarget) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateSettingsQueryTokenGrants(grantTarget.id, { tableIds: form.tableIds });
      setGrantTarget(null);
      setMessage("授权范围已更新");
      await loadPage();
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "授权更新失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(token: SettingsQueryToken) {
    const nextStatus = token.status === TOKEN_STATUS_ENABLED ? TOKEN_STATUS_DISABLED : TOKEN_STATUS_ENABLED;
    setSaving(true);
    setError("");
    try {
      await updateSettingsQueryToken(token.id, {
        name: token.name,
        desc: token.desc || "",
        status: nextStatus,
        expireAt: token.expireAt
      });
      setMessage(nextStatus === TOKEN_STATUS_ENABLED ? "Token 已启用" : "Token 已禁用");
      await loadPage();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "状态更新失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="cv-page cv-report-page cv-settings-page cv-query-token-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>设置</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">查询 Token</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">查询 Token</h1>
          <SettingsSubnav />
        </div>
        <div className="cv-header-actions">
          <button type="button" className="cv-secondary-button" onClick={() => void loadPage()} disabled={loading}>
            刷新
          </button>
          <button type="button" className="cv-action-button" onClick={openCreate}>
            新建 Token
          </button>
        </div>
      </header>

      <section className="cv-settings-stats">
        <div className="cv-settings-stat">
          <span className="cv-settings-stat__label">Token</span>
          <strong className="cv-settings-stat__value">{tokens.length}</strong>
          <span className="cv-muted">机器查询入口</span>
        </div>
        <div className="cv-settings-stat">
          <span className="cv-settings-stat__label">启用中</span>
          <strong className="cv-settings-stat__value">{enabledCount}</strong>
          <span className="cv-muted">可访问</span>
        </div>
        <div className="cv-settings-stat">
          <span className="cv-settings-stat__label">已过期</span>
          <strong className="cv-settings-stat__value">{expiredCount}</strong>
          <span className="cv-muted">需要处理</span>
        </div>
        <div className="cv-settings-stat">
          <span className="cv-settings-stat__label">可授权表</span>
          <strong className="cv-settings-stat__value">{tableOptions.length}</strong>
          <span className="cv-muted">来自日志库树</span>
        </div>
      </section>

      {error ? (
        <section className="cv-settings-banner cv-settings-banner--error">
          <strong>操作失败</strong>
          <span>{error}</span>
        </section>
      ) : null}

      {createdToken ? (
        <section className="cv-settings-banner cv-query-token-once">
          <strong>Token 明文</strong>
          <code>{createdToken}</code>
          <button type="button" className="cv-link-button" onClick={() => void navigator.clipboard?.writeText(createdToken)}>
            复制
          </button>
        </section>
      ) : null}

      <section className="cv-panel cv-settings-panel cv-query-token-panel">
        <div className="cv-panel-header cv-settings-panel__header">
          <div>
            <div className="cv-settings-section-eyebrow">Query Access</div>
            <h2 className="cv-panel-title">日志查询 Token</h2>
          </div>
          <div className="cv-settings-section-meta">
            <span className="cv-settings-chip">{loading ? "加载中" : `${tokens.length} 个 Token`}</span>
          </div>
        </div>

        {loading ? (
          <div className="cv-settings-empty">正在加载查询 Token...</div>
        ) : tokens.length === 0 ? (
          <div className="cv-settings-empty">暂无查询 Token，点击右上角新建。</div>
        ) : (
          <div className="cv-table-wrap cv-table-wrap--compact">
            <table className="cv-table cv-settings-table cv-query-token-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>前缀</th>
                  <th>状态</th>
                  <th>授权表</th>
                  <th>过期时间</th>
                  <th>最近使用</th>
                  <th style={{ textAlign: "right" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td>
                      <strong>{token.name}</strong>
                      <span className="cv-muted">{token.desc || "无描述"}</span>
                    </td>
                    <td>
                      <code className="cv-code cv-query-token-prefix">{token.tokenPrefix || "-"}</code>
                    </td>
                    <td>
                      <span className={`cv-settings-status ${token.status === TOKEN_STATUS_ENABLED ? "cv-settings-status--ok" : "cv-settings-status--error"}`}>
                        {token.status === TOKEN_STATUS_ENABLED ? "启用" : "禁用"}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="cv-link-button" onClick={() => openGrant(token)}>
                        {(token.tableIds || []).length} 张表
                      </button>
                    </td>
                    <td>{formatUnixTime(token.expireAt)}</td>
                    <td>{token.lastUsedAt ? formatUnixTime(token.lastUsedAt) : "未使用"}</td>
                    <td>
                      <div className="cv-settings-table-actions">
                        <button type="button" className="cv-secondary-button" onClick={() => openEdit(token)}>
                          编辑
                        </button>
                        <button type="button" className="cv-secondary-button" onClick={() => void toggleStatus(token)} disabled={saving}>
                          {token.status === TOKEN_STATUS_ENABLED ? "禁用" : "启用"}
                        </button>
                        <button type="button" className="cv-secondary-button" onClick={() => void openAudits(token)}>
                          审计
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {message ? <div className="cv-settings-toast">{message}</div> : null}

      {createOpen ? (
        <TokenEditModal
          title="新建查询 Token"
          form={form}
          tableOptions={tableOptions}
          saving={saving}
          onChange={updateForm}
          onToggleTable={toggleTable}
          onClose={() => setCreateOpen(false)}
          onSubmit={() => void submitCreate()}
        />
      ) : null}

      {editTarget ? (
        <TokenEditModal
          title="编辑查询 Token"
          form={form}
          tableOptions={null}
          saving={saving}
          onChange={updateForm}
          onToggleTable={toggleTable}
          onClose={() => setEditTarget(null)}
          onSubmit={() => void submitEdit()}
        />
      ) : null}

      {grantTarget ? (
        <GrantModal
          token={grantTarget}
          tableOptions={tableOptions}
          tableLabelById={tableLabelById}
          selectedIds={form.tableIds}
          saving={saving}
          onToggleTable={toggleTable}
          onClose={() => setGrantTarget(null)}
          onSubmit={() => void submitGrant()}
        />
      ) : null}

      {auditTarget ? (
        <AuditModal
          token={auditTarget}
          audits={audits}
          loading={auditLoading}
          onClose={() => setAuditTarget(null)}
        />
      ) : null}
    </section>
  );
}

function TokenEditModal({
  title,
  form,
  tableOptions,
  saving,
  onChange,
  onToggleTable,
  onClose,
  onSubmit
}: {
  title: string;
  form: TokenFormState;
  tableOptions: TableOption[] | null;
  saving: boolean;
  onChange: (next: Partial<TokenFormState>) => void;
  onToggleTable: (tableId: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="cv-report-modal-backdrop" role="presentation">
      <section className="cv-report-modal cv-query-token-modal" role="dialog" aria-label={title}>
        <div className="cv-panel-header">
          <div>
            <div className="cv-settings-section-eyebrow">Token</div>
            <h2 className="cv-panel-title">{title}</h2>
          </div>
          <button type="button" className="cv-secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="cv-form-grid">
          <label className="cv-form-row">
            <span className="cv-label">名称</span>
            <input className="cv-input" value={form.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="例如 grafana-prod-query" />
          </label>
          <label className="cv-form-row">
            <span className="cv-label">过期时间</span>
            <div className="cv-query-token-expire-toggle" role="group" aria-label="Token 过期策略">
              <button
                type="button"
                className={`cv-query-token-expire-toggle__item${form.expireMode === "never" ? " cv-query-token-expire-toggle__item--active" : ""}`}
                onClick={() => onChange({ expireMode: "never", expireAtLocal: "" })}
              >
                永不过期
              </button>
              <button
                type="button"
                className={`cv-query-token-expire-toggle__item${form.expireMode === "time" ? " cv-query-token-expire-toggle__item--active" : ""}`}
                onClick={() => onChange({ expireMode: "time" })}
              >
                指定时间
              </button>
            </div>
            {form.expireMode === "time" ? (
              <input
                className="cv-input"
                type="datetime-local"
                value={form.expireAtLocal}
                onChange={(event) => onChange({ expireAtLocal: event.target.value })}
              />
            ) : null}
          </label>
          <label className="cv-form-row">
            <span className="cv-label">描述</span>
            <textarea className="cv-textarea" value={form.desc} onChange={(event) => onChange({ desc: event.target.value })} placeholder="用途、负责人或接入系统" />
          </label>
          {tableOptions ? (
            <TablePicker tableOptions={tableOptions} selectedIds={form.tableIds} onToggleTable={onToggleTable} />
          ) : null}
        </div>
        <div className="cv-settings-action-row">
          <button type="button" className="cv-secondary-button" onClick={onClose}>
            取消
          </button>
          <button type="button" className="cv-action-button" onClick={onSubmit} disabled={saving}>
            {saving ? "保存中" : "保存"}
          </button>
        </div>
      </section>
    </div>
  );
}

function GrantModal({
  token,
  tableOptions,
  tableLabelById,
  selectedIds,
  saving,
  onToggleTable,
  onClose,
  onSubmit
}: {
  token: SettingsQueryToken;
  tableOptions: TableOption[];
  tableLabelById: Map<number, string>;
  selectedIds: number[];
  saving: boolean;
  onToggleTable: (tableId: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const missingIds = selectedIds.filter((id) => !tableLabelById.has(id));
  return (
    <div className="cv-report-modal-backdrop" role="presentation">
      <section className="cv-report-modal cv-query-token-modal cv-query-token-modal--wide" role="dialog" aria-label="授权日志表">
        <div className="cv-panel-header">
          <div>
            <div className="cv-settings-section-eyebrow">Grant</div>
            <h2 className="cv-panel-title">授权日志表：{token.name}</h2>
          </div>
          <button type="button" className="cv-secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>
        {missingIds.length > 0 ? (
          <div className="cv-settings-banner cv-settings-banner--error">
            <strong>结构未同步</strong>
            <span>有 {missingIds.length} 个已授权表 ID 暂时不在日志库树中。</span>
          </div>
        ) : null}
        <TablePicker tableOptions={tableOptions} selectedIds={selectedIds} onToggleTable={onToggleTable} />
        <div className="cv-settings-action-row">
          <button type="button" className="cv-secondary-button" onClick={onClose}>
            取消
          </button>
          <button type="button" className="cv-action-button" onClick={onSubmit} disabled={saving}>
            {saving ? "保存中" : "保存授权"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TablePicker({
  tableOptions,
  selectedIds,
  onToggleTable
}: {
  tableOptions: TableOption[];
  selectedIds: number[];
  onToggleTable: (tableId: number) => void;
}) {
  return (
    <div className="cv-form-row">
      <span className="cv-label">授权日志表</span>
      {tableOptions.length === 0 ? (
        <div className="cv-settings-empty">暂无可授权日志表，请先同步数据结构。</div>
      ) : (
        <div className="cv-query-token-table-picker">
          {tableOptions.map((table) => (
            <label key={table.id} className="cv-query-token-table-option">
              <input type="checkbox" checked={selectedIds.includes(table.id)} onChange={() => onToggleTable(table.id)} />
              <span>
                <strong>{table.databaseName}.{table.tableName}</strong>
                <small>{table.instanceName}</small>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditModal({
  token,
  audits,
  loading,
  onClose
}: {
  token: SettingsQueryToken;
  audits: SettingsQueryTokenAudit[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="cv-report-modal-backdrop" role="presentation">
      <section className="cv-report-modal cv-query-token-modal cv-query-token-modal--wide" role="dialog" aria-label="查询审计">
        <div className="cv-panel-header">
          <div>
            <div className="cv-settings-section-eyebrow">Audit</div>
            <h2 className="cv-panel-title">最近查询：{token.name}</h2>
          </div>
          <button type="button" className="cv-secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>
        {loading ? (
          <div className="cv-settings-empty">正在加载审计记录...</div>
        ) : audits.length === 0 ? (
          <div className="cv-settings-empty">暂无查询审计记录。</div>
        ) : (
          <div className="cv-table-wrap cv-table-wrap--compact cv-query-token-audit-wrap">
            <table className="cv-table cv-settings-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>日志表</th>
                  <th>状态</th>
                  <th>数量 / 耗时</th>
                  <th>来源</th>
                  <th>请求</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr key={audit.id}>
                    <td>{formatUnixTime(audit.ctime)}</td>
                    <td>{audit.databaseName}.{audit.tableName}</td>
                    <td>
                      <span className={`cv-settings-status ${audit.status === "success" ? "cv-settings-status--ok" : "cv-settings-status--error"}`}>
                        {audit.status === "success" ? "成功" : "失败"}
                      </span>
                    </td>
                    <td>{audit.resultCount} 条 / {audit.costMs}ms</td>
                    <td>{audit.clientIp || "-"}</td>
                    <td>
                      <code className="cv-code cv-query-token-query-json">
                        {audit.errorMessage || audit.queryJson || "-"}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
