import type { CSSProperties } from "react";
import AiActionPanel from "../../../shared/components/AiActionPanel";
import ModuleRuntimeGate, {
  useModuleRuntimeState
} from "../../../shared/components/ModuleRuntimeState";
import { getTimeRangeLabel, useTimeRange } from "../../../shared/state/TimeRangeContext";

type FilterToken = {
  label: string;
  value: string;
};

type ResultRow = {
  time: string;
  level: string;
  service: string;
  message: string;
  traceId: string;
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
  background:
    "linear-gradient(135deg, rgba(255,247,237,1) 0%, rgba(255,237,213,0.94) 45%, rgba(255,255,255,1) 100%)",
  border: "1px solid #fdba74"
};

const sectionCardStyle: CSSProperties = {
  border: "1px solid #fed7aa",
  borderRadius: 24,
  backgroundColor: "#ffffff",
  padding: 20,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)"
};

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.55fr) minmax(300px, 0.95fr)",
  gap: 20,
  alignItems: "start"
};

const filterTokens = (timeLabel: string): FilterToken[] => [
  { label: "时间范围", value: timeLabel },
  { label: "service", value: "svc-auth" },
  { label: "env", value: "prod" },
  { label: "level", value: "error" },
  { label: "host", value: "auth-prod-03" },
  { label: "pod", value: "auth-7f86b7d9cc" }
];

const tabs = ["原始日志", "聚合统计", "Trace 视图", "JSON 视图"];

const quickFields = ["+service", "+level", "+trace_id", "+request_id", "+host", "+status_code"];

const resultRows: ResultRow[] = [
  {
    time: "2026-03-30 12:16:04",
    level: "ERROR",
    service: "svc-auth",
    message: "db timeout while calling /login",
    traceId: "trace-7f2a91"
  },
  {
    time: "2026-03-30 12:15:41",
    level: "WARN",
    service: "svc-auth",
    message: "retrying upstream mysql connection",
    traceId: "trace-7f2a91"
  },
  {
    time: "2026-03-30 12:14:57",
    level: "ERROR",
    service: "svc-gateway",
    message: "upstream reset by peer for login route",
    traceId: "trace-a93cb1"
  }
];

const historyQueries = [
  'service:svc-auth AND level:error AND msg:"timeout"',
  "SELECT service, count(*) FROM logs WHERE level='ERROR' GROUP BY service",
  "trace_id:trace-7f2a91",
  "env:prod AND status_code:5xx"
];

const aiSuggestions = [
  "将 msg:\"timeout\" 改为 message ILIKE '%timeout%'，避免遗漏部分字段映射。",
  "补充 env 与 service 前置过滤，可减少扫描分区数量。",
  "若转 SQL，建议使用 PREWHERE timestamp >= now() - interval 1 hour。"
];

function SectionHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header style={{ marginBottom: 16 }}>
      {eyebrow ? (
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#c2410c" }}>
          {eyebrow}
        </p>
      ) : null}
      <h2 style={{ margin: 0, fontSize: 24, color: "#111827" }}>{title}</h2>
      {description ? <p style={{ margin: "8px 0 0", color: "#6b7280" }}>{description}</p> : null}
    </header>
  );
}

function FilterChip({ label, value }: FilterToken) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        padding: "10px 14px",
        backgroundColor: "#fff7ed",
        border: "1px solid #fdba74",
        color: "#9a3412",
        fontWeight: 700
      }}
    >
      <span style={{ opacity: 0.72 }}>{label}</span>
      <span>{value}</span>
    </span>
  );
}

function QueryTab({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      style={{
        border: "1px solid",
        borderColor: active ? "#fb923c" : "#fed7aa",
        borderRadius: 999,
        padding: "10px 14px",
        backgroundColor: active ? "#fff7ed" : "#ffffff",
        color: active ? "#c2410c" : "#6b7280",
        fontWeight: 700,
        cursor: "pointer"
      }}
    >
      {label}
    </button>
  );
}

function LevelBadge({ level }: { level: string }) {
  const styleMap: Record<string, CSSProperties> = {
    ERROR: { backgroundColor: "#fee2e2", color: "#b91c1c" },
    WARN: { backgroundColor: "#fef3c7", color: "#b45309" },
    INFO: { backgroundColor: "#dbeafe", color: "#1d4ed8" }
  };
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        ...styleMap[level]
      }}
    >
      {level}
    </span>
  );
}

export default function QueryPage() {
  const { timeRange } = useTimeRange();
  const { viewState, aiMode } = useModuleRuntimeState();
  const filters = filterTokens(getTimeRangeLabel(timeRange));

  return (
    <section style={pageStyle}>
      <header style={heroStyle}>
        <div style={{ maxWidth: 760 }}>
          <p style={{ margin: 0, color: "#c2410c", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
            Query / SLS-style Explorer
          </p>
          <h1 style={{ margin: "10px 0 12px", fontSize: 36, lineHeight: 1.1 }}>日志查询</h1>
          <p style={{ margin: 0, color: "#6b7280" }}>
            按设计稿重做筛选栏、查询输入、结果 Tab 与辅助面板。当前只承载壳层数据，但结构已经对齐后续 DSL、SQL、聚合统计和 Trace 视图。
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignSelf: "flex-start" }}>
          {["实时模式", "已启用 AI 优化", "支持 SQL / DSL"].map((item) => (
            <span
              key={item}
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                backgroundColor: "#ffffff",
                border: "1px solid #fed7aa",
                color: "#9a3412",
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
        loadingTitle="查询工作台加载中"
        emptyTitle="当前没有查询结果与推荐项"
        errorTitle="查询聚合接口暂不可用"
      >
      <section style={sectionCardStyle}>
        <SectionHeader
          eyebrow="顶部筛选"
          title="顶部筛选区"
          description="承接时间范围、服务、环境、级别与主机维度，后续直接绑定聚合查询参数。"
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {filters.map((filter) => (
            <FilterChip key={`${filter.label}-${filter.value}`} {...filter} />
          ))}
        </div>
      </section>

      <div style={layoutStyle}>
        <div style={{ display: "grid", gap: 20 }}>
          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="核心输入"
              title="查询输入区"
              description="对齐设计稿的 DSL / SQL 查询台、快捷字段按钮和动作按钮。"
            />
            <div
              style={{
                borderRadius: 22,
                border: "1px solid #fdba74",
                backgroundColor: "#fffaf5",
                padding: 18,
                display: "grid",
                gap: 14
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #fed7aa",
                      fontWeight: 700,
                      color: "#9a3412"
                    }}
                  >
                    DSL 模式
                  </span>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      backgroundColor: "#eff6ff",
                      color: "#1d4ed8",
                      fontWeight: 700
                    }}
                  >
                    AI 自动补全已开启
                  </span>
                </div>
                <span style={{ color: "#6b7280", fontWeight: 700 }}>时间范围：{getTimeRangeLabel(timeRange)}</span>
              </div>

              <pre
                style={{
                  margin: 0,
                  minHeight: 164,
                  padding: 18,
                  borderRadius: 18,
                  backgroundColor: "#111827",
                  color: "#f8fafc",
                  overflowX: "auto",
                  fontSize: 14,
                  lineHeight: 1.7,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                }}
              >
                {`service:svc-auth AND env:prod AND level:error
AND msg:"timeout"
| stats count() as error_count, avg(latency_ms) as avg_latency by host, pod
| sort error_count desc
| limit 50`}
              </pre>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {quickFields.map((field) => (
                  <button
                    key={field}
                    type="button"
                    style={{
                      border: "1px solid #fed7aa",
                      borderRadius: 999,
                      padding: "8px 12px",
                      backgroundColor: "#ffffff",
                      color: "#9a3412",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {field}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "查询", primary: true },
                  { label: "保存查询" },
                  { label: "生成图表" }
                ].map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    style={{
                      border: action.primary ? "none" : "1px solid #fed7aa",
                      borderRadius: 999,
                      padding: "11px 16px",
                      fontWeight: 700,
                      cursor: "pointer",
                      color: action.primary ? "#ffffff" : "#9a3412",
                      background: action.primary
                        ? "linear-gradient(90deg, #f97316 0%, #fb923c 100%)"
                        : "#ffffff"
                    }}
                    >
                      {action.label}
                    </button>
                  ))}
              </div>
              <AiActionPanel
                title="AI 查询动作"
                description="集中承接 AI 优化查询、生成聚合与字段建议。AI 异常时不影响手动查询和保存。"
                mode={aiMode}
                actions={[
                  {
                    id: "query-optimize",
                    label: "AI 优化查询",
                    successMessage: "已生成 PREWHERE 优化建议和更窄的过滤条件。",
                    errorMessage: "AI 优化查询失败，请先继续使用当前 DSL/SQL。"
                  },
                  {
                    id: "query-chart",
                    label: "AI 生成图表",
                    successMessage: "已给出 TopN 柱状图配置建议。",
                    errorMessage: "AI 生成图表失败，请手动选择图表类型。"
                  }
                ]}
              />
            </div>
          </section>

          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="结果视图"
              title="结果区"
              description="保留原始日志、聚合统计、Trace、JSON 四类视图，并模拟典型结果列表。"
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {tabs.map((tab, index) => (
                <QueryTab key={tab} label={tab} active={index === 0} />
              ))}
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {resultRows.map((row) => (
                <article
                  key={`${row.time}-${row.traceId}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 86px 140px 1fr 120px",
                    gap: 12,
                    alignItems: "center",
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#ffffff"
                  }}
                >
                  <span style={{ color: "#6b7280", fontSize: 13 }}>{row.time}</span>
                  <LevelBadge level={row.level} />
                  <strong style={{ color: "#111827" }}>{row.service}</strong>
                  <span style={{ color: "#374151" }}>{row.message}</span>
                  <button
                    type="button"
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 10px",
                      backgroundColor: "#fff7ed",
                      color: "#c2410c",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {row.traceId}
                  </button>
                </article>
              ))}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12
              }}
            >
              {[
                "聚合统计位：count、avg latency、TopN service",
                "Trace 视图位：按 trace_id 聚合请求链路",
                "JSON 视图位：格式化 payload 与字段高亮"
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#9a3412",
                    fontWeight: 700
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside style={{ display: "grid", gap: 20 }}>
          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="搜索建议"
              title="查询辅助区"
              description="承接字段提示、历史查询、AI 查询优化和常用过滤入口。"
            />
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <h3 style={{ margin: "0 0 10px" }}>字段建议</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["service", "host", "trace_id", "request_id", "status_code", "latency_ms"].map((field) => (
                    <span
                      key={field}
                      style={{
                        borderRadius: 999,
                        padding: "8px 12px",
                        backgroundColor: "#fff7ed",
                        color: "#c2410c",
                        fontWeight: 700
                      }}
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ margin: "0 0 10px" }}>历史查询</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {historyQueries.map((query) => (
                    <button
                      key={query}
                      type="button"
                      style={{
                        textAlign: "left",
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        padding: 12,
                        backgroundColor: "#ffffff",
                        color: "#374151",
                        cursor: "pointer"
                      }}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ margin: "0 0 10px" }}>AI 建议</h3>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#6b7280", lineHeight: 1.7 }}>
                  {aiSuggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </aside>
      </div>
      </ModuleRuntimeGate>
    </section>
  );
}
