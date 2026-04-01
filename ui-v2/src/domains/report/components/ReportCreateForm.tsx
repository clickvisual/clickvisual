import { useEffect, useRef, useState } from "react";
import type {
  ReportBuilderTimeRange,
  ReportBuilderInput,
  ReportCreatePayload,
  ReportMetricInput,
  ReportSourceColumn,
  ReportSourceDatabase,
  ReportSourceInstance,
  ReportSourceTable
} from "../types/contracts";

type Props = {
  instances: ReportSourceInstance[];
  databases: ReportSourceDatabase[];
  tables: ReportSourceTable[];
  columns: ReportSourceColumn[];
  isLoadingDatabases?: boolean;
  isLoadingTables?: boolean;
  isLoadingColumns?: boolean;
  mode?: "create" | "edit";
  initialValue?: {
    reportId?: number;
    name: string;
    builder: ReportBuilderInput;
  } | null;
  isSubmitting: boolean;
  onInstanceChange: (instanceId: number) => Promise<void>;
  onDatabaseChange: (instanceId: number, database: string) => Promise<void>;
  onLoadColumns: (instanceId: number, database: string, table: string) => Promise<void>;
  onSubmit: (payload: ReportCreatePayload) => Promise<void>;
};

function buildPreview(
  database: string,
  table: string,
  timeField: string,
  timeRange: ReportBuilderTimeRange,
  where: string,
  metrics: ReportMetricInput[]
) {
  if (!database || !table || !timeField || metrics.length === 0) {
    return "选择实例、数据库、数据表和时间字段后显示 SQL 预览。";
  }
  const duration = timeRange === "1d" ? "1 DAY" : "1 HOUR";
  const whereClause = where.trim() ? ` AND (${where.trim()})` : "";
  return [
    "WITH now() AS current_end,",
    `current_end - INTERVAL ${duration} AS current_start,`,
    "current_end - INTERVAL 1 DAY AS previous_end,",
    `previous_end - INTERVAL ${duration} AS previous_start`,
    `SELECT * FROM \`${database}\`.\`${table}\``,
    `WHERE ${timeField} >= current_start AND ${timeField} < current_end${whereClause}`,
    `-- metrics: ${metrics.map((metric) => metric.label).join(", ")}`
  ].join("\n");
}

function buildCountOnlyMetrics(): ReportMetricInput[] {
  return [{ key: "count", label: "总量" }];
}

export default function ReportCreateForm({
  instances,
  databases,
  tables,
  columns,
  isLoadingDatabases = false,
  isLoadingTables = false,
  isLoadingColumns = false,
  mode = "create",
  initialValue = null,
  isSubmitting,
  onInstanceChange,
  onDatabaseChange,
  onLoadColumns,
  onSubmit
}: Props) {
  const safeInstances = Array.isArray(instances) ? instances : [];
  const safeDatabases = Array.isArray(databases) ? databases : [];
  const safeTables = Array.isArray(tables) ? tables : [];
  const safeColumns = Array.isArray(columns) ? columns : [];
  const [name, setName] = useState(initialValue?.name ?? "错误日志小时报");
  const [reportId, setReportId] = useState<number | undefined>(initialValue?.reportId);
  const [instanceId, setInstanceId] = useState(
    () => initialValue?.builder.instanceId ?? safeInstances[0]?.id ?? 0
  );
  const [database, setDatabase] = useState(
    () => initialValue?.builder.database ?? safeDatabases[0]?.name ?? ""
  );
  const [table, setTable] = useState(
    () => initialValue?.builder.table ?? safeTables[0]?.name ?? ""
  );
  const [timeField, setTimeField] = useState(initialValue?.builder.timeField ?? "");
  const [timeRange, setTimeRange] = useState<ReportBuilderTimeRange>(
    initialValue?.builder.timeRange ?? "1h"
  );
  const [where, setWhere] = useState(initialValue?.builder.where ?? "level = 'error'");
  const [metrics, setMetrics] = useState<ReportMetricInput[]>(buildCountOnlyMetrics());
  const onInstanceChangeRef = useRef(onInstanceChange);
  const onLoadColumnsRef = useRef(onLoadColumns);
  const requestedDatabasesInstanceIdRef = useRef<number | null>(null);
  const requestedColumnsKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onInstanceChangeRef.current = onInstanceChange;
  }, [onInstanceChange]);

  useEffect(() => {
    onLoadColumnsRef.current = onLoadColumns;
  }, [onLoadColumns]);

  useEffect(() => {
    if (!initialValue) {
      return;
    }
    setReportId(initialValue.reportId);
    setName(initialValue.name);
    setInstanceId(initialValue.builder.instanceId);
    setDatabase(initialValue.builder.database);
    setTable(initialValue.builder.table);
    setTimeField(initialValue.builder.timeField);
    setTimeRange(initialValue.builder.timeRange);
    setWhere(initialValue.builder.where);
    setMetrics(buildCountOnlyMetrics());
  }, [
    initialValue?.reportId,
    initialValue?.name,
    initialValue?.builder.instanceId,
    initialValue?.builder.database,
    initialValue?.builder.table,
    initialValue?.builder.timeField,
    initialValue?.builder.timeRange,
    initialValue?.builder.where
  ]);

  useEffect(() => {
    if (safeInstances.length > 0 && instanceId === 0) {
      const nextInstanceId = safeInstances[0].id;
      setInstanceId(nextInstanceId);
      requestedDatabasesInstanceIdRef.current = nextInstanceId;
      void onInstanceChangeRef.current(nextInstanceId);
    }
  }, [instanceId, safeInstances]);

  useEffect(() => {
    if (
      instanceId > 0 &&
      safeDatabases.length === 0 &&
      !isLoadingDatabases &&
      requestedDatabasesInstanceIdRef.current !== instanceId
    ) {
      requestedDatabasesInstanceIdRef.current = instanceId;
      void onInstanceChangeRef.current(instanceId);
    }
  }, [instanceId, isLoadingDatabases, safeDatabases.length]);

  useEffect(() => {
    if (!database && safeDatabases.length > 0) {
      setDatabase(safeDatabases[0].name);
    }
  }, [database, safeDatabases]);

  useEffect(() => {
    if (!table && safeTables.length > 0) {
      setTable(safeTables[0].name);
    }
  }, [safeTables, table]);

  useEffect(() => {
    if (instanceId > 0 && database && table) {
      const requestKey = `${instanceId}:${database}:${table}`;
      if (requestedColumnsKeyRef.current === requestKey) {
        return;
      }
      requestedColumnsKeyRef.current = requestKey;
      void onLoadColumnsRef.current(instanceId, database, table);
    }
  }, [database, instanceId, table]);

  useEffect(() => {
    if (!timeField && safeColumns.length > 0) {
      const autoField =
        safeColumns.find((column) =>
          ["event_time", "timestamp", "time"].includes(column.field)
        )?.field ?? safeColumns[0]?.field ?? "";
      setTimeField(autoField);
    }
  }, [safeColumns, timeField]);

  const preview = buildPreview(database, table, timeField, timeRange, where, metrics);
  const noTables =
    Boolean(database) && !isLoadingTables && safeTables.length === 0;
  const noColumns =
    Boolean(table) && !isLoadingColumns && safeColumns.length === 0;
  const submitDisabled =
    isSubmitting ||
    safeInstances.length === 0 ||
    isLoadingDatabases ||
    isLoadingTables ||
    isLoadingColumns ||
    !database ||
    !table ||
    !timeField;

  return (
    <section className="cv-panel cv-panel-soft">
      <div className="cv-panel-header">
        <div>
          <h2 className="cv-panel-title">
            {mode === "edit" ? "编辑真实报表" : "创建真实报表"}
          </h2>
          <p className="cv-panel-description">
            选择实例、库、表和时间字段，只填写 WHERE 条件与指标，系统自动组装 SQL。
          </p>
        </div>
      </div>
      {safeInstances.length === 0 ? (
        <div className="cv-status-card" role="alert">
          当前没有可用的数据源实例，请先在 v1 或配置中心完成 ClickHouse 数据源配置。
        </div>
      ) : null}
      <form
        className="cv-section-stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (safeInstances.length === 0) {
            return;
          }
          void onSubmit({
            reportId,
            name,
            builder: {
              instanceId,
              database,
              table,
              timeField,
              timeRange,
              where,
              metrics
            }
          });
        }}
      >
        <div className="cv-form-two-up">
          <label className="cv-form-row">
            <span className="cv-label">报表名称</span>
            <input
              aria-label="报表名称"
              className="cv-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="cv-form-row">
            <span className="cv-label">时间范围</span>
            <select
              aria-label="时间范围"
              className="cv-input"
              value={timeRange}
              onChange={(event) =>
                setTimeRange(event.target.value as ReportBuilderTimeRange)
              }
            >
              <option value="1h">近 1 小时</option>
              <option value="1d">近 1 天</option>
            </select>
          </label>
        </div>

        <div className="cv-form-two-up">
          <label className="cv-form-row">
            <span className="cv-label">数据源实例</span>
            <select
              aria-label="数据源实例"
              className="cv-input"
              value={instanceId}
              disabled={isLoadingDatabases || isLoadingTables || isLoadingColumns}
              onChange={(event) => {
                const nextId = Number(event.target.value);
                setInstanceId(nextId);
                setDatabase("");
                setTable("");
                setTimeField("");
                void onInstanceChange(nextId);
              }}
            >
              {safeInstances.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="cv-form-row">
            <span className="cv-label">数据库</span>
            <select
              aria-label="数据库"
              className="cv-input"
              value={database}
              disabled={isLoadingDatabases || isLoadingTables || isLoadingColumns}
              onChange={(event) => {
                const nextDatabase = event.target.value;
                setDatabase(nextDatabase);
                setTable("");
                setTimeField("");
                void onDatabaseChange(instanceId, nextDatabase);
              }}
            >
              {safeDatabases.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="cv-form-two-up">
          <label className="cv-form-row">
            <span className="cv-label">数据表</span>
            <select
              aria-label="数据表"
              className="cv-input"
              value={table}
              disabled={isLoadingTables || isLoadingColumns}
              onChange={(event) => {
                setTable(event.target.value);
                setTimeField("");
              }}
            >
              {safeTables.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="cv-form-row">
            <span className="cv-label">时间字段</span>
            <select
              aria-label="时间字段"
              className="cv-input"
              value={timeField}
              disabled={isLoadingColumns}
              onChange={(event) => setTimeField(event.target.value)}
            >
              {safeColumns.map((column) => (
                <option key={column.field} value={column.field}>
                  {column.field}
                </option>
              ))}
            </select>
          </label>
        </div>

        {noTables ? (
          <div className="cv-status-card" role="alert">
            当前数据库下没有可用数据表，请切换到有业务数据的库。
          </div>
        ) : null}

        {database && isLoadingTables ? (
          <div className="cv-status-card" role="status">
            正在加载当前数据库的数据表...
          </div>
        ) : null}

        {noColumns ? (
          <div className="cv-status-card" role="alert">
            当前数据表没有可读取字段，请更换数据表。
          </div>
        ) : null}

        {table && isLoadingColumns ? (
          <div className="cv-status-card" role="status">
            正在加载当前数据表的字段...
          </div>
        ) : null}

        <label className="cv-form-row">
          <span className="cv-label">WHERE 条件</span>
          <textarea
            aria-label="WHERE 条件"
            className="cv-input"
            value={where}
            onChange={(event) => setWhere(event.target.value)}
            rows={3}
          />
        </label>

        <label className="cv-form-row">
          <span className="cv-label">统计指标</span>
          <input aria-label="统计指标" className="cv-input" value="总量=count(*)" readOnly />
        </label>

        <div className="cv-form-row">
          <span className="cv-label">SQL 预览</span>
          <pre className="cv-code">{preview}</pre>
        </div>

        <button
          type="submit"
          className="cv-action-button"
          disabled={submitDisabled}
        >
          {isSubmitting
            ? mode === "edit"
              ? "保存中..."
              : "创建中..."
            : mode === "edit"
              ? "保存修改"
              : "确认创建"}
        </button>
      </form>
    </section>
  );
}
