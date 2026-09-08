import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ModuleRuntimeGate, {
  useModuleRuntimeState
} from "../../../shared/components/ModuleRuntimeState";
import { getOverviewSummary } from "../api/overview";
import type {
  OverviewAlarm,
  OverviewAlarmItem,
  OverviewDailyItem,
  OverviewIngestion,
  OverviewReport,
  OverviewSummary,
  OverviewTableItem
} from "../types/contracts";

type Metric = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "danger";
};

type RankedItem = {
  key: string;
  name: string;
  value: string;
  detail: string;
  href?: string;
};

type EventItem = {
  key: string;
  title: string;
  meta: string;
  status: string;
  tone?: "default" | "danger" | "muted";
  href?: string;
};

const numberFormatter = new Intl.NumberFormat("zh-CN");

function formatNumber(value: number) {
  return numberFormatter.format(Math.max(0, Math.round(Number(value) || 0)));
}

function formatBytes(value: number) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let current = bytes / 1024;
  let unitIndex = 0;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  return `${current.toFixed(current >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "--";
  }
  const value = (numerator / denominator) * 100;
  return `${value.toFixed(value >= 99.95 || value === 0 ? 0 : 1)}%`;
}

function formatUnixTime(seconds: number, options?: Intl.DateTimeFormatOptions) {
  if (!seconds) {
    return "时间未知";
  }
  return new Date(seconds * 1000).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...options
  });
}

function formatDuration(seconds: number) {
  if (seconds < 60) {
    return `${Math.max(0, seconds)}s`;
  }
  return `${Math.floor(seconds / 60)}m${seconds % 60 ? ` ${seconds % 60}s` : ""}`;
}

function buildQueryTableUrl(target: OverviewTableItem) {
  const params = new URLSearchParams({
    instanceId: String(target.instanceId),
    database: target.databaseName,
    table: target.tableName,
    tableId: String(target.tableId)
  });
  return `/v2/query?${params.toString()}`;
}

const alarmLevelLabels: Record<number, string> = {
  0: "告警",
  1: "通知",
  2: "严重"
};

const reportExecutionStatusLabels: Record<string, { label: string; tone: EventItem["tone"] }> = {
  running: { label: "运行中", tone: "default" },
  success: { label: "成功", tone: "default" },
  failed: { label: "失败", tone: "danger" },
  partial: { label: "部分成功", tone: "danger" }
};

function buildIngestionMetrics(data: OverviewIngestion): Metric[] {
  const leadingType = data.createTypes[0];
  return [
    {
      label: "日志库",
      value: formatNumber(data.tableCount),
      hint: `${formatNumber(data.instanceCount)} 个实例 · ${formatNumber(data.databaseCount)} 个数据库`
    },
    {
      label: "近 7 天新增",
      value: formatNumber(data.newTablesLast7Days),
      hint: data.newTablesLast7Days > 0 ? "按日志库创建时间统计" : "近 7 天没有新接入"
    },
    {
      label: "总行数",
      value: formatNumber(data.totalRows),
      hint:
        data.volumeUnavailableInstances.length > 0
          ? `${formatBytes(data.totalBytes)} · ${data.volumeUnavailableInstances.length} 个实例不可用`
          : `${formatBytes(data.totalBytes)} · 来自 system.tables`,
      tone: data.volumeUnavailableInstances.length > 0 ? "danger" : "default"
    },
    {
      label: "接入方式",
      value: formatNumber(data.createTypes.length),
      hint: leadingType ? `${leadingType.label} 占多数（${formatNumber(leadingType.count)}）` : "暂无接入记录"
    }
  ];
}

function buildAlarmMetrics(data: OverviewAlarm): Metric[] {
  const pushTotal = data.pushSuccess + data.pushFail + data.pushRepeat;
  return [
    {
      label: "告警规则",
      value: formatNumber(data.total),
      hint: `正常 ${formatNumber(data.normal)} · 已关闭 ${formatNumber(data.closed)}`
    },
    {
      label: "告警中",
      value: formatNumber(data.firing),
      hint: data.ruleCheck > 0 ? `规则异常 ${formatNumber(data.ruleCheck)} 条` : "规则状态正常",
      tone: data.firing > 0 || data.ruleCheck > 0 ? "danger" : "default"
    },
    {
      label: "今日触发",
      value: formatNumber(data.todayCount),
      hint: `近 7 天 ${formatNumber(data.last7DayCount)} 次`
    },
    {
      label: "推送成功率",
      value: formatPercent(data.pushSuccess, pushTotal),
      hint: `近 7 天成功 ${formatNumber(data.pushSuccess)} · 失败 ${formatNumber(data.pushFail)} · 重复 ${formatNumber(data.pushRepeat)}`,
      tone: data.pushFail > 0 ? "danger" : "default"
    }
  ];
}

function buildReportMetrics(data: OverviewReport): Metric[] {
  return [
    {
      label: "分析报表",
      value: formatNumber(data.total),
      hint: `启用 ${formatNumber(data.enabled)} · 停用 ${formatNumber(data.disabled)}`
    },
    {
      label: "定时任务",
      value: formatNumber(data.scheduleEnabled),
      hint: `共 ${formatNumber(data.scheduleTotal)} 个调度`
    },
    {
      label: "今日执行",
      value: formatNumber(data.todayExecutions),
      hint: `成功 ${formatNumber(data.todaySuccess)} · 失败 ${formatNumber(data.todayFailed)} · 部分 ${formatNumber(data.todayPartial)}`,
      tone: data.todayFailed > 0 ? "danger" : "default"
    },
    {
      label: "运行中",
      value: formatNumber(data.running),
      hint: data.running > 0 ? "存在尚未结束的执行" : "没有正在执行的报表"
    }
  ];
}

function buildTopTables(data: OverviewIngestion): RankedItem[] {
  return data.topTables.map((item) => ({
    key: `top-${item.tableId}`,
    name: item.tableName,
    value: formatNumber(item.totalRows),
    detail: `${item.instanceName} · ${item.databaseName} · ${formatBytes(item.totalBytes)}`,
    href: buildQueryTableUrl(item)
  }));
}

function buildRecentTables(data: OverviewIngestion): EventItem[] {
  const labels = new Map(data.createTypes.map((item) => [item.createType, item.label]));
  return data.recentTables.map((item) => ({
    key: `recent-${item.tableId}`,
    title: item.tableName,
    meta: `${formatUnixTime(item.ctime)} · ${item.instanceName} · ${item.databaseName}`,
    status: labels.get(item.createType) ?? `类型 ${item.createType}`,
    tone: "muted",
    href: buildQueryTableUrl(item)
  }));
}

function buildFiringAlarms(items: OverviewAlarmItem[]): EventItem[] {
  return items.map((item) => ({
    key: `alarm-${item.id}`,
    title: item.name,
    meta: `最近更新 ${formatUnixTime(item.utime)} · #${item.id}`,
    status: alarmLevelLabels[item.level] ?? `级别 ${item.level}`,
    tone: item.level === 2 ? "danger" : "default",
    href: "/v2/alerts/rules"
  }));
}

function buildRecentExecutions(data: OverviewReport): EventItem[] {
  return data.recentExecutions.map((item) => {
    const status = reportExecutionStatusLabels[item.status] ?? { label: item.status, tone: "muted" as const };
    return {
      key: `exec-${item.id}`,
      title: item.reportName || `报表 #${item.reportId}`,
      meta: `${formatUnixTime(item.startedAt)} · ${item.trigger === "schedule" ? "定时" : "手动"} · ${formatDuration(item.durationSeconds)}`,
      status: status.label,
      tone: status.tone,
      href: `/v2/reports/${item.reportId}`
    };
  });
}

function buildRecentReports(data: OverviewReport): EventItem[] {
  return data.recentReports.map((item) => ({
    key: `report-${item.id}`,
    title: item.name,
    meta: `更新于 ${formatUnixTime(item.utime)} · #${item.id}`,
    status: item.status === "enabled" ? "启用" : "停用",
    tone: item.status === "enabled" ? "default" : "muted",
    href: `/v2/reports/${item.id}`
  }));
}

function SectionHeading({
  eyebrow,
  title,
  aside
}: {
  eyebrow: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <header className="cv-workbench-section__header">
      <div>
        <p className="cv-workbench-section__eyebrow">{eyebrow}</p>
        <h2 className="cv-workbench-section__title">{title}</h2>
      </div>
      {aside}
    </header>
  );
}

function MetricGrid({ metrics, loading }: { metrics: Metric[]; loading: boolean }) {
  return (
    <div className="cv-metric-grid">
      {metrics.map((metric) => (
        <article key={metric.label} className="cv-metric-card">
          <p className="cv-metric-card__label">{metric.label}</p>
          <strong className="cv-metric-card__value">{loading ? "--" : metric.value}</strong>
          <span className={`cv-metric-card__trend${metric.tone === "danger" ? " cv-metric-card__trend--danger" : ""}`}>
            {loading ? "加载中" : metric.hint}
          </span>
        </article>
      ))}
    </div>
  );
}

function placeholderMetrics(labels: string[]): Metric[] {
  return labels.map((label) => ({ label, value: "--", hint: "" }));
}

function RankedList({ items, emptyText }: { items: RankedItem[]; emptyText: string }) {
  if (items.length === 0) {
    return <div className="cv-empty-inline">{emptyText}</div>;
  }
  return (
    <div className="cv-ranked-list">
      {items.map((item, index) => (
        <article key={item.key} className="cv-ranked-list__item">
          <span className="cv-ranked-list__index cv-overview-rank-index">{index + 1}</span>
          <div>
            {item.href ? (
              <Link className="cv-ranked-list__name cv-ranked-list__link" to={item.href}>
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

function EventList({ items, emptyText }: { items: EventItem[]; emptyText: string }) {
  if (items.length === 0) {
    return <div className="cv-empty-inline">{emptyText}</div>;
  }
  return (
    <div className="cv-event-list">
      {items.map((item) => (
        <article key={item.key} className="cv-event-list__item">
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
          <span
            className={`cv-event-list__status${
              item.tone === "danger"
                ? " cv-event-list__status--danger"
                : item.tone === "muted"
                  ? " cv-event-list__status--muted"
                  : ""
            }`}
          >
            {item.status}
          </span>
        </article>
      ))}
    </div>
  );
}

function DailyTrend({ points }: { points: OverviewDailyItem[] }) {
  if (points.length === 0) {
    return <div className="cv-empty-inline">暂无触发记录</div>;
  }
  const maxValue = Math.max(...points.map((point) => point.count), 1);
  return (
    <div
      className="cv-trend-bars cv-overview-trend"
      role="img"
      aria-label={`近 7 天告警触发趋势：${points.map((point) => `${point.date} ${point.count} 次`).join("，")}`}
    >
      {points.map((point) => (
        <div key={point.date} className="cv-trend-bars__item">
          <div className="cv-trend-bars__track">
            <div
              className="cv-overview-trend__bar"
              style={{ height: point.count > 0 ? `${Math.max((point.count / maxValue) * 100, 4)}%` : 0 }}
            />
          </div>
          <div className="cv-trend-bars__meta">
            <p className="cv-trend-bars__value">{formatNumber(point.count)}</p>
            <p className="cv-trend-bars__label">{point.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateTypeChips({ data }: { data: OverviewIngestion }) {
  if (data.createTypes.length === 0) {
    return null;
  }
  return (
    <div className="cv-overview-chip-row" aria-label="接入方式分布">
      {data.createTypes.map((item) => (
        <span key={item.createType} className="cv-chip">
          {item.label} {formatNumber(item.count)}
        </span>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { viewState } = useModuleRuntimeState();
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getOverviewSummary(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setSummary(data);
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "总览数据加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  const ingestion = summary?.ingestion;
  const alarm = summary?.alarm;
  const report = summary?.report;

  const ingestionMetrics = ingestion
    ? buildIngestionMetrics(ingestion)
    : placeholderMetrics(["日志库", "近 7 天新增", "总行数", "接入方式"]);
  const alarmMetrics = alarm
    ? buildAlarmMetrics(alarm)
    : placeholderMetrics(["告警规则", "告警中", "今日触发", "推送成功率"]);
  const reportMetrics = report
    ? buildReportMetrics(report)
    : placeholderMetrics(["分析报表", "定时任务", "今日执行", "运行中"]);

  const statusPill = loading ? "加载中" : error ? "数据不可用" : "真实数据";
  const generatedPill = summary
    ? `生成于 ${formatUnixTime(summary.generatedAt, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : null;

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
          <span className="cv-pill">{statusPill}</span>
          {generatedPill ? <span className="cv-pill">{generatedPill}</span> : null}
          <button
            type="button"
            className="cv-secondary-button cv-overview-refresh"
            onClick={reload}
            disabled={loading}
          >
            刷新
          </button>
        </div>
      </header>

      <ModuleRuntimeGate
        viewState={viewState}
        loadingTitle="总览聚合加载中"
        emptyTitle="当前没有总览聚合数据"
        errorTitle="总览聚合接口暂不可用"
      >
        {error ? (
          <div className="cv-inline-notice cv-overview-error" role="alert">
            总览数据加载失败：{error}
            <button type="button" className="cv-link-button" onClick={reload}>
              重试
            </button>
          </div>
        ) : null}

        <section className="cv-panel cv-workbench-section">
          <SectionHeading
            eyebrow="日志接入"
            title="日志接入统计"
            aside={
              <Link className="cv-chip cv-overview-chip-link" to="/v2/settings/log-libraries">
                日志管理
              </Link>
            }
          />
          <MetricGrid metrics={ingestionMetrics} loading={loading && !ingestion} />
          {ingestion && ingestion.volumeUnavailableInstances.length > 0 ? (
            <div className="cv-inline-notice cv-overview-notice">
              以下实例的 system.tables 不可用，体量未计入：{ingestion.volumeUnavailableInstances.join("、")}
            </div>
          ) : null}
          {ingestion ? <CreateTypeChips data={ingestion} /> : null}
          <div className="cv-rank-grid">
            <div>
              <h3 className="cv-subpanel__title">Top 日志库（按行数）</h3>
              <RankedList
                items={ingestion ? buildTopTables(ingestion) : []}
                emptyText={loading ? "加载中" : "暂无体量数据"}
              />
            </div>
            <div>
              <h3 className="cv-subpanel__title">最近接入</h3>
              <EventList
                items={ingestion ? buildRecentTables(ingestion) : []}
                emptyText={loading ? "加载中" : "暂无日志库"}
              />
            </div>
          </div>
        </section>

        <section className="cv-panel cv-workbench-section">
          <SectionHeading
            eyebrow="告警"
            title="告警统计"
            aside={
              <Link className="cv-chip cv-overview-chip-link" to="/v2/alerts/rules">
                告警规则
              </Link>
            }
          />
          <MetricGrid metrics={alarmMetrics} loading={loading && !alarm} />
          {alarm ? (
            <div className="cv-overview-chip-row" aria-label="告警级别分布">
              <span className="cv-chip">严重 {formatNumber(alarm.levelSerious)}</span>
              <span className="cv-chip">告警 {formatNumber(alarm.levelAlarm)}</span>
              <span className="cv-chip">通知 {formatNumber(alarm.levelNotice)}</span>
            </div>
          ) : null}
          <div className="cv-rank-grid">
            <div>
              <h3 className="cv-subpanel__title">近 7 天触发趋势</h3>
              <DailyTrend points={alarm?.dailyTrend ?? []} />
            </div>
            <div>
              <h3 className="cv-subpanel__title">正在告警的规则</h3>
              <EventList
                items={alarm ? buildFiringAlarms(alarm.recentFiring) : []}
                emptyText={loading ? "加载中" : "当前没有告警中的规则"}
              />
            </div>
          </div>
        </section>

        <section className="cv-panel cv-workbench-section">
          <SectionHeading
            eyebrow="分析报表"
            title="分析报表统计"
            aside={
              <Link className="cv-chip cv-overview-chip-link" to="/v2/reports">
                报表列表
              </Link>
            }
          />
          <MetricGrid metrics={reportMetrics} loading={loading && !report} />
          <div className="cv-rank-grid">
            <div>
              <h3 className="cv-subpanel__title">最近执行</h3>
              <EventList
                items={report ? buildRecentExecutions(report) : []}
                emptyText={loading ? "加载中" : "暂无执行记录"}
              />
            </div>
            <div>
              <h3 className="cv-subpanel__title">最近报表</h3>
              <EventList
                items={report ? buildRecentReports(report) : []}
                emptyText={loading ? "加载中" : "暂无报表"}
              />
            </div>
          </div>
        </section>
      </ModuleRuntimeGate>
    </section>
  );
}
