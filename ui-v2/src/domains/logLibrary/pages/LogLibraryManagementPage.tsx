import { useEffect, useMemo, useState } from "react";
import {
  checkRoot,
  createLogLibrary,
  deleteLogLibrary,
  getTableColumns,
  getTableDDL,
  listLogLibraries,
  previewLogLibraryJSON,
  type LogLibraryJSONPreview,
  type LogLibraryPhysicalTable,
  type LogLibraryRow,
} from "../api/logLibrary";
import { listQuerySourceInstances } from "../../query/api/query";
import type { QuerySourceInstance } from "../../query/types/contracts";

type Inspector = { kind: "columns" | "ddl"; row: LogLibraryRow } | null;

export default function LogLibraryManagementPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [rows, setRows] = useState<LogLibraryRow[]>([]);
  const [instances, setInstances] = useState<QuerySourceInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [instanceId, setInstanceId] = useState<number | "">("");
  const [databaseName, setDatabaseName] = useState("");
  const [inspector, setInspector] = useState<Inspector>(null);
  const [physicalTables, setPhysicalTables] = useState<
    LogLibraryPhysicalTable[]
  >([]);
  const [activePhysicalTable, setActivePhysicalTable] = useState("");
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorError, setInspectorError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    databaseId: 0,
    tableName: "",
    timeField: "_time_second_",
    timeFieldType: 1,
    rawLogField: "_raw_log_",
    timeFieldParent: "",
    rawLogFieldParent: "",
    brokers: "kafka:9092",
    topics: "",
    source: "",
    desc: "",
  });
  const [preview, setPreview] = useState<LogLibraryJSONPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [nextRows, nextInstances] = await Promise.all([
        listLogLibraries(),
        listQuerySourceInstances(),
      ]);
      setRows(nextRows);
      setInstances(nextInstances);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "日志库加载失败",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void checkRoot().then((isRoot) => {
      setAuthorized(isRoot);
      if (isRoot) void load();
      else setLoading(false);
    });
  }, []);

  const databases = useMemo(() => {
    const selected = instances.find((item) => item.id === instanceId);
    return selected?.databases ?? [];
  }, [instances, instanceId]);

  const filteredRows = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      if (instanceId !== "" && row.iid !== instanceId) return false;
      if (databaseName && row.databaseName !== databaseName) return false;
      if (!query) return true;
      return [row.instanceName, row.databaseName, row.tableName, row.desc].some(
        (value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
      );
    });
  }, [rows, keyword, instanceId, databaseName]);

  function resetFilters(nextInstance: number | "") {
    setInstanceId(nextInstance);
    setDatabaseName("");
  }

  async function openInspector(kind: "columns" | "ddl", row: LogLibraryRow) {
    setInspector({ kind, row });
    setInspectorLoading(true);
    setInspectorError("");
    setPhysicalTables([]);
    setActivePhysicalTable("");
    try {
      const response =
        kind === "columns"
          ? await getTableColumns(row.iid, row.databaseName, row.tableName)
          : await getTableDDL(row.iid, row.databaseName, row.tableName);
      const tables = response.tables || [];
      setPhysicalTables(tables);
      setActivePhysicalTable(tables[0]?.name || "");
    } catch (inspectError) {
      setInspectorError(
        inspectError instanceof Error ? inspectError.message : "元数据加载失败",
      );
    } finally {
      setInspectorLoading(false);
    }
  }

  const selectedPhysicalTable =
    physicalTables.find(
      (physicalTable) => physicalTable.name === activePhysicalTable,
    ) || physicalTables[0];

  function ddlFor(table: LogLibraryPhysicalTable) {
    return `-- ${table.name}\n${table.ddl || ""}`;
  }

  async function copyDDL(content: string) {
    try {
      await navigator.clipboard?.writeText(content);
    } catch {
      setInspectorError("复制失败，请检查浏览器剪贴板权限");
    }
  }

  async function submitCreate() {
    if (
      !createForm.databaseId ||
      !createForm.tableName.trim() ||
      !createForm.source.trim() ||
      !preview
    ) {
      setError("请选择数据库、填写日志表名称，解析 JSON 后再创建");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createLogLibrary({
        databaseId: createForm.databaseId,
        tableName: createForm.tableName.trim(),
        typ: createForm.timeFieldType,
        days: 7,
        brokers: createForm.brokers.trim(),
        topics: createForm.topics.trim() || createForm.tableName.trim(),
        consumers: 1,
        timeField: createForm.timeField.trim(),
        rawLogField: createForm.rawLogField.trim(),
        timeFieldParent: createForm.timeFieldParent.trim(),
        rawLogFieldParent: createForm.rawLogFieldParent.trim(),
        source: createForm.source.trim(),
        createType: 6,
      });
      setCreateOpen(false);
      setCreateForm({
        databaseId: 0,
        tableName: "",
        timeField: "_time_second_",
        timeFieldType: 1,
        rawLogField: "_raw_log_",
        timeFieldParent: "",
        rawLogFieldParent: "",
        brokers: "kafka:9092",
        topics: "",
        source: "",
        desc: "",
      });
      setPreview(null);
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "日志库创建失败",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!createForm.databaseId || !createForm.source.trim()) {
      setError("请先选择数据库并粘贴 JSON 样例");
      return;
    }
    setPreviewing(true);
    setError("");
    try {
      const next = await previewLogLibraryJSON(
        createForm.databaseId,
        createForm.source.trim(),
      );
      setPreview(next);
      setCreateForm((current) => ({
        ...current,
        timeField: next.timeField,
        timeFieldType: next.timeFieldType,
        timeFieldParent: next.timeFieldParent || "",
        rawLogField: next.rawLogField,
        rawLogFieldParent: next.rawLogFieldParent || "",
      }));
    } catch (previewError) {
      setPreview(null);
      setError(
        previewError instanceof Error ? previewError.message : "JSON 解析失败",
      );
    } finally {
      setPreviewing(false);
    }
  }

  function selectTimeCandidate(path: string) {
    const candidate = preview?.timeCandidates.find(
      (item) => item.path === path,
    );
    if (!candidate) return;
    setCreateForm((current) => ({
      ...current,
      timeField: candidate.key,
      timeFieldParent: candidate.parent || "",
      timeFieldType: candidate.timeFieldType || 1,
    }));
  }

  function selectRawCandidate(path: string) {
    const candidate = preview?.rawLogCandidates.find(
      (item) => item.path === path,
    );
    if (!candidate) return;
    setCreateForm((current) => ({
      ...current,
      rawLogField: candidate.key,
      rawLogFieldParent: candidate.parent || "",
    }));
  }

  async function confirmDelete(row: LogLibraryRow) {
    if (
      !window.confirm(
        `确认删除日志库 ${row.instanceName} / ${row.databaseName}.${row.tableName}？`,
      )
    )
      return;
    try {
      await deleteLogLibrary(row.id);
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "日志库删除失败",
      );
    }
  }

  if (authorized === null || loading) {
    return (
      <section className="cv-page cv-log-library-page">
        <div className="cv-settings-empty">日志管理加载中...</div>
      </section>
    );
  }
  if (!authorized) {
    return (
      <section className="cv-page cv-log-library-page">
        <div className="cv-settings-banner cv-settings-banner--error">
          <strong>无权限访问</strong>
          <span>日志管理仅允许 Root 用户使用。</span>
        </div>
      </section>
    );
  }

  return (
    <section className="cv-page cv-log-library-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb">
            <span>设置</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">日志管理</span>
          </div>
          <h1 className="cv-page-title">日志管理</h1>
          <p className="cv-page-description">
            集中管理实例下的日志库，并查看表结构与 DDL。
          </p>
        </div>
        <div className="cv-header-actions">
          <button
            type="button"
            className="cv-secondary-button"
            onClick={() => void load()}
          >
            刷新
          </button>
          <button
            type="button"
            className="cv-action-button"
            onClick={() => setCreateOpen(true)}
          >
            新增日志库
          </button>
        </div>
      </header>
      {error ? (
        <div className="cv-settings-banner cv-settings-banner--error">
          <strong>操作失败</strong>
          <span>{error}</span>
        </div>
      ) : null}
      <section className="cv-panel cv-log-library-panel">
        <div className="cv-log-library-filters">
          <input
            className="cv-text-input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索实例、数据库或表名"
          />
          <select
            className="cv-select"
            value={instanceId}
            onChange={(event) =>
              resetFilters(event.target.value ? Number(event.target.value) : "")
            }
          >
            <option value="">全部实例</option>
            {instances.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="cv-select"
            value={databaseName}
            onChange={(event) => setDatabaseName(event.target.value)}
            disabled={instanceId === ""}
          >
            <option value="">全部数据库</option>
            {databases.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <span className="cv-settings-chip">
            {filteredRows.length} 个日志库
          </span>
        </div>
        <div className="cv-table-wrap cv-table-wrap--compact">
          <table className="cv-table cv-settings-table">
            <thead>
              <tr>
                <th>日志库</th>
                <th>实例</th>
                <th>数据库</th>
                <th>说明</th>
                <th style={{ textAlign: "right" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.tableName}</strong>
                    <div className="cv-muted">ID #{row.id}</div>
                  </td>
                  <td>{row.instanceName}</td>
                  <td>{row.databaseName}</td>
                  <td>{row.desc || "-"}</td>
                  <td>
                    <div className="cv-settings-table-actions">
                      <button
                        type="button"
                        className="cv-secondary-button"
                        onClick={() => void openInspector("columns", row)}
                      >
                        结构
                      </button>
                      <button
                        type="button"
                        className="cv-secondary-button"
                        onClick={() => void openInspector("ddl", row)}
                      >
                        DDL
                      </button>
                      <button
                        type="button"
                        className="cv-secondary-button"
                        onClick={() => void confirmDelete(row)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length === 0 ? (
            <div className="cv-settings-empty">暂无匹配日志库</div>
          ) : null}
        </div>
      </section>
      {inspector ? (
        <div
          className="cv-report-modal-backdrop cv-log-library-inspector-backdrop"
          role="presentation"
          onClick={() => setInspector(null)}
        >
          <section
            className="cv-report-modal cv-log-library-inspector"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">
                  {inspector.kind === "columns" ? "Table Schema" : "Create SQL"}
                </div>
                <h2 className="cv-panel-title">
                  {inspector.row.databaseName}.{inspector.row.tableName}
                </h2>
                <div className="cv-log-library-inspector__meta">
                  {physicalTables.length > 0
                    ? `包含 ${physicalTables.length} 张物理表`
                    : "物理表信息"}
                </div>
              </div>
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setInspector(null)}
              >
                关闭
              </button>
            </div>
            {inspectorLoading ? (
              <div className="cv-settings-empty">加载中...</div>
            ) : inspectorError ? (
              <div className="cv-settings-banner cv-settings-banner--error">
                <span>{inspectorError}</span>
                <button
                  type="button"
                  className="cv-link-button"
                  onClick={() =>
                    void openInspector(inspector.kind, inspector.row)
                  }
                >
                  重试
                </button>
              </div>
            ) : physicalTables.length === 0 ? (
              <div className="cv-settings-empty">暂无物理表信息</div>
            ) : (
              <div className="cv-log-library-inspector__content">
                <div className="cv-log-library-inspector__toolbar">
                  <div
                    className="cv-log-library-inspector__tabs"
                    role="tablist"
                    aria-label="物理表"
                  >
                    {physicalTables.map((physicalTable) => {
                      const selected =
                        physicalTable.name ===
                        (selectedPhysicalTable?.name || activePhysicalTable);
                      return (
                        <button
                          key={physicalTable.name}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          className={`cv-log-library-inspector__tab${selected ? " is-active" : ""}`}
                          onClick={() =>
                            setActivePhysicalTable(physicalTable.name)
                          }
                        >
                          <span>{physicalTable.role || "table"}</span>
                          <code>{physicalTable.name.split(".").pop()}</code>
                        </button>
                      );
                    })}
                  </div>
                  {inspector.kind === "ddl" ? (
                    <div className="cv-settings-table-actions">
                      <button
                        type="button"
                        className="cv-secondary-button"
                        onClick={() =>
                          selectedPhysicalTable &&
                          void copyDDL(ddlFor(selectedPhysicalTable))
                        }
                        disabled={!selectedPhysicalTable}
                      >
                        复制当前 DDL
                      </button>
                      <button
                        type="button"
                        className="cv-secondary-button"
                        onClick={() =>
                          void copyDDL(physicalTables.map(ddlFor).join("\n\n"))
                        }
                      >
                        复制全部 DDL
                      </button>
                    </div>
                  ) : null}
                </div>
                {selectedPhysicalTable ? (
                  <section
                    className="cv-log-library-inspector__table"
                    key={selectedPhysicalTable.name}
                  >
                    <div className="cv-log-library-inspector__table-header">
                      <code>{selectedPhysicalTable.name}</code>
                      {selectedPhysicalTable.role ? (
                        <span className="cv-settings-chip">
                          {selectedPhysicalTable.role}
                        </span>
                      ) : null}
                    </div>
                    {inspector.kind === "columns" ? (
                      <div className="cv-table-wrap cv-table-wrap--compact">
                        <table className="cv-table">
                          <thead>
                            <tr>
                              <th>字段</th>
                              <th>类型</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedPhysicalTable.columns || []).map(
                              (column) => (
                                <tr
                                  key={`${selectedPhysicalTable.name}.${column.name}`}
                                >
                                  <td>
                                    <code>{column.name}</code>
                                  </td>
                                  <td>{column.typeDesc}</td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <pre className="cv-log-library-inspector__code">
                        {selectedPhysicalTable.ddl || "暂无 DDL"}
                      </pre>
                    )}
                  </section>
                ) : null}
              </div>
            )}
          </section>
        </div>
      ) : null}
      {createOpen ? (
        <div
          className="cv-report-modal-backdrop cv-log-library-create-backdrop"
          role="presentation"
        >
          <section
            className="cv-report-modal cv-log-library-create"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cv-log-library-create-title"
          >
            <div className="cv-log-library-create__header">
              <div>
                <div className="cv-settings-section-eyebrow">LOG LIBRARY</div>
                <h2 className="cv-panel-title" id="cv-log-library-create-title">
                  新增日志库
                </h2>
                <p className="cv-log-library-create__description">
                  将 ClickHouse 数据表登记为可查询的日志库。
                </p>
              </div>
              <button
                type="button"
                className="cv-icon-button cv-log-library-create__close"
                onClick={() => setCreateOpen(false)}
                aria-label="关闭新增日志库"
                title="关闭"
              >
                ×
              </button>
            </div>

            <div className="cv-log-library-create__body">
              <label className="cv-log-library-field">
                <span className="cv-log-library-field__label">
                  数据库 <em>必填</em>
                </span>
                <select
                  className="cv-select cv-log-library-field__control"
                  value={createForm.databaseId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      databaseId: Number(event.target.value),
                    }))
                  }
                >
                  <option value={0}>选择实例 / 数据库</option>
                  {instances.flatMap((instance) =>
                    instance.databases.map((database) => (
                      <option key={database.id} value={database.id}>
                        {instance.name} / {database.name}
                      </option>
                    )),
                  )}
                </select>
              </label>

              <label className="cv-log-library-field">
                <span className="cv-log-library-field__label">
                  JSON 日志样例 <em>必填</em>
                </span>
                <textarea
                  className="cv-text-input cv-log-library-field__control cv-log-library-json-input"
                  value={createForm.source}
                  onChange={(event) => {
                    setCreateForm((current) => ({
                      ...current,
                      source: event.target.value,
                    }));
                    setPreview(null);
                  }}
                  placeholder={
                    '粘贴一条 JSON 日志，例如：{"timestamp": 1710000000, "message": "hello", "level": "info"}'
                  }
                  rows={7}
                />
                <button
                  type="button"
                  className="cv-secondary-button"
                  onClick={() => void handlePreview()}
                  disabled={previewing}
                >
                  {previewing ? "解析中..." : "解析并预览"}
                </button>
              </label>

              {preview ? (
                <div className="cv-log-library-preview">
                  <div className="cv-log-library-preview__summary">
                    <strong>
                      {preview.mode === "cluster" ? "集群模式" : "单机模式"}
                    </strong>
                    <span>
                      将创建 {preview.tableCount} 张表：
                      {preview.tableRoles.join(" / ")}
                    </span>
                  </div>
                  <div className="cv-log-library-preview__fields">
                    <span>
                      时间字段：
                      <code>
                        {preview.timeField}
                        {preview.timeFieldParent
                          ? ` (${preview.timeFieldParent})`
                          : ""}
                      </code>
                    </span>
                    <span>
                      原始日志：
                      <code>
                        {preview.rawLogField}
                        {preview.rawLogFieldParent
                          ? ` (${preview.rawLogFieldParent})`
                          : ""}
                      </code>
                    </span>
                  </div>
                  <div className="cv-log-library-preview__field-list">
                    {preview.fields.slice(0, 24).map((field) => (
                      <span
                        key={field.path}
                        className={
                          field.isTime || field.isRawLog
                            ? "cv-settings-chip"
                            : "cv-muted"
                        }
                      >
                        <code>{field.path}</code> · {field.type}
                      </span>
                    ))}
                  </div>
                  <div className="cv-muted">
                    已识别 {preview.fields.length} 个 JSON 字段
                    {preview.fields.length > 24 ? "（仅展示前 24 个）" : ""}
                    ，创建前仍可调整字段。
                  </div>
                </div>
              ) : null}

              <label className="cv-log-library-field">
                <span className="cv-log-library-field__label">
                  日志表名 <em>必填</em>
                </span>
                <input
                  className="cv-text-input cv-log-library-field__control"
                  value={createForm.tableName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      tableName: event.target.value,
                    }))
                  }
                  placeholder="例如：app_logs"
                />
              </label>

              <div className="cv-log-library-create__grid">
                <label className="cv-log-library-field">
                  <span className="cv-log-library-field__label">
                    时间字段 <em>必选</em>
                  </span>
                  <select
                    className="cv-select cv-log-library-field__control"
                    value={
                      preview?.timeCandidates.find(
                        (item) =>
                          item.key === createForm.timeField &&
                          (item.parent || "") === createForm.timeFieldParent,
                      )?.path || ""
                    }
                    onChange={(event) =>
                      selectTimeCandidate(event.target.value)
                    }
                    disabled={!preview}
                  >
                    <option value="">选择时间字段</option>
                    {(preview?.timeCandidates || []).map((candidate) => (
                      <option key={candidate.path} value={candidate.path}>
                        {candidate.path} ·{" "}
                        {candidate.type === "Float64"
                          ? "数字时间戳"
                          : "字符串时间"}
                      </option>
                    ))}
                  </select>
                  <span className="cv-muted">
                    类型：
                    {createForm.timeFieldType === 2
                      ? "Float64（Unix 时间戳）"
                      : "String（日期时间文本）"}
                  </span>
                </label>
                <label className="cv-log-library-field">
                  <span className="cv-log-library-field__label">
                    原始日志字段 <em>必选</em>
                  </span>
                  <select
                    className="cv-select cv-log-library-field__control"
                    value={
                      preview?.rawLogCandidates.find(
                        (item) =>
                          item.key === createForm.rawLogField &&
                          (item.parent || "") === createForm.rawLogFieldParent,
                      )?.path || ""
                    }
                    onChange={(event) => selectRawCandidate(event.target.value)}
                    disabled={!preview}
                  >
                    <option value="">选择原始日志字段</option>
                    {(preview?.rawLogCandidates || []).map((candidate) => (
                      <option key={candidate.path} value={candidate.path}>
                        {candidate.path}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="cv-log-library-create__grid">
                <label className="cv-log-library-field">
                  <span className="cv-log-library-field__label">
                    Kafka Brokers
                  </span>
                  <input
                    className="cv-text-input cv-log-library-field__control"
                    value={createForm.brokers}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        brokers: event.target.value,
                      }))
                    }
                    placeholder="kafka:9092"
                  />
                </label>
                <label className="cv-log-library-field">
                  <span className="cv-log-library-field__label">
                    Kafka Topic
                  </span>
                  <input
                    className="cv-text-input cv-log-library-field__control"
                    value={createForm.topics}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        topics: event.target.value,
                      }))
                    }
                    placeholder="默认使用日志表名"
                  />
                </label>
              </div>
            </div>

            <div className="cv-log-library-create__footer">
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setCreateOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="cv-action-button"
                onClick={() => void submitCreate()}
                disabled={saving || !preview}
              >
                {saving ? "创建中..." : "创建日志库"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
