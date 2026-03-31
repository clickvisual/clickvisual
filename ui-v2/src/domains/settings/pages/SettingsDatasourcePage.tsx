import type { CSSProperties } from "react";
import AiActionPanel from "../../../shared/components/AiActionPanel";
import ModuleRuntimeGate, {
  useModuleRuntimeState
} from "../../../shared/components/ModuleRuntimeState";

type ConfigCard = {
  title: string;
  description: string;
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
  background:
    "linear-gradient(135deg, rgba(255,247,237,1) 0%, rgba(239,246,255,0.96) 58%, rgba(255,255,255,1) 100%)",
  border: "1px solid #bfdbfe"
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
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.9fr)",
  gap: 20,
  alignItems: "start"
};

const tabs = ["AI 配置", "DingTalk 通知", "数据源", "字段映射"];

const configCards: ConfigCard[] = [
  {
    title: "ClickHouse 数据源配置",
    description: "Host、Port、TLS、Database 与连接测试状态预留在这里。",
    status: "连接正常"
  },
  {
    title: "Schema Registry",
    description: "映射 time、level、service、trace_id、message、json_payload 等核心字段。",
    status: "字段映射已加载"
  },
  {
    title: "DingTalk 通知配置",
    description: "Webhook URL、Secret、@策略与消息模板管理统一收口。",
    status: "2 个 webhook 已启用"
  }
];

const aiCapabilities = [
  "根据日志样本生成最佳 ClickHouse 表结构建议",
  "根据近 7 天日志生成告警规则模板",
  "根据业务 SLA 自动生成定时报表模板"
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

export default function SettingsDatasourcePage() {
  const { viewState, aiMode } = useModuleRuntimeState();

  return (
    <section style={pageStyle}>
      <header style={heroStyle}>
        <div style={{ maxWidth: 720 }}>
          <p style={{ margin: 0, color: "#c2410c", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
            Settings / AI + DingTalk + Datasource
          </p>
          <h1 style={{ margin: "10px 0 12px", fontSize: 36, lineHeight: 1.1 }}>配置中心</h1>
          <p style={{ margin: 0, color: "#6b7280" }}>
            将数据源、字段映射、钉钉通知与 AI 配置整合成统一入口。当前只做高保真壳层，便于后续一次性挂 v2 配置接口。
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignSelf: "flex-start" }}>
          {["连接测试", "保存配置", "导入模板"].map((item, index) => (
            <button
              key={item}
              type="button"
              style={{
                border: index === 1 ? "none" : "1px solid #bfdbfe",
                borderRadius: 999,
                padding: "10px 14px",
                background: index === 1 ? "linear-gradient(90deg, #f97316 0%, #fb923c 100%)" : "#ffffff",
                color: index === 1 ? "#ffffff" : "#1d4ed8",
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
        loadingTitle="配置数据加载中"
        emptyTitle="当前没有可展示的配置摘要"
        errorTitle="配置接口暂不可用"
      >
      <section style={sectionCardStyle}>
        <SectionHeader
          eyebrow="配置分区"
          title="配置中心导航"
          description="先将 AI 配置、DingTalk 通知、数据源和字段映射的一级导航定下来。"
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {tabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              style={{
                border: "1px solid",
                borderColor: index === 0 ? "#fb923c" : "#fed7aa",
                borderRadius: 999,
                padding: "10px 14px",
                backgroundColor: index === 0 ? "#fff7ed" : "#ffffff",
                color: index === 0 ? "#c2410c" : "#6b7280",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <div style={layoutStyle}>
        <div style={{ display: "grid", gap: 20 }}>
          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="AI 配置"
              title="AI 配置面板"
              description="贴近设计稿保留模型配置、Prompt 上下文和自动化能力入口。"
            />
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {[
                  { label: "Primary AI Model", value: "GPT-4 Turbo (Azure)" },
                  { label: "Fallback Model", value: "Claude 3.5 Sonnet" },
                  { label: "Schema Inference", value: "已启用" },
                  { label: "Alert Template Generator", value: "已启用" }
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: 18,
                      padding: 14,
                      backgroundColor: "#fff7ed",
                      border: "1px solid #fed7aa"
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>{item.label}</p>
                    <p style={{ margin: "8px 0 0", fontWeight: 700, color: "#111827" }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderRadius: 20,
                  padding: 16,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e5e7eb"
                }}
              >
                <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>System Prompt Context</h2>
                <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.7 }}>
                  你是 ClickHouse 日志查询系统的 AI 助手，需要基于日志 schema、近 7 天错误趋势与 SLA 目标，输出查询建议、告警规则模板和报表模板。
                </p>
              </div>
              <AiActionPanel
                title="AI 配置动作"
                description="统一承接 schema inference、规则模板生成和 SLA 报表模板生成。AI 不可用时仍可手动保存配置。"
                mode={aiMode}
                actions={[
                  {
                    id: "settings-schema",
                    label: "生成 Schema 建议",
                    successMessage: "已生成 ClickHouse 字段映射与索引建议。",
                    errorMessage: "AI 生成 Schema 建议失败，请继续手动维护字段映射。"
                  },
                  {
                    id: "settings-alert",
                    label: "生成告警模板",
                    successMessage: "已生成近 7 天异常规则模板草稿。",
                    errorMessage: "AI 生成告警模板失败，请使用固定模板。"
                  },
                  {
                    id: "settings-report",
                    label: "生成 SLA 报表",
                    successMessage: "已生成 SLA 周报模板草稿。",
                    errorMessage: "AI 生成 SLA 报表失败，请先导入现有模板。"
                  }
                ]}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14
                }}
              >
                {aiCapabilities.map((capability) => (
                  <div
                    key={capability}
                    style={{
                      borderRadius: 18,
                      padding: 14,
                      backgroundColor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1d4ed8",
                      fontWeight: 700,
                      lineHeight: 1.6
                    }}
                  >
                    {capability}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="基础配置"
              title="数据源与通知配置"
              description="给 ClickHouse、Schema Registry、DingTalk 三个配置分区留足位置。"
            />
            <div style={{ display: "grid", gap: 12 }}>
              {configCards.map((card) => (
                <article
                  key={card.title}
                  style={{
                    borderRadius: 20,
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#ffffff",
                    padding: 16
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18 }}>{card.title}</h2>
                      <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>{card.description}</p>
                    </div>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "8px 12px",
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        fontWeight: 700,
                        alignSelf: "flex-start"
                      }}
                    >
                      {card.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside style={{ display: "grid", gap: 20 }}>
          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="DingTalk"
              title="通知配置摘要"
              description="保留 webhook、签名、模板与 @策略的配置摘要。"
            />
            <div style={{ display: "grid", gap: 12 }}>
              {[
                "Webhook URL：已配置 2 个生产群，支持轮询切换。",
                "签名 Secret：已启用，后续接入测试发送按钮。",
                "@策略：P0 @所有人，P1 @值班人，P2 仅群通知。"
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#7c2d12",
                    lineHeight: 1.6
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="Schema"
              title="字段映射概览"
              description="展示关键字段映射，为查询与 AI 能力提供统一上下文。"
            />
            <div style={{ display: "grid", gap: 10 }}>
              {[
                "time -> timestamp",
                "service -> service_name",
                "trace_id -> trace_id",
                "message -> message",
                "json_payload -> raw_payload"
              ].map((mapping) => (
                <div
                  key={mapping}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    fontWeight: 700
                  }}
                >
                  {mapping}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
      </ModuleRuntimeGate>
    </section>
  );
}
