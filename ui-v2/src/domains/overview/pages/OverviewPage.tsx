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
  gap: 20
};

const heroStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  padding: 24,
  borderRadius: 24,
  color: "#fff7ed",
  background:
    "linear-gradient(135deg, rgba(154,52,18,0.96) 0%, rgba(234,88,12,0.92) 52%, rgba(255,186,73,0.92) 100%)",
  boxShadow: "0 18px 40px rgba(234,88,12,0.18)"
};

const sectionCardStyle: CSSProperties = {
  border: "1px solid #fed7aa",
  borderRadius: 24,
  backgroundColor: "#ffffff",
  padding: 20,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)"
};

const gridFourStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16
};

const gridMainStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.9fr)",
  gap: 20,
  alignItems: "start"
};

const gridBottomStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 20
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
  const stroke = tone === "danger" ? "#dc2626" : "#ea580c";
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);
  const width = 112;
  const height = 32;
  const path = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} style={{ width: 112, height: 32 }}>
      <path d={path} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  aside
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "flex-start",
        marginBottom: 16
      }}
    >
      <div>
        {eyebrow ? (
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#c2410c" }}>
            {eyebrow}
          </p>
        ) : null}
        <h2 style={{ margin: 0, fontSize: 24, color: "#111827" }}>{title}</h2>
        {description ? <p style={{ margin: "8px 0 0", color: "#6b7280" }}>{description}</p> : null}
      </div>
      {aside}
    </header>
  );
}

function TrendBars({ points, tone }: { points: TrendPoint[]; tone: "orange" | "red" }) {
  const color = tone === "red" ? "#dc2626" : "#ea580c";
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`, gap: 10 }}>
      {points.map((point) => (
        <div key={point.label} style={{ display: "grid", gap: 8, justifyItems: "center" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 42,
              height: 140,
              borderRadius: 999,
              background: "linear-gradient(180deg, rgba(234,88,12,0.08) 0%, rgba(255,247,237,0.8) 100%)",
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
                background: `linear-gradient(180deg, ${color} 0%, #fdba74 100%)`
              }}
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#111827" }}>{point.value}%</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{point.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedList({ items, accent }: { items: RankedItem[]; accent: string }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item, index) => (
        <article
          key={item.name}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 12,
            alignItems: "center",
            padding: 14,
            borderRadius: 18,
            backgroundColor: "#fff7ed",
            border: "1px solid #ffedd5"
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              backgroundColor: accent,
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700
            }}
          >
            {index + 1}
          </span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#111827" }}>{item.name}</p>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>{item.detail}</p>
          </div>
          <strong style={{ color: "#9a3412" }}>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function EventList({ items }: { items: EventItem[] }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item) => (
        <article
          key={item.title}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: 16,
            borderRadius: 18,
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb"
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#111827" }}>{item.title}</p>
            <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 13 }}>{item.meta}</p>
          </div>
          <span
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              backgroundColor: "#fff7ed",
              color: "#c2410c",
              fontWeight: 700,
              fontSize: 13,
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
      <header style={heroStyle}>
        <div style={{ maxWidth: 720 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Overview / AI Summary
          </p>
          <h1 style={{ margin: "10px 0 12px", fontSize: 36, lineHeight: 1.1 }}>总览大盘</h1>
          <p style={{ margin: 0, maxWidth: 620, color: "rgba(255,247,237,0.88)" }}>
            聚合日志量、错误率、查询耗时、热点服务与 AI 建议，先以前端壳层梳理整体信息架构，后续直接挂接 v2 聚合接口。
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignSelf: "flex-start" }}>
          {["最近 1 小时", "生产环境", "service: all", "刷新中"].map((item) => (
            <span
              key={item}
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                backgroundColor: "rgba(255,247,237,0.16)",
                border: "1px solid rgba(255,247,237,0.22)",
                fontWeight: 700
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
          description="覆盖日志量、错误率、查询性能与告警触发，保留卡片级趋势位。"
          aside={
            <span
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                backgroundColor: "#fff7ed",
                color: "#c2410c",
                fontWeight: 700,
                fontSize: 13
              }}
            >
              与设计稿一致的四卡起步
            </span>
          }
        />
        <div style={gridFourStyle}>
          {metrics.map((metric) => (
            <article
              key={metric.label}
              style={{
                borderRadius: 22,
                backgroundColor: "#fff7ed",
                border: "1px solid #fdba74",
                padding: 18,
                display: "grid",
                gap: 10
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <p style={{ margin: 0, color: "#9a3412", fontWeight: 700 }}>{metric.label}</p>
                <Sparkline points={metric.sparkline} tone={metric.tone} />
              </div>
              <strong style={{ fontSize: 30, lineHeight: 1, color: "#111827" }}>{metric.value}</strong>
              <span style={{ color: metric.tone === "danger" ? "#b91c1c" : "#c2410c", fontWeight: 700 }}>
                {metric.trend}
              </span>
            </article>
          ))}
        </div>
      </section>

      <div style={gridMainStyle}>
        <div style={{ display: "grid", gap: 20 }}>
          <section style={sectionCardStyle}>
            <SectionHeading
              eyebrow="趋势分析"
              title="日志量与错误率趋势"
              description="对应设计稿的双趋势图区域，当前用可运行柱状壳层表达时间序列结构。"
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
              <div
                style={{
                  borderRadius: 20,
                  border: "1px solid #ffedd5",
                  backgroundColor: "#fffaf5",
                  padding: 16
                }}
              >
                <h3 style={{ margin: "0 0 14px", color: "#111827" }}>日志量趋势</h3>
                <TrendBars points={volumeTrend} tone="orange" />
              </div>
              <div
                style={{
                  borderRadius: 20,
                  border: "1px solid #fee2e2",
                  backgroundColor: "#fff7f7",
                  padding: 16
                }}
              >
                <h3 style={{ margin: "0 0 14px", color: "#111827" }}>错误率趋势</h3>
                <TrendBars points={errorTrend} tone="red" />
              </div>
            </div>
          </section>

          <section style={sectionCardStyle}>
            <SectionHeading
              eyebrow="热点与异常"
              title="Top 服务 / Top Error Code"
              description="保留后续 drill down 与跳转查询详情的列表容器。"
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <div>
                <h3 style={{ margin: "0 0 12px" }}>Top 服务</h3>
                <RankedList items={topServices} accent="#ea580c" />
              </div>
              <div>
                <h3 style={{ margin: "0 0 12px" }}>Top Error Code</h3>
                <RankedList items={topErrors} accent="#dc2626" />
              </div>
            </div>
          </section>
        </div>

        <section style={{ ...sectionCardStyle, display: "grid", gap: 16 }}>
          <SectionHeading
            eyebrow="AI 建议"
            title="AI 建议区"
            description="承接自动总结、根因推断与一键动作入口。"
          />
          {aiSuggestions.map((item) => (
            <article
              key={item.title}
              style={{
                borderRadius: 20,
                border: "1px solid #fed7aa",
                background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)",
                padding: 18
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18 }}>{item.title}</h3>
              <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>{item.summary}</p>
            </article>
          ))}
          <AiActionPanel
            title="AI 动作入口"
            description="结构化触发生成告警、生成报表和索引优化建议；AI 失败时当前总览内容仍保持可读。"
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
          <SectionHeading
            eyebrow="近期动态"
            title="最近告警"
            description="保留确认、关闭与跳转事件详情的列表位。"
          />
          <EventList items={alertEvents} />
        </section>

        <section style={sectionCardStyle}>
          <SectionHeading
            eyebrow="报表投递"
            title="最近报表"
            description="承接最近执行的报表记录与后续下载入口。"
          />
          <EventList items={reportEvents} />
        </section>
      </div>
      </ModuleRuntimeGate>
    </section>
  );
}
