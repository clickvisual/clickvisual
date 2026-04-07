import { useEffect, useRef, useState } from "react";
import type {
  ReportBlockInput,
  ReportBuilderInput,
  ReportBuilderTimeRange,
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

function buildCountOnlyMetrics(): ReportMetricInput[] {
  return [{ key: "count", label: "总量", groupBy: "", limit: 3 }];
}

function metricExpressionValue(metric: ReportMetricInput): string {
  if (stringsEqualIgnoreCase(metric.key, "topn")) {
    return "";
  }
  const expression = metric.expression?.trim() ?? "";
  if (expression) {
    return expression;
  }
  return stringsEqualIgnoreCase(metric.key, "count") || !metric.key ? "count(*)" : "";
}

function metricLimitValue(metric: ReportMetricInput): number {
  return typeof metric.limit === "number" && metric.limit > 0 ? metric.limit : 3;
}

function stringsEqualIgnoreCase(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function normalizeMetric(metric: ReportMetricInput): ReportMetricInput {
  const label = metric.label.trim();
  if (stringsEqualIgnoreCase(metric.key, "topn")) {
    return {
      key: "topn",
      label: label || "TopN",
      groupBy: metric.groupBy?.trim() ?? "",
      limit: metricLimitValue(metric)
    };
  }
  const expression = metricExpressionValue(metric).trim();
  if (stringsEqualIgnoreCase(expression, "count(*)")) {
    return {
      key: "count",
      label: label || "总量",
      groupBy: "",
      limit: 3
    };
  }
  return {
    key: "custom",
    label,
    expression,
    groupBy: "",
    limit: 3
  };
}

function createEmptyMetric(): ReportMetricInput {
  return {
    key: "custom",
    label: "",
    expression: "",
    groupBy: "",
    limit: 3
  };
}

function buildDefaultBlock(index = 0): ReportBlockInput {
  return {
    key: index === 0 ? "default" : `block_${index + 1}`,
    label: index === 0 ? "默认条件块" : `条件块 ${index + 1}`,
    where: index === 0 ? "level = 'error'" : "",
    metrics: buildCountOnlyMetrics()
  };
}

function normalizeBlocks(builder?: ReportBuilderInput | null): ReportBlockInput[] {
  if (builder?.blocks && builder.blocks.length > 0) {
    return builder.blocks.map((block, index) => ({
      key: block.key || (index === 0 ? "default" : `block_${index + 1}`),
      label: block.label || (index === 0 ? "默认条件块" : `条件块 ${index + 1}`),
      where: block.where || "",
      metrics: block.metrics?.length ? block.metrics : buildCountOnlyMetrics()
    }));
  }
  if (builder) {
    return [
      {
        key: "default",
        label: "默认条件块",
        where: builder.where || "level = 'error'",
        metrics: builder.metrics?.length ? builder.metrics : buildCountOnlyMetrics()
      }
    ];
  }
  return [buildDefaultBlock()];
}

function buildPreview(
  database: string,
  table: string,
  timeField: string,
  timeRange: ReportBuilderTimeRange,
  blocks: ReportBlockInput[]
) {
  if (!database || !table || !timeField || blocks.length === 0) {
    return "选择实例、数据库、数据表和时间字段后显示 SQL 预览。";
  }
  const duration = timeRange === "1d" ? "1 DAY" : "1 HOUR";
  const firstBlock = blocks[0];
  const whereClause = firstBlock?.where.trim() ? ` AND (${firstBlock.where.trim()})` : "";
  return [
    "WITH now() AS current_end,",
    `current_end - INTERVAL ${duration} AS current_start,`,
    "current_end - INTERVAL 1 DAY AS previous_end,",
    `previous_end - INTERVAL ${duration} AS previous_start`,
    `SELECT * FROM \`${database}\`.\`${table}\``,
    `WHERE ${timeField} >= current_start AND ${timeField} < current_end${whereClause}`,
    `-- metrics: ${blocks
      .flatMap((block) => block.metrics.map((metric) => `${block.label}:${metric.label}`))
      .join(", ")}`
  ].join("\n");
}

function isGroupableColumnType(columnType: string): boolean {
  const normalized = columnType.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("string") ||
    normalized.includes("enum") ||
    normalized.includes("ipv4") ||
    normalized.includes("ipv6") ||
    normalized.includes("uuid") ||
    normalized.includes("bool")
  );
}

function sortedGroupByOptions(columns: ReportSourceColumn[], currentValue: string): string[] {
  const preferred = ["pod", "host", "service", "app", "level", "namespace", "container"];
  const fieldSet = new Set(
    columns
      .filter((column) => isGroupableColumnType(column.type ?? ""))
      .map((column) => column.field?.trim() ?? "")
      .filter(Boolean)
  );
  if (currentValue.trim()) {
    fieldSet.add(currentValue.trim());
  }

  const fields = Array.from(fieldSet);
  fields.sort((left, right) => {
    const leftPreferred = preferred.indexOf(left);
    const rightPreferred = preferred.indexOf(right);
    if (leftPreferred !== -1 || rightPreferred !== -1) {
      if (leftPreferred === -1) {
        return 1;
      }
      if (rightPreferred === -1) {
        return -1;
      }
      return leftPreferred - rightPreferred;
    }
    return left.localeCompare(right);
  });
  return fields;
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
  const [blocks, setBlocks] = useState<ReportBlockInput[]>(() =>
    normalizeBlocks(initialValue?.builder)
  );
  const [metricGuideOpenBlockKey, setMetricGuideOpenBlockKey] = useState<string | null>(null);
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
    setBlocks(normalizeBlocks(initialValue.builder));
    setMetricGuideOpenBlockKey(null);
  }, [
    initialValue?.reportId,
    initialValue?.name,
    initialValue?.builder.instanceId,
    initialValue?.builder.database,
    initialValue?.builder.table,
    initialValue?.builder.timeField,
    initialValue?.builder.timeRange,
    initialValue?.builder.where,
    initialValue?.builder.blocks
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

  const preview = buildPreview(database, table, timeField, timeRange, blocks);
  const noTables = Boolean(database) && !isLoadingTables && safeTables.length === 0;
  const noColumns = Boolean(table) && !isLoadingColumns && safeColumns.length === 0;
  const hasInvalidMetrics = blocks.some(
    (block) =>
      block.metrics.length === 0 ||
      block.metrics.some(
        (metric) =>
          metric.label.trim() === "" ||
          (stringsEqualIgnoreCase(metric.key, "topn")
            ? (metric.groupBy?.trim() ?? "") === "" || metricLimitValue(metric) <= 0
            : metricExpressionValue(metric).trim() === "")
      )
  );
  const submitDisabled =
    isSubmitting ||
    safeInstances.length === 0 ||
    isLoadingDatabases ||
    isLoadingTables ||
    isLoadingColumns ||
    !database ||
    !table ||
    !timeField ||
    hasInvalidMetrics;

  return (
    <section className="cv-panel cv-panel-soft">
      <div className="cv-panel-header">
        <div>
          <h2 className="cv-panel-title">
            {mode === "edit" ? "编辑真实报表" : "创建真实报表"}
          </h2>
          <p className="cv-panel-description">
            选择实例、库、表和时间字段，按条件块配置范围与指标，系统自动组装 SQL。
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
              where: blocks[0]?.where ?? "",
              metrics:
                blocks[0]?.metrics.map(normalizeMetric) ?? buildCountOnlyMetrics(),
              blocks: blocks.map((block) => ({
                ...block,
                label: block.label.trim(),
                where: block.where,
                metrics: block.metrics.map(normalizeMetric)
              }))
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

        <div className="cv-form-row">
          <span className="cv-label">条件块</span>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <button
              type="button"
              className="cv-action-button"
              disabled={blocks.length >= 5}
              onClick={() =>
                setBlocks((current) => [...current, buildDefaultBlock(current.length)])
              }
            >
              新增条件块
            </button>
            <button
              type="button"
              className="cv-action-button"
              disabled={blocks.length === 0 || blocks.length >= 5}
              onClick={() =>
                setBlocks((current) => {
                  const source = current[current.length - 1] ?? buildDefaultBlock();
                  return [
                    ...current,
                    {
                      ...source,
                      key: `${source.key}_copy_${current.length + 1}`,
                      label: `${source.label} 副本`
                    }
                  ];
                })
              }
            >
              复制当前条件块
            </button>
          </div>

          {blocks.map((block, index) => (
            <div
              key={block.key || index}
              style={{
                border: "1px solid rgba(15, 23, 42, 0.12)",
                borderRadius: 12,
                padding: 12,
                marginBottom: 12
              }}
            >
              <label className="cv-form-row">
                <span className="cv-label">条件块名称</span>
                <input
                  aria-label="条件块名称"
                  className="cv-input"
                  value={block.label}
                  onChange={(event) =>
                    setBlocks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: event.target.value } : item
                      )
                    )
                  }
                />
              </label>

              <label className="cv-form-row">
                <span className="cv-label">WHERE 条件</span>
                <textarea
                  aria-label="WHERE 条件"
                  className="cv-input"
                  value={block.where}
                  onChange={(event) =>
                    setBlocks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, where: event.target.value } : item
                      )
                    )
                  }
                  rows={3}
                />
              </label>

              <div className="cv-form-row">
                <span className="cv-label">统计指标</span>
                <div className="cv-section-stack cv-section-stack--tight">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="cv-secondary-button"
                      onClick={() =>
                        setMetricGuideOpenBlockKey((current) =>
                          current === block.key ? null : block.key
                        )
                      }
                    >
                      填写说明
                    </button>
                    <button
                      type="button"
                      className="cv-secondary-button"
                      onClick={() =>
                        setBlocks((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, metrics: [...item.metrics, createEmptyMetric()] }
                              : item
                          )
                        )
                      }
                    >
                      新增指标
                    </button>
                  </div>

                  {metricGuideOpenBlockKey === block.key ? (
                    <div className="cv-status-card cv-status-card--compact" role="note">
                      <strong>怎么填写</strong>
                      <span className="cv-muted">
                        指标名称是推送里展示的名字，比如“总量”“平均耗时”“独立用户数”。
                      </span>
                      <span className="cv-muted">
                        表达式只填 ClickHouse 聚合表达式，不要写 SELECT、FROM、WHERE。
                      </span>
                      <span className="cv-muted">
                        可直接参考：`count(*)`、`avg(duration)`、`sum(bytes)`、`uniq(user_id)`。
                      </span>
                      <span className="cv-muted">
                        如果要看 TopN，例如 Top3 Pod，把指标类型改成“排行 TopN”，再填写分组字段如 `pod` 和数量。
                      </span>
                    </div>
                  ) : null}

                  {block.metrics.map((metric, metricIndex) => (
                    <div
                      key={`${block.key || index}-metric-${metricIndex}`}
                      className="cv-form-two-up"
                    >
                      <label className="cv-form-row">
                        <span className="cv-label">指标名称</span>
                        <input
                          aria-label={`指标名称 ${index + 1}-${metricIndex + 1}`}
                          className="cv-input"
                          placeholder="例如：总量、平均耗时"
                          value={metric.label}
                          onChange={(event) =>
                            setBlocks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      metrics: item.metrics.map((itemMetric, itemMetricIndex) =>
                                        itemMetricIndex === metricIndex
                                          ? { ...itemMetric, label: event.target.value }
                                          : itemMetric
                                      )
                                    }
                                  : item
                              )
                            )
                          }
                        />
                      </label>

                      <label className="cv-form-row">
                        <span className="cv-label">指标类型</span>
                        <select
                          aria-label={`指标类型 ${index + 1}-${metricIndex + 1}`}
                          className="cv-input"
                          value={stringsEqualIgnoreCase(metric.key, "topn") ? "topn" : "aggregate"}
                          onChange={(event) =>
                            setBlocks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      metrics: item.metrics.map((itemMetric, itemMetricIndex) =>
                                        itemMetricIndex === metricIndex
                                          ? event.target.value === "topn"
                                            ? {
                                                key: "topn",
                                                label: itemMetric.label,
                                                groupBy: itemMetric.groupBy ?? "",
                                                limit: metricLimitValue(itemMetric),
                                                expression: ""
                                              }
                                            : {
                                                key:
                                                  stringsEqualIgnoreCase(
                                                    metricExpressionValue(itemMetric),
                                                    "count(*)"
                                                  )
                                                    ? "count"
                                                    : "custom",
                                                label: itemMetric.label,
                                                expression:
                                                  metricExpressionValue(itemMetric) || "count(*)",
                                                groupBy: "",
                                                limit: 3
                                              }
                                          : itemMetric
                                      )
                                    }
                                  : item
                              )
                            )
                          }
                        >
                          <option value="aggregate">聚合指标</option>
                          <option value="topn">排行 TopN</option>
                        </select>
                      </label>

                      <label className="cv-form-row">
                        <span className="cv-label">
                          {stringsEqualIgnoreCase(metric.key, "topn") ? "分组字段" : "表达式"}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                          {stringsEqualIgnoreCase(metric.key, "topn") ? (
                            <select
                              aria-label={`分组字段 ${index + 1}-${metricIndex + 1}`}
                              className="cv-input"
                              value={metric.groupBy ?? ""}
                              onChange={(event) =>
                                setBlocks((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          metrics: item.metrics.map(
                                            (itemMetric, itemMetricIndex) =>
                                              itemMetricIndex === metricIndex
                                                ? {
                                                    ...itemMetric,
                                                    key: "topn",
                                                    groupBy: event.target.value
                                                  }
                                                : itemMetric
                                          )
                                        }
                                      : item
                                  )
                                )
                              }
                            >
                              <option value="">选择字段</option>
                              {sortedGroupByOptions(safeColumns, metric.groupBy ?? "").map((field) => (
                                <option key={field} value={field}>
                                  {field}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              aria-label={`表达式 ${index + 1}-${metricIndex + 1}`}
                              className="cv-input"
                              placeholder="例如：count(*) 或 avg(duration)"
                              value={metricExpressionValue(metric)}
                              onChange={(event) =>
                                setBlocks((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          metrics: item.metrics.map((itemMetric, itemMetricIndex) =>
                                            itemMetricIndex === metricIndex
                                              ? {
                                                  ...itemMetric,
                                                  key: "custom",
                                                  expression: event.target.value
                                                }
                                              : itemMetric
                                          )
                                        }
                                      : item
                                  )
                                )
                              }
                            />
                          )}
                          {stringsEqualIgnoreCase(metric.key, "topn") ? (
                            <input
                              aria-label={`TopN ${index + 1}-${metricIndex + 1}`}
                              className="cv-input"
                              style={{ maxWidth: 96 }}
                              type="number"
                              min={1}
                              max={10}
                              value={metricLimitValue(metric)}
                              onChange={(event) =>
                                setBlocks((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          metrics: item.metrics.map(
                                            (itemMetric, itemMetricIndex) =>
                                              itemMetricIndex === metricIndex
                                                ? {
                                                    ...itemMetric,
                                                    key: "topn",
                                                    limit: Number(event.target.value || "0")
                                                  }
                                                : itemMetric
                                          )
                                        }
                                      : item
                                  )
                                )
                              }
                            />
                          ) : null}
                          <button
                            type="button"
                            className="cv-secondary-button"
                            disabled={block.metrics.length <= 1}
                            onClick={() =>
                              setBlocks((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        metrics: item.metrics.filter(
                                          (_itemMetric, itemMetricIndex) =>
                                            itemMetricIndex !== metricIndex
                                        )
                                      }
                                    : item
                                )
                              )
                            }
                          >
                            删除
                          </button>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cv-form-row">
          <span className="cv-label">SQL 预览</span>
          <pre className="cv-code">{preview}</pre>
        </div>

        <button type="submit" className="cv-action-button" disabled={submitDisabled}>
          {isSubmitting
            ? mode === "edit"
              ? "保存中..."
              : "创建中..."
            : mode === "edit"
              ? "确认保存"
              : "确认创建"}
        </button>
      </form>
    </section>
  );
}
