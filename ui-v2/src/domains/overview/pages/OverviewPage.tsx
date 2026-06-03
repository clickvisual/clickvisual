import type { ReactNode } from "react";
import AiActionPanel from "../../../shared/components/AiActionPanel";
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
};

type EventItem = {
  title: string;
  meta: string;
  status: string;
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

const aiSuggestions = [
  {
    title: "AI 自动总结",
    summary: "过去 1 小时 error rate 上升 30%，主要集中在 svc-auth，问题开始于 12:08。"
  },
  {
    title: "根因推断",
    summary: "异常多发于 /login，trace 显示下游 DB timeout 与连接重试叠加。"
  },
  {
    title: "优化建议",
    summary: "建议优先补索引字段 service、level、timestamp，并将告警阈值拆成按 env 维度。"
  }
];

const alertEvents: EventItem[] = [
  { title: "[P1] svc-auth error rate > 5%", meta: "12:10 · 连续 3 次触发", status: "待确认" },
  { title: "[P2] payment callback timeout", meta: "11:42 · 已推送钉钉群", status: "处理中" },
  { title: "[P2] query p95 latency spike", meta: "10:56 · 自动恢复", status: "已恢复" }
];

const reportEvents: EventItem[] = [
  { title: "生产错误汇总日报", meta: "09:00 · 钉钉群：日志巡检", status: "已送达" },
  { title: "核心服务 SLA 周报", meta: "周一 08:30 · Markdown + 图片", status: "计划中" },
  { title: "夜间异常追踪快照", meta: "01:00 · 最近一次成功", status: "已完成" }
];

function Sparkline({ points, tone = "default" }: { points: number[]; tone?: Metric["tone"] }) {
  const stroke = tone === "danger" ? "var(--cv-danger)" : "var(--cv-primary)";
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);
  const width = 96;
  const height = 26;
  const path = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
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

  return (
    <div className="cv-trend-bars" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
      {points.map((point) => (
        <div key={point.label} className="cv-trend-bars__item">
          <div className="cv-trend-bars__track">
            <div
              style={{
                width: "100%",
                height: `${Math.max(point.value, 10)}%`,
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
  return (
    <div className="cv-ranked-list">
      {items.map((item, index) => (
        <article key={item.name} className="cv-ranked-list__item">
          <span className="cv-ranked-list__index" style={{ color: accent, backgroundColor: `${accent}14` }}>
            {index + 1}
          </span>
          <div>
            <p className="cv-ranked-list__name">{item.name}</p>
            <p className="cv-ranked-list__detail">{item.detail}</p>
          </div>
          <strong className="cv-ranked-list__value">{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function EventList({ items }: { items: EventItem[] }) {
  return (
    <div className="cv-event-list">
      {items.map((item) => (
        <article key={item.title} className="cv-event-list__item">
          <div>
            <p className="cv-event-list__title">{item.title}</p>
            <p className="cv-event-list__meta">{item.meta}</p>
          </div>
          <span className="cv-event-list__status">{item.status}</span>
        </article>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { viewState, aiMode } = useModuleRuntimeState();

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
          {["最近 1 小时", "生产环境", "service: all", "刷新中"].map((item) => (
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
          <SectionHeading eyebrow="核心指标" title="KPI 概览区" aside={<span className="cv-chip">4 张卡</span>} />
          <div className="cv-metric-grid">
            {metrics.map((metric) => (
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
                  <TrendBars points={volumeTrend} tone="orange" />
                </div>
                <div className="cv-subpanel">
                  <h3 className="cv-subpanel__title">错误率趋势</h3>
                  <TrendBars points={errorTrend} tone="red" />
                </div>
              </div>
            </section>

            <section className="cv-panel cv-workbench-section">
              <SectionHeading eyebrow="热点与异常" title="Top 服务 / Top Error Code" />
              <div className="cv-rank-grid">
                <div>
                  <h3 className="cv-subpanel__title">Top 服务</h3>
                  <RankedList items={topServices} accent="var(--cv-primary)" />
                </div>
                <div>
                  <h3 className="cv-subpanel__title">Top Error Code</h3>
                  <RankedList items={topErrors} accent="var(--cv-danger)" />
                </div>
              </div>
            </section>

            <section className="cv-panel cv-workbench-section">
              <SectionHeading eyebrow="近期动态" title="最近告警" />
              <EventList items={alertEvents} />
            </section>

            <section className="cv-panel cv-workbench-section">
              <SectionHeading eyebrow="报表投递" title="最近报表" />
              <EventList items={reportEvents} />
            </section>
          </div>

          <aside className="cv-dashboard-aside">
            <section className="cv-panel cv-workbench-section cv-workbench-section--sticky">
              <SectionHeading eyebrow="AI 建议" title="AI 建议区" aside={<span className="cv-chip">Inspector</span>} />
              <div className="cv-ai-list">
                {aiSuggestions.map((item) => (
                  <article key={item.title} className="cv-ai-list__item">
                    <h3 className="cv-ai-list__title">{item.title}</h3>
                    <p className="cv-ai-list__summary">{item.summary}</p>
                  </article>
                ))}
              </div>
              <AiActionPanel
                title="AI 动作入口"
                description=""
                mode={aiMode}
                actions={[
                  {
                    id: "overview-alert",
                    label: "一键生成告警规则",
                    successMessage: "已生成基于 svc-auth 错误率的告警草稿。",
                    errorMessage: "AI 生成告警规则失败，请稍后重试或手动创建。"
                  },
                  {
                    id: "overview-report",
                    label: "一键生成报表",
                    successMessage: "已生成日报模板草稿，可直接跳转报表中心调整。",
                    errorMessage: "AI 生成报表失败，请先使用固定模板。"
                  },
                  {
                    id: "overview-index",
                    label: "优化 SQL / 索引",
                    successMessage: "已输出 service、level、timestamp 的优化建议。",
                    errorMessage: "AI 优化建议暂不可用，请继续使用当前查询与手动排查。"
                  }
                ]}
              />
            </section>

            <section className="cv-panel cv-workbench-section">
              <SectionHeading eyebrow="处理建议" title="当前值班动作" />
              <div className="cv-duty-list">
                <article className="cv-duty-list__item">
                  <strong>先收敛 svc-auth 的 timeout 样本</strong>
                  <span>按 namespace / pod / host 三层过滤，优先定位波动节点。</span>
                </article>
                <article className="cv-duty-list__item">
                  <strong>回看 12:08 前后 10 分钟</strong>
                  <span>重点比对 DB timeout 和 upstream reset 的共现比例。</span>
                </article>
                <article className="cv-duty-list__item">
                  <strong>补充默认字段</strong>
                  <span>将 service、level、timestamp 设为常用筛选，减少首轮查询成本。</span>
                </article>
              </div>
            </section>

            <section className="cv-panel cv-workbench-section">
              <SectionHeading eyebrow="工作台摘要" title="值班状态" />
              <div className="cv-summary-stack">
                <div className="cv-summary-stack__row">
                  <span>当前优先级</span>
                  <strong>P1 / 登录链路</strong>
                </div>
                <div className="cv-summary-stack__row">
                  <span>最近更新</span>
                  <strong>14:00</strong>
                </div>
                <div className="cv-summary-stack__row">
                  <span>建议动作</span>
                  <strong>先查 trace，再补告警</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className="cv-panel cv-workbench-section">
          <SectionHeading eyebrow="值班协同" title="跨模块入口" />
          <div className="cv-cross-links">
            <article className="cv-cross-links__item">
              <strong>日志查询</strong>
              <span>沿用相同工作台布局，直接下钻到命中的 namespace / pod。</span>
            </article>
            <article className="cv-cross-links__item">
              <strong>定时报表</strong>
              <span>将当前筛选沉淀为日报和异常快照，减少重复分析。</span>
            </article>
            <article className="cv-cross-links__item">
              <strong>告警中心</strong>
              <span>把 AI 草案转成正式规则，并挂到统一值班节奏里。</span>
            </article>
          </div>
        </section>
      </ModuleRuntimeGate>
    </section>
  );
}
