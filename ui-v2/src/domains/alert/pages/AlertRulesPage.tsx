import type { CSSProperties } from "react";
import AiActionPanel from "../../../shared/components/AiActionPanel";
import ModuleRuntimeGate, {
  useModuleRuntimeState
} from "../../../shared/components/ModuleRuntimeState";

type Rule = {
  name: string;
  condition: string;
  frequency: string;
  severity: "P0" | "P1" | "P2";
  destination: string;
  status: "启用" | "停用" | "试跑中";
};

type Event = {
  title: string;
  detail: string;
  time: string;
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
    "linear-gradient(135deg, rgba(255,247,237,1) 0%, rgba(254,242,242,0.96) 58%, rgba(255,255,255,1) 100%)",
  border: "1px solid #fecaca"
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
  gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 0.95fr)",
  gap: 20,
  alignItems: "start"
};

const rules: Rule[] = [
  {
    name: "svc-auth 错误率过高",
    condition: "service=svc-auth AND error_rate > 5%",
    frequency: "1m / 连续 3 次",
    severity: "P1",
    destination: "钉钉群：认证告警",
    status: "启用"
  },
  {
    name: "payment callback timeout",
    condition: "service=svc-payment AND p95_latency > 2s",
    frequency: "5m / 连续 2 次",
    severity: "P1",
    destination: "钉钉群：支付巡检",
    status: "试跑中"
  },
  {
    name: "gateway upstream reset",
    condition: "service=svc-gateway AND count(reset) > 200",
    frequency: "1m / 连续 1 次",
    severity: "P2",
    destination: "钉钉群：网关值班",
    status: "启用"
  },
  {
    name: "schema parse failed",
    condition: "json_parse_fail > 100",
    frequency: "10m / 连续 1 次",
    severity: "P2",
    destination: "钉钉群：平台巡检",
    status: "停用"
  }
];

const recentEvents: Event[] = [
  {
    title: "12:10 [P1] svc-auth 错误率过高",
    detail: "当前值 8.3%，阈值 5%，Top Error=db timeout",
    time: "已推送至认证告警群"
  },
  {
    title: "11:42 [P1] payment callback timeout",
    detail: "平均响应时间 2.7s，最近 5m 持续抬升",
    time: "等待人工确认"
  },
  {
    title: "10:56 [P2] query p95 latency spike",
    detail: "已自动恢复，建议转成按 env 维度阈值",
    time: "AI 已生成规则优化建议"
  }
];

const aiCards = [
  "AI 建议将 svc-auth 错误率规则拆成 prod/staging 双阈值，避免测试环境噪声。",
  "推荐新增基于 trace_id 聚类的异常规则，减少单点日志误报。",
  "钉钉推送模板建议附带 Top Error 与查看日志链接，缩短定位路径。"
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
      <h1 style={{ margin: 0, fontSize: 24, color: "#111827" }}>{title}</h1>
      {description ? <p style={{ margin: "8px 0 0", color: "#6b7280" }}>{description}</p> : null}
    </header>
  );
}

function SeverityBadge({ severity }: { severity: Rule["severity"] }) {
  const map: Record<Rule["severity"], CSSProperties> = {
    P0: { backgroundColor: "#7f1d1d", color: "#ffffff" },
    P1: { backgroundColor: "#fee2e2", color: "#b91c1c" },
    P2: { backgroundColor: "#fef3c7", color: "#b45309" }
  };

  return (
    <span style={{ borderRadius: 999, padding: "6px 10px", fontWeight: 700, fontSize: 12, ...map[severity] }}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: Rule["status"] }) {
  const map: Record<Rule["status"], CSSProperties> = {
    启用: { backgroundColor: "#dcfce7", color: "#166534" },
    停用: { backgroundColor: "#f3f4f6", color: "#4b5563" },
    试跑中: { backgroundColor: "#dbeafe", color: "#1d4ed8" }
  };

  return (
    <span style={{ borderRadius: 999, padding: "6px 10px", fontWeight: 700, fontSize: 12, ...map[status] }}>
      {status}
    </span>
  );
}

export default function AlertRulesPage() {
  const { viewState, aiMode } = useModuleRuntimeState();

  return (
    <section style={pageStyle}>
      <header style={heroStyle}>
        <div style={{ maxWidth: 720 }}>
          <p style={{ margin: 0, color: "#b91c1c", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
            Alerting / DingTalk Notification
          </p>
          <h1 style={{ margin: "10px 0 12px", fontSize: 36, lineHeight: 1.1 }}>告警中心</h1>
          <p style={{ margin: 0, color: "#6b7280" }}>
            对齐设计稿补齐规则列表、事件流、AI 规则建议与钉钉通知概览。当前均为前端壳层数据，不依赖真实后端。
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignSelf: "flex-start" }}>
          {["AI 规则建议", "新建规则", "钉钉消息模板"].map((item, index) => (
            <button
              key={item}
              type="button"
              style={{
                border: index === 1 ? "none" : "1px solid #fecaca",
                borderRadius: 999,
                padding: "10px 14px",
                background: index === 1 ? "linear-gradient(90deg, #ef4444 0%, #f97316 100%)" : "#ffffff",
                color: index === 1 ? "#ffffff" : "#9f1239",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </header>
      <ModuleRuntimeGate
        viewState={viewState}
        loadingTitle="告警规则加载中"
        emptyTitle="当前没有可展示的告警规则"
        errorTitle="告警规则接口暂不可用"
      >
      <div style={layoutStyle}>
        <section style={sectionCardStyle}>
          <SectionHeader
            eyebrow="规则管理"
            title="告警规则列表"
            description="包含规则条件、频率、告警等级、推送目标与当前状态，满足高保真壳层。"
          />
          <div style={{ display: "grid", gap: 12 }}>
            {rules.map((rule) => (
              <article
                key={rule.name}
                style={{
                  borderRadius: 20,
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  padding: 16,
                  display: "grid",
                  gap: 12
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18 }}>{rule.name}</h2>
                    <p style={{ margin: "6px 0 0", color: "#6b7280" }}>{rule.condition}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <SeverityBadge severity={rule.severity} />
                    <StatusBadge status={rule.status} />
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>检测频率</p>
                    <p style={{ margin: "6px 0 0", fontWeight: 700 }}>{rule.frequency}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>推送目标</p>
                    <p style={{ margin: "6px 0 0", fontWeight: 700 }}>{rule.destination}</p>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                    {["查看日志", "编辑规则", "试跑"].map((action) => (
                      <button
                        key={action}
                        type="button"
                        style={{
                          border: "1px solid #fed7aa",
                          borderRadius: 999,
                          padding: "8px 12px",
                          backgroundColor: "#fff7ed",
                          color: "#c2410c",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside style={{ display: "grid", gap: 20 }}>
          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="事件流"
              title="告警事件"
              description="承接告警详情、关联日志与 AI 根因分析入口。"
            />
            <div style={{ display: "grid", gap: 12 }}>
              {recentEvents.map((event) => (
                <article
                  key={event.title}
                  style={{
                    borderRadius: 18,
                    border: "1px solid #fee2e2",
                    backgroundColor: "#fff7f7",
                    padding: 14
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 700 }}>{event.title}</p>
                  <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>{event.detail}</p>
                  <p style={{ margin: "8px 0 0", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>{event.time}</p>
                </article>
              ))}
            </div>
          </section>

          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="AI 能力"
              title="AI 规则建议"
              description="模拟根因分析、规则拆分和钉钉模板优化建议。"
            />
            <div style={{ display: "grid", gap: 12 }}>
              {aiCards.map((card) => (
                <div
                  key={card}
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#7c2d12",
                    lineHeight: 1.6
                  }}
                >
                  {card}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <AiActionPanel
                title="AI 规则动作"
                description="支持生成规则草稿、输出根因摘要和优化钉钉通知模板。"
                mode={aiMode}
                actions={[
                  {
                    id: "alert-generate",
                    label: "生成规则草稿",
                    successMessage: "已生成按 env 维度拆分的错误率规则草稿。",
                    errorMessage: "AI 生成规则草稿失败，请继续手动配置阈值。"
                  },
                  {
                    id: "alert-rootcause",
                    label: "生成根因摘要",
                    successMessage: "已输出最近 15 分钟异常链路与 Top Error 摘要。",
                    errorMessage: "AI 根因摘要失败，请先查看关联日志。"
                  }
                ]}
              />
            </div>
          </section>
        </aside>
      </div>
      </ModuleRuntimeGate>
    </section>
  );
}
