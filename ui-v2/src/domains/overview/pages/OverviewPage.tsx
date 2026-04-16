import type { CSSProperties, ReactNode } from "react";
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

const pageStyle: CSSProperties = {
  display: "grid",
  gap: 12
};

const sectionCardStyle: CSSProperties = {
  border: "1px solid rgba(37, 99, 235, 0.08)",
  borderRadius: 14,
  backgroundColor: "#ffffff",
  padding: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)"
};

const gridFourStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10
};

const gridMainStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.9fr)",
  gap: 12,
  alignItems: "start"
};

const gridBottomStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 12
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
  const stroke = tone === "danger" ? "#dc2626" : "#2563eb";
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
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "center",
        marginBottom: 10
      }}
    >
      <div>
        {eyebrow ? (
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#64748b" }}>
            {eyebrow}
          </p>
        ) : null}
        <h2 style={{ margin: 0, fontSize: 14, color: "#111827" }}>{title}</h2>
      </div>
      {aside}
    </header>
  );
}

function TrendBars({ points, tone }: { points: TrendPoint[]; tone: "orange" | "red" }) {
  const color = tone === "red" ? "#dc2626" : "#2563eb";
  const soft = tone === "red" ? "#fca5a5" : "#93c5fd";

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`, gap: 8 }}>
      {points.map((point) => (
        <div key={point.label} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 36,
              height: 104,
              borderRadius: 999,
              background: "linear-gradient(180deg, rgba(37,99,235,0.06) 0%, rgba(239,246,255,0.8) 100%)",
              display: "flex",
              alignItems: "flex-end",
              padding: 4
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${Math.max(point.value, 10)}%`,
                borderRadius: 999,
                background: `linear-gradient(180deg, ${color} 0%, ${soft} 100%)`
              }}
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#111827", fontSize: 12 }}>{point.value}%</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{point.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedList({ items, accent }: { items: RankedItem[]; accent: string }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item, index) => (
        <article
          key={item.name}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 10,
            alignItems: "center",
            padding: 10,
            borderRadius: 12,
            backgroundColor: "#f8fbff",
            border: "1px solid rgba(37, 99, 235, 0.08)"
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              backgroundColor: accent,
              color: "#ffffff",
              fontSize: 11,
              fontWeight: 700
            }}
          >
            {index + 1}
          </span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#111827", fontSize: 12 }}>{item.name}</p>
            <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: 12 }}>{item.detail}</p>
          </div>
          <strong style={{ color: "#1d4ed8", fontSize: 12 }}>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function EventList({ items }: { items: EventItem[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item) => (
        <article
          key={item.title}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            padding: 10,
            borderRadius: 12,
            backgroundColor: "#ffffff",
            border: "1px solid rgba(37, 99, 235, 0.08)"
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#111827", fontSize: 12 }}>{item.title}</p>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 12 }}>{item.meta}</p>
          </div>
          <span
            style={{
              borderRadius: 999,
              minHeight: 22,
              padding: "0 8px",
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: 700,
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "flex-start"
            }}
          >
            {item.status}
          </span>
        </article>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { viewState, aiMode } = useModuleRuntimeState();

  return (
    <section style={pageStyle}>
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>总览</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">总览大盘</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">总览大盘</h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "flex-start" }}>
          {["最近 1 小时", "生产环境", "service: all", "刷新中"].map((item) => (
            <span
              key={item}
              style={{
                borderRadius: 999,
                minHeight: 24,
                padding: "0 10px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid rgba(37, 99, 235, 0.08)",
                fontWeight: 700,
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center"
              }}
            >
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
        <section style={sectionCardStyle}>
          <SectionHeading
            eyebrow="核心指标"
            title="KPI 概览区"
            aside={
              <span
                style={{
                  borderRadius: 999,
                  minHeight: 24,
                  padding: "0 10px",
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  fontWeight: 700,
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center"
                }}
              >
                4 张卡
              </span>
            }
          />
          <div style={gridFourStyle}>
            {metrics.map((metric) => (
              <article
                key={metric.label}
                style={{
                  borderRadius: 12,
                  backgroundColor: "#f8fbff",
                  border: "1px solid rgba(37, 99, 235, 0.08)",
                  padding: 12,
                  display: "grid",
                  gap: 8
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <p style={{ margin: 0, color: "#475569", fontWeight: 700, fontSize: 12 }}>{metric.label}</p>
                  <Sparkline points={metric.sparkline} tone={metric.tone} />
                </div>
                <strong style={{ fontSize: 22, lineHeight: 1, color: "#111827" }}>{metric.value}</strong>
                <span style={{ color: metric.tone === "danger" ? "#b91c1c" : "#1d4ed8", fontWeight: 700, fontSize: 12 }}>
                  {metric.trend}
                </span>
              </article>
            ))}
          </div>
        </section>

        <div style={gridMainStyle}>
          <div style={{ display: "grid", gap: 12 }}>
            <section style={sectionCardStyle}>
              <SectionHeading eyebrow="趋势分析" title="日志量与错误率趋势" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(37, 99, 235, 0.08)",
                    backgroundColor: "#f8fbff",
                    padding: 12
                  }}
                >
                  <h3 style={{ margin: "0 0 10px", color: "#111827", fontSize: 13 }}>日志量趋势</h3>
                  <TrendBars points={volumeTrend} tone="orange" />
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(37, 99, 235, 0.08)",
                    backgroundColor: "#f8fbff",
                    padding: 12
                  }}
                >
                  <h3 style={{ margin: "0 0 10px", color: "#111827", fontSize: 13 }}>错误率趋势</h3>
                  <TrendBars points={errorTrend} tone="red" />
                </div>
              </div>
            </section>

            <section style={sectionCardStyle}>
              <SectionHeading eyebrow="热点与异常" title="Top 服务 / Top Error Code" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Top 服务</h3>
                  <RankedList items={topServices} accent="#2563eb" />
                </div>
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Top Error Code</h3>
                  <RankedList items={topErrors} accent="#dc2626" />
                </div>
              </div>
            </section>
          </div>

          <section style={{ ...sectionCardStyle, display: "grid", gap: 12 }}>
            <SectionHeading eyebrow="AI 建议" title="AI 建议区" />
            {aiSuggestions.map((item) => (
              <article
                key={item.title}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(37, 99, 235, 0.08)",
                  background: "#f8fbff",
                  padding: 12
                }}
              >
                <h3 style={{ margin: 0, fontSize: 13 }}>{item.title}</h3>
                <p style={{ margin: "4px 0 0", color: "#6b7280", lineHeight: 1.5, fontSize: 12 }}>{item.summary}</p>
              </article>
            ))}
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
        </div>

        <div style={gridBottomStyle}>
          <section style={sectionCardStyle}>
            <SectionHeading eyebrow="近期动态" title="最近告警" />
            <EventList items={alertEvents} />
          </section>

          <section style={sectionCardStyle}>
            <SectionHeading eyebrow="报表投递" title="最近报表" />
            <EventList items={reportEvents} />
          </section>
        </div>
      </ModuleRuntimeGate>
    </section>
  );
}
