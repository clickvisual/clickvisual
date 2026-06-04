import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getQueryCharts,
  getQueryLogs,
  listQuerySourceInstances
} from "../../query/api/query";
import type {
  QueryHistogramBucket,
  QuerySourceInstance
} from "../../query/types/contracts";
import { listReportItems } from "../../report/api/report";
import type { ReportListItem } from "../../report/types/contracts";
import ModuleRuntimeGate, {
  useModuleRuntimeState
} from "../../../shared/components/ModuleRuntimeState";

type Metric = {
  label: string;
  value: string;
  trend: string;
  sparkline: number[];
  tone?: "default" | "danger";
};

type TrendPoint = {
  label: string;
  value: number;
};

type RankedItem = {
  name: string;
  value: string;
  detail: string;
  target?: OverviewTableTarget;
  query?: string;
};

type OverviewTableTarget = {
  id: number;
  instanceId: number;
  instanceName: string;
  databaseName: string;
  tableName: string;
};

type OverviewRuntimeData = {
  metrics: Metric[];
  volumeTrend: TrendPoint[];
  errorTrend: TrendPoint[];
  topServices: RankedItem[];
  topErrors: RankedItem[];
  tableCount: number;
  sampledTableCount: number;
};

type EventItem = {
  title: string;
  meta: string;
  status: string;
  href?: string;
};

const metrics: Metric[] = [
  {
    label: "今日日志量",
    value: "12,381,992",
    trend: "+8.4% vs 昨日",
    sparkline: [38, 44, 40, 52, 61, 58, 70]
  },
  {
    label: "错误日志占比",
    value: "0.75%",
    trend: "最近 1 小时抬升 0.12%",
    sparkline: [12, 14, 18, 20, 16, 24, 27],
    tone: "danger"
  },
  {
    label: "P95 查询耗时",
    value: "1.9s",
    trend: "高峰期仍低于 2.3s",
    sparkline: [30, 28, 35, 38, 32, 34, 31]
  },
  {
    label: "今日告警次数",
    value: "18",
    trend: "P1 规则触发 3 次",
    sparkline: [10, 18, 12, 28, 24, 22, 26]
  }
];

const volumeTrend: TrendPoint[] = [
  { label: "09:00", value: 36 },
  { label: "10:00", value: 42 },
  { label: "11:00", value: 58 },
  { label: "12:00", value: 64 },
  { label: "13:00", value: 60 },
  { label: "14:00", value: 72 }
];

const errorTrend: TrendPoint[] = [
  { label: "09:00", value: 14 },
  { label: "10:00", value: 18 },
  { label: "11:00", value: 16 },
  { label: "12:00", value: 26 },
  { label: "13:00", value: 24 },
  { label: "14:00", value: 30 }
];

const topServices: RankedItem[] = [
  { name: "svc-auth", value: "32%", detail: "login timeout 上升" },
  { name: "svc-payment", value: "21%", detail: "error 分布集中在 callback" },
  { name: "svc-gateway", value: "16%", detail: "trace 请求量增长" },
  { name: "svc-order", value: "11%", detail: "慢查询占比升高" }
];

const topErrors: RankedItem[] = [
  { name: "DB_TIMEOUT", value: "4,201", detail: "/login 与 /token" },
  { name: "UPSTREAM_RESET", value: "1,488", detail: "集中在华东机房" },
  { name: "NO_SUCH_INDEX", value: "962", detail: "query 模板仍待优化" },
  { name: "JSON_PARSE_FAIL", value: "412", detail: "新字段未完成 schema 映射" }
];

const fallbackRuntimeData: OverviewRuntimeData = {
  metrics,
  volumeTrend,
  errorTrend,
  topServices,
  topErrors,
  tableCount: 0,
  sampledTableCount: 0
};

const loadingRuntimeData: OverviewRuntimeData = {
  metrics: [
    { label: "最近 1 小时日志量", value: "--", trend: "真实数据加载中", sparkline: [0] },
    { label: "错误日志占比", value: "--", trend: "真实数据加载中", sparkline: [0] },
    { label: "查询接口耗时", value: "--", trend: "真实数据加载中", sparkline: [0] },
    { label: "接入日志表", value: "--", trend: "真实数据加载中", sparkline: [0] }
  ],
  volumeTrend: [],
  errorTrend: [],
  topServices: [],
  topErrors: [],
  tableCount: 0,
  sampledTableCount: 0
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value)));
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function formatReportUpdatedAt(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "更新时间未知";
  }
  return `更新于 ${date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function getReportStatusLabel(status: ReportListItem["status"]) {
  return status === "enabled" ? "启用" : "停用";
}

function buildReportEvents(items: ReportListItem[]): EventItem[] {
  return [...items]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5)
    .map((item) => ({
      title: item.name,
      meta: `${formatReportUpdatedAt(item.updatedAt)} · ${item.desc || `#${item.id}`}`,
      status: getReportStatusLabel(item.status),
      href: `/v2/reports/${item.id}`
    }));
}

function flattenOverviewTables(instances: QuerySourceInstance[]): OverviewTableTarget[] {
  return instances.flatMap((instance) =>
    instance.databases.flatMap((database) =>
      database.tables.map((table) => ({
        id: table.id,
        instanceId: instance.id,
        instanceName: instance.name,
        databaseName: database.name,
        tableName: table.name
      }))
    )
  );
}

function normalizeTrendFromBuckets(buckets: QueryHistogramBucket[], fallbackValue: number) {
  const source = buckets.length > 0 ? buckets.slice(-6) : [{ count: fallbackValue, from: 0, to: 0, progress: "" }];
  const max = Math.max(...source.map((item) => item.count), 1);
  return source.map((item, index) => ({
    label: item.from > 0 ? new Date(item.from * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : `${index + 1}`,
    value: item.count > 0 ? Math.max(4, Math.round((item.count / max) * 100)) : 0
  }));
}

function buildSparkline(points: TrendPoint[]) {
  const values = points.map((item) => item.value);
  return values.length > 0 ? values : [0];
}

function buildQueryTableUrl(target: OverviewTableTarget, query?: string) {
  const params = new URLSearchParams({
    instanceId: String(target.instanceId),
    database: target.databaseName,
    table: target.tableName,
    tableId: String(target.id)
  });
  if (query) {
    params.set("query", query);
  }
  return `/v2/query?${params.toString()}`;
}

function sumBucketCounts(buckets: QueryHistogramBucket[]) {
  return buckets.reduce((sum, item) => sum + Math.max(0, Number(item.count) || 0), 0);
}

function mergeHistogramBuckets(bucketGroups: QueryHistogramBucket[][]) {
  const bucketMap = new Map<number, QueryHistogramBucket>();

  bucketGroups.flat().forEach((bucket) => {
    const key = bucket.from || bucket.to;
    const current = bucketMap.get(key);
    if (!current) {
      bucketMap.set(key, { ...bucket, count: Math.max(0, Number(bucket.count) || 0) });
      return;
    }
    current.count += Math.max(0, Number(bucket.count) || 0);
    current.to = Math.max(current.to, bucket.to);
  });

  return [...bucketMap.values()].sort((left, right) => left.from - right.from);
}

function buildErrorRateTrend(totalBuckets: QueryHistogramBucket[], errorBuckets: QueryHistogramBucket[]) {
  if (totalBuckets.length === 0) {
    return [];
  }

  const errorBucketMap = new Map(errorBuckets.map((bucket) => [bucket.from || bucket.to, bucket]));
  return totalBuckets.slice(-6).map((bucket, index) => {
    const key = bucket.from || bucket.to;
    const errorCount = Math.max(0, Number(errorBucketMap.get(key)?.count) || 0);
    const totalCount = Math.max(0, Number(bucket.count) || 0);
    const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
    return {
      label: bucket.from > 0
        ? new Date(bucket.from * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
        : `${index + 1}`,
      value: Number(errorRate.toFixed(errorRate >= 10 ? 1 : 2))
    };
  });
}

async function loadOverviewRuntimeData(): Promise<OverviewRuntimeData> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const oneHourAgo = nowSeconds - 60 * 60;
  const instances = await listQuerySourceInstances();
  const tables = flattenOverviewTables(instances);
  const sampledTables = tables.slice(0, 6);

  const tableResults = await Promise.all(
    sampledTables.map(async (table) => {
      const [logsResult, errorResult, chartsResult, errorChartsResult] = await Promise.allSettled([
        getQueryLogs(table.id, { st: oneHourAgo, et: nowSeconds, page: 1, pageSize: 1 }),
        getQueryLogs(table.id, { st: oneHourAgo, et: nowSeconds, page: 1, pageSize: 1, query: "_raw_log_ like '%ERROR%'" }),
        getQueryCharts(table.id, { st: oneHourAgo, et: nowSeconds, page: 1, pageSize: 1 }),
        getQueryCharts(table.id, { st: oneHourAgo, et: nowSeconds, page: 1, pageSize: 1, query: "_raw_log_ like '%ERROR%'" })
      ]);
      const buckets = chartsResult.status === "fulfilled" ? chartsResult.value : [];
      const errorBuckets = errorChartsResult.status === "fulfilled" ? errorChartsResult.value : [];
      const chartCount = sumBucketCounts(buckets);
      const logCount = logsResult.status === "fulfilled" ? logsResult.value.count : 0;
      const errorChartCount = sumBucketCounts(errorBuckets);
      const errorLogCount = errorResult.status === "fulfilled" ? errorResult.value.count : 0;
      return {
        table,
        count: chartCount || logCount,
        cost: logsResult.status === "fulfilled" ? logsResult.value.cost : 0,
        errorCount: errorChartCount || errorLogCount,
        buckets,
        errorBuckets
      };
    })
  );

  const totalLogs = tableResults.reduce((sum, item) => sum + item.count, 0);
  const totalErrors = tableResults.reduce((sum, item) => sum + item.errorCount, 0);
  const maxCost = tableResults.reduce((max, item) => Math.max(max, item.cost), 0);
  const mergedBuckets = mergeHistogramBuckets(tableResults.map((item) => item.buckets));
  const mergedErrorBuckets = mergeHistogramBuckets(tableResults.map((item) => item.errorBuckets));
  const volumePoints = normalizeTrendFromBuckets(mergedBuckets, totalLogs);
  const errorPoints = buildErrorRateTrend(mergedBuckets, mergedErrorBuckets);
  const topByVolume = [...tableResults].sort((left, right) => right.count - left.count).slice(0, 4);
  const topByError = [...tableResults]
    .filter((item) => item.errorCount > 0)
    .sort((left, right) => right.errorCount - left.errorCount)
    .slice(0, 4);
  const errorRate = totalLogs > 0 ? (totalErrors / totalLogs) * 100 : 0;

  return {
    tableCount: tables.length,
    sampledTableCount: sampledTables.length,
    metrics: [
      {
        label: "最近 1 小时日志量",
        value: formatNumber(totalLogs),
        trend: `来自 ${sampledTables.length}/${tables.length} 张日志表`,
        sparkline: buildSparkline(volumePoints)
      },
      {
        label: "错误日志占比",
        value: formatPercent(errorRate),
        trend: `ERROR 命中 ${formatNumber(totalErrors)} 条`,
        sparkline: buildSparkline(errorPoints),
        tone: errorRate > 1 ? "danger" : "default"
      },
      {
        label: "查询接口耗时",
        value: `${formatNumber(maxCost)} ms`,
        trend: "最近一次聚合请求最大耗时",
        sparkline: tableResults.map((item) => Math.max(4, item.cost || 1))
      },
      {
        label: "接入日志表",
        value: formatNumber(tables.length),
        trend: `${instances.length} 个实例已纳入统计`,
        sparkline: [instances.length, tables.length, sampledTables.length, Math.max(tables.length, 1)]
      }
    ],
    volumeTrend: volumePoints,
    errorTrend: errorPoints,
    topServices: topByVolume.map((item) => ({
      name: item.table.tableName,
      value: formatNumber(item.count),
      detail: `${item.table.databaseName} · ${item.table.instanceName}`,
      target: item.table
    })),
    topErrors: topByError.map((item) => ({
      name: item.table.tableName,
      value: formatNumber(item.errorCount),
      detail: `${formatPercent(item.count > 0 ? (item.errorCount / item.count) * 100 : 0)} ERROR 占比`,
      target: item.table,
      query: "_raw_log_ like '%ERROR%'"
    }))
  };
}

function Sparkline({ points, tone = "default" }: { points: number[]; tone?: Metric["tone"] }) {
  const stroke = tone === "danger" ? "var(--cv-danger)" : "var(--cv-primary)";
  const safePoints = points.length > 0 ? points : [0];
  const max = Math.max(...safePoints);
  const min = Math.min(...safePoints);
  const range = Math.max(max - min, 1);
  const width = 96;
  const height = 26;
  const path = safePoints
    .map((point, index) => {
      const x = (index / Math.max(safePoints.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} style={{ width: 96, height: 26 }}>
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function SectionHeading({
  eyebrow,
  title,
  aside
}: {
  eyebrow?: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <header className="cv-workbench-section__header">
      <div>
        {eyebrow ? <p className="cv-workbench-section__eyebrow">{eyebrow}</p> : null}
        <h2 className="cv-workbench-section__title">{title}</h2>
      </div>
      {aside}
    </header>
  );
}

function TrendBars({ points, tone }: { points: TrendPoint[]; tone: "orange" | "red" }) {
  const color = tone === "red" ? "var(--cv-danger)" : "var(--cv-primary)";
  const soft = tone === "red" ? "#fca5a5" : "#fed7aa";
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  if (points.length === 0) {
    return <div className="cv-empty-inline">暂无趋势数据</div>;
  }

  return (
    <div className="cv-trend-bars" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
      {points.map((point) => (
        <div key={point.label} className="cv-trend-bars__item">
          <div className="cv-trend-bars__track">
            <div
              style={{
                width: "100%",
                height: point.value > 0 ? `${Math.max((point.value / maxValue) * 100, 2)}%` : 0,
                borderRadius: 999,
                background: `linear-gradient(180deg, ${color} 0%, ${soft} 100%)`
              }}
            />
          </div>
          <div className="cv-trend-bars__meta">
            <p className="cv-trend-bars__value">{point.value}%</p>
            <p className="cv-trend-bars__label">{point.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedList({ items, accent }: { items: RankedItem[]; accent: string }) {
  if (items.length === 0) {
    return <div className="cv-empty-inline">暂无可展示数据</div>;
  }

  return (
    <div className="cv-ranked-list">
      {items.map((item, index) => (
        <article key={item.name} className="cv-ranked-list__item">
          <span className="cv-ranked-list__index" style={{ color: accent, backgroundColor: `${accent}14` }}>
            {index + 1}
          </span>
          <div>
            {item.target ? (
              <Link className="cv-ranked-list__name cv-ranked-list__link" to={buildQueryTableUrl(item.target, item.query)}>
                {item.name}
              </Link>
            ) : (
              <p className="cv-ranked-list__name">{item.name}</p>
            )}
            <p className="cv-ranked-list__detail">{item.detail}</p>
          </div>
          <strong className="cv-ranked-list__value">{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function EventList({ items }: { items: EventItem[] }) {
  if (items.length === 0) {
    return <div className="cv-empty-inline">暂无真实报表数据</div>;
  }

  return (
    <div className="cv-event-list">
      {items.map((item) => (
        <article key={item.title} className="cv-event-list__item">
          <div>
            {item.href ? (
              <Link className="cv-event-list__title cv-event-list__link" to={item.href}>
                {item.title}
              </Link>
            ) : (
              <p className="cv-event-list__title">{item.title}</p>
            )}
            <p className="cv-event-list__meta">{item.meta}</p>
          </div>
          <span className="cv-event-list__status">{item.status}</span>
        </article>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { viewState } = useModuleRuntimeState();
  const [overviewData, setOverviewData] = useState<OverviewRuntimeData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [reportEvents, setReportEvents] = useState<EventItem[]>([]);
  const [reportEventsLoading, setReportEventsLoading] = useState(true);
  const [reportEventsError, setReportEventsError] = useState<string | null>(null);
  const runtime = useMemo(
    () => (overviewLoading && !overviewData ? loadingRuntimeData : overviewData ?? fallbackRuntimeData),
    [overviewData, overviewLoading]
  );
  const headerPills = useMemo(
    () => [
      "最近 1 小时",
      overviewLoading ? "加载中" : overviewError ? "真实数据不可用" : "真实数据",
      runtime.tableCount > 0 ? `${runtime.tableCount} 张日志表` : "暂无日志表",
      runtime.sampledTableCount > 0 ? `抽样 ${runtime.sampledTableCount} 张` : "静态兜底"
    ],
    [overviewError, overviewLoading, runtime.sampledTableCount, runtime.tableCount]
  );

  useEffect(() => {
    let ignore = false;
    setOverviewLoading(true);
    setOverviewError(null);

    loadOverviewRuntimeData()
      .then((data) => {
        if (ignore) {
          return;
        }
        setOverviewData(data);
      })
      .catch((error: unknown) => {
        if (ignore) {
          return;
        }
        setOverviewError(error instanceof Error ? error.message : "overview data load failed");
        setOverviewData(null);
      })
      .finally(() => {
        if (!ignore) {
          setOverviewLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setReportEventsLoading(true);
    setReportEventsError(null);

    listReportItems()
      .then((items) => {
        if (!ignore) {
          setReportEvents(buildReportEvents(items));
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setReportEvents([]);
          setReportEventsError(error instanceof Error ? error.message : "report list load failed");
        }
      })
      .finally(() => {
        if (!ignore) {
          setReportEventsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="cv-section-stack cv-overview-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>总览</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">总览大盘</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">总览大盘</h1>
        </div>
        <div className="cv-header-actions">
          {headerPills.map((item) => (
            <span key={item} className="cv-pill">
              {item}
            </span>
          ))}
        </div>
      </header>

      <ModuleRuntimeGate
        viewState={viewState}
        loadingTitle="总览聚合加载中"
        emptyTitle="当前没有总览聚合数据"
        errorTitle="总览聚合接口暂不可用"
      >
        <section className="cv-panel cv-workbench-section">
          <SectionHeading
            eyebrow="核心指标"
            title="KPI 概览区"
            aside={
              <span className="cv-chip">
                {overviewError ? "静态兜底" : `${runtime.metrics.length} 张卡`}
              </span>
            }
          />
          {overviewError ? <div className="cv-inline-notice">真实数据加载失败，当前展示静态兜底数据。</div> : null}
          <div className="cv-metric-grid">
            {runtime.metrics.map((metric) => (
              <article key={metric.label} className="cv-metric-card">
                <div className="cv-metric-card__header">
                  <p className="cv-metric-card__label">{metric.label}</p>
                  <Sparkline points={metric.sparkline} tone={metric.tone} />
                </div>
                <strong className="cv-metric-card__value">{metric.value}</strong>
                <span className={`cv-metric-card__trend${metric.tone === "danger" ? " cv-metric-card__trend--danger" : ""}`}>
                  {metric.trend}
                </span>
              </article>
            ))}
          </div>
        </section>

        <div className="cv-dashboard-shell">
          <div className="cv-dashboard-main">
            <section className="cv-panel cv-workbench-section">
              <SectionHeading eyebrow="趋势分析" title="日志量与错误率趋势" />
              <div className="cv-trend-grid">
                <div className="cv-subpanel">
                  <h3 className="cv-subpanel__title">日志量趋势</h3>
                  <TrendBars points={runtime.volumeTrend} tone="orange" />
                </div>
                <div className="cv-subpanel">
                  <h3 className="cv-subpanel__title">错误率趋势</h3>
                  <TrendBars points={runtime.errorTrend} tone="red" />
                </div>
              </div>
            </section>

            <section className="cv-panel cv-workbench-section">
              <SectionHeading eyebrow="热点与异常" title="Top 服务 / Top Error Code" />
              <div className="cv-rank-grid">
                <div>
                  <h3 className="cv-subpanel__title">Top 服务</h3>
                  <RankedList items={runtime.topServices} accent="var(--cv-primary)" />
                </div>
                <div>
                  <h3 className="cv-subpanel__title">Top Error Code</h3>
                  <RankedList items={runtime.topErrors} accent="var(--cv-danger)" />
                </div>
              </div>
            </section>

            <section className="cv-panel cv-workbench-section">
              <SectionHeading
                eyebrow="报表任务"
                title="最近报表"
                aside={
                  <span className="cv-chip">
                    {reportEventsLoading ? "加载中" : reportEventsError ? "真实数据不可用" : `${reportEvents.length} 项`}
                  </span>
                }
              />
              {reportEventsError ? <div className="cv-inline-notice">真实报表数据加载失败，当前不展示模拟数据。</div> : null}
              <EventList items={reportEvents} />
            </section>
          </div>
        </div>
      </ModuleRuntimeGate>
    </section>
  );
}
