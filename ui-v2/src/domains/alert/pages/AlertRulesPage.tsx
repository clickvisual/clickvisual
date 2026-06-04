import { useMemo, useState } from "react";
import AiActionPanel from "../../../shared/components/AiActionPanel";
import ModuleRuntimeGate, {
  useModuleRuntimeState
} from "../../../shared/components/ModuleRuntimeState";

type Severity = "P0" | "P1" | "P2";
type RuleStatus = "启用" | "停用" | "试跑中";

type Rule = {
  name: string;
  condition: string;
  frequency: string;
  severity: Severity;
  destination: string;
  status: RuleStatus;
};

type AlertEvent = {
  title: string;
  detail: string;
  time: string;
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

const recentEvents: AlertEvent[] = [
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

const severityFilters: Array<{ key: "全部" | Severity; label: string }> = [
  { key: "全部", label: "全部" },
  { key: "P0", label: "P0" },
  { key: "P1", label: "P1" },
  { key: "P2", label: "P2" }
];

function SeverityBadge({ severity }: { severity: Severity }) {
  const cls =
    severity === "P0" ? "cv-alert-badge--p0" : severity === "P1" ? "cv-alert-badge--p1" : "cv-alert-badge--p2";
  return <span className={`cv-alert-badge ${cls}`}>{severity}</span>;
}

function StatusBadge({ status }: { status: RuleStatus }) {
  const cls =
    status === "启用" ? "cv-alert-badge--on" : status === "停用" ? "cv-alert-badge--off" : "cv-alert-badge--trial";
  return <span className={`cv-alert-badge ${cls}`}>{status}</span>;
}

export default function AlertRulesPage() {
  const { viewState, aiMode } = useModuleRuntimeState();
  const [severity, setSeverity] = useState<"全部" | Severity>("全部");
  const [keyword, setKeyword] = useState("");
  const [activeName, setActiveName] = useState<string>("");

  const filteredRules = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rules.filter((rule) => {
      const matchSeverity = severity === "全部" || rule.severity === severity;
      const matchKeyword =
        kw === "" ||
        rule.name.toLowerCase().includes(kw) ||
        rule.condition.toLowerCase().includes(kw) ||
        rule.destination.toLowerCase().includes(kw);
      return matchSeverity && matchKeyword;
    });
  }, [severity, keyword]);

  const enabledCount = filteredRules.filter((rule) => rule.status === "启用").length;
  const activeRule = activeName ? rules.find((rule) => rule.name === activeName) : undefined;

  return (
    <section className="cv-section-stack cv-alert-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>告警</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">告警中心</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">告警中心</h1>
        </div>
        <div className="cv-header-actions">
          <button type="button" className="cv-secondary-button">
            AI 规则建议
          </button>
          <button type="button" className="cv-secondary-button">
            钉钉消息模板
          </button>
          <button type="button" className="cv-action-button">
            新建规则
          </button>
        </div>
      </header>

      <ModuleRuntimeGate
        viewState={viewState}
        loadingTitle="告警规则加载中"
        emptyTitle="当前没有可展示的告警规则"
        errorTitle="告警规则接口暂不可用"
      >
        <div className="cv-alert-shell">
          <div className="cv-alert-main">
            <section className="cv-panel cv-workbench-section">
              <header className="cv-workbench-section__header">
                <div>
                  <p className="cv-workbench-section__eyebrow">规则管理</p>
                  <h2 className="cv-workbench-section__title">告警规则列表</h2>
                </div>
              </header>

              <div className="cv-alert-toolbar">
                <div className="cv-alert-filter" role="group" aria-label="按级别筛选">
                  {severityFilters.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="cv-alert-filter__btn"
                      aria-pressed={severity === item.key}
                      onClick={() => setSeverity(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <label className="cv-search cv-alert-toolbar__search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="搜索规则名 / 条件 / 推送目标"
                    aria-label="搜索告警规则"
                  />
                </label>
                <span className="cv-alert-toolbar__count">
                  共 <strong>{filteredRules.length}</strong> 条 · 启用 <strong>{enabledCount}</strong>
                </span>
              </div>

              <div className="cv-alert-list">
                {filteredRules.map((rule) => {
                  const active = rule.name === activeName;
                  return (
                    <div
                      key={rule.name}
                      className={`cv-alert-row${active ? " cv-alert-row--active" : ""}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={active}
                      onClick={() => setActiveName(rule.name)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveName(rule.name);
                        }
                      }}
                    >
                      <div className="cv-alert-row__identity">
                        <p className="cv-alert-row__name">{rule.name}</p>
                        <span className="cv-alert-row__cond">{rule.condition}</span>
                      </div>
                      <div className="cv-alert-row__meta">
                        <span>
                          频率 <strong>{rule.frequency}</strong>
                        </span>
                        <span>{rule.destination}</span>
                      </div>
                      <div className="cv-alert-row__badges">
                        <SeverityBadge severity={rule.severity} />
                        <StatusBadge status={rule.status} />
                      </div>
                      <div className="cv-alert-row__actions">
                        <button
                          type="button"
                          className="cv-icon-button"
                          aria-label="查看日志"
                          title="查看日志"
                          onClick={(event) => event.stopPropagation()}
                        >
                          ⌕
                        </button>
                        <button
                          type="button"
                          className="cv-icon-button"
                          aria-label="编辑规则"
                          title="编辑规则"
                          onClick={(event) => event.stopPropagation()}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="cv-icon-button"
                          aria-label="试跑"
                          title="试跑"
                          onClick={(event) => event.stopPropagation()}
                        >
                          ▷
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="cv-alert-aside">
            {activeRule ? (
              <section className="cv-panel cv-workbench-section">
                <header className="cv-workbench-section__header">
                  <div>
                    <p className="cv-workbench-section__eyebrow">规则详情</p>
                    <h2 className="cv-workbench-section__title">当前选中规则</h2>
                  </div>
                  <SeverityBadge severity={activeRule.severity} />
                </header>
                <div className="cv-alert-inspector">
                  <div className="cv-alert-inspector__head">
                    <h3 className="cv-alert-inspector__name">{activeRule.name}</h3>
                    <StatusBadge status={activeRule.status} />
                  </div>
                  <dl className="cv-alert-inspector__kv">
                    <div>
                      <dt>触发条件</dt>
                      <dd>
                        <code>{activeRule.condition}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>检测频率</dt>
                      <dd>{activeRule.frequency}</dd>
                    </div>
                    <div>
                      <dt>推送目标</dt>
                      <dd>{activeRule.destination}</dd>
                    </div>
                  </dl>
                  <div className="cv-header-actions">
                    <button type="button" className="cv-action-button cv-action-button--secondary">
                      编辑规则
                    </button>
                    <button type="button" className="cv-secondary-button">
                      查看日志
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="cv-panel cv-workbench-section">
              <header className="cv-workbench-section__header">
                <div>
                  <p className="cv-workbench-section__eyebrow">事件流</p>
                  <h2 className="cv-workbench-section__title">告警事件</h2>
                </div>
                <span className="cv-chip">{recentEvents.length}</span>
              </header>
              <div className="cv-alert-event-list">
                {recentEvents.map((event) => (
                  <article key={event.title} className="cv-alert-event">
                    <p className="cv-alert-event__title">{event.title}</p>
                    <p className="cv-alert-event__detail">{event.detail}</p>
                    <p className="cv-alert-event__foot">{event.time}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="cv-panel cv-workbench-section">
              <header className="cv-workbench-section__header">
                <div>
                  <p className="cv-workbench-section__eyebrow">AI 能力</p>
                  <h2 className="cv-workbench-section__title">AI 规则建议</h2>
                </div>
              </header>
              <div className="cv-ai-list">
                {aiCards.map((card) => (
                  <article key={card} className="cv-ai-list__item">
                    <p className="cv-ai-list__summary">{card}</p>
                  </article>
                ))}
              </div>
              <AiActionPanel
                title="AI 规则动作"
                description=""
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
            </section>
          </aside>
        </div>
      </ModuleRuntimeGate>
    </section>
  );
}
