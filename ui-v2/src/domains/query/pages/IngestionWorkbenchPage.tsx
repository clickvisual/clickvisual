import { useEffect, useState } from "react";
import { listQueryExistingDatabases, listQueryManageInstances } from "../api/query";
import { IngestionAIAssistant } from "../components/ingestion/IngestionAIAssistant";
import { IngestionStepNav } from "../components/ingestion/IngestionStepNav";
import { IngestionSummaryPanel } from "../components/ingestion/IngestionSummaryPanel";
import { useIngestionWorkspace } from "../hooks/useIngestionWorkspace";
import type {
  AIDraftResponse,
  DetectionResult,
  NormalizationDraft,
  QueryManageInstance,
  QueryWarning,
  QueryableField
} from "../types/contracts";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseSamples(text: string) {
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) {
    return parsed as Array<Record<string, unknown>>;
  }
  if (parsed && typeof parsed === "object") {
    return [parsed as Record<string, unknown>];
  }
  throw new Error("样本必须是 JSON 对象或对象数组");
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function readSuggestedFieldKeysFromDraft(draft: AIDraftResponse | null | undefined, fields: QueryableField[]): string[] {
  if (!draft) {
    return [];
  }

  const payloadFieldKeys = draft.suggestions.flatMap((item) => {
    const payload = item.payload;
    if (!payload || typeof payload !== "object" || !("fieldKeys" in payload)) {
      return [];
    }
    const raw = (payload as { fieldKeys?: unknown }).fieldKeys;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  });

  if (payloadFieldKeys.length > 0) {
    return Array.from(new Set(payloadFieldKeys));
  }

  return (draft.decisions ?? [])
    .map((item) => {
      const normalizedKey = item.key.trim();
      return fields.find(
        (field) =>
          field.fieldKey === normalizedKey ||
          field.displayName === normalizedKey ||
          field.displayName === item.title ||
          field.fieldKey === item.title
      )?.fieldKey;
    })
    .filter((item): item is string => Boolean(item));
}

function CandidateList({
  title,
  items
}: {
  title: string;
  items: Array<{ path: string; confidence: number; reason: string }>;
}) {
  return (
    <section className="cv-section-stack cv-section-stack--tight">
      <strong>{title}</strong>
      {items.length ? (
        <ul className="cv-list">
          {items.map((item) => (
            <li key={`${title}-${item.path}`}>
              <strong>{item.path}</strong> ({formatPercent(item.confidence)}) {item.reason}
            </li>
          ))}
        </ul>
      ) : (
        <div className="cv-status-card">未识别到候选</div>
      )}
    </section>
  );
}

export default function IngestionWorkbenchPage() {
  const workspace = useIngestionWorkspace();
  const [sampleText, setSampleText] = useState("[]");
  const [sampleError, setSampleError] = useState("");
  const [instanceOptions, setInstanceOptions] = useState<QueryManageInstance[]>([]);
  const [databaseOptions, setDatabaseOptions] = useState<string[]>([]);

  useEffect(() => {
    setSampleText(pretty(workspace.sampleInput));
    setSampleError("");
  }, [workspace.sampleInput]);

  useEffect(() => {
    if (workspace.step !== "publish") {
      return;
    }
    let active = true;
    void listQueryManageInstances()
      .then((items) => {
        if (!active) {
          return;
        }
        setInstanceOptions(items);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setInstanceOptions([]);
      });
    return () => {
      active = false;
    };
  }, [workspace.step]);

  useEffect(() => {
    if (!workspace.publishTarget.instanceId) {
      setDatabaseOptions([]);
      return;
    }
    let active = true;
    void listQueryExistingDatabases(workspace.publishTarget.instanceId)
      .then((items) => {
        if (!active) {
          return;
        }
        setDatabaseOptions(items);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setDatabaseOptions([]);
      });
    return () => {
      active = false;
    };
  }, [workspace.publishTarget.instanceId]);

  function handleDetect() {
    try {
      const nextSamples = parseSamples(sampleText);
      workspace.setSampleInput(nextSamples);
      setSampleError("");
      void workspace.runDetection();
    } catch (error) {
      setSampleError(error instanceof Error ? error.message : "样本 JSON 解析失败");
    }
  }

  function applyDetectionDraft() {
    if (!workspace.detectionResult) {
      return;
    }
    workspace.updateNormalizationDraft({
      timePath: workspace.detectionResult.timeCandidates[0]?.path ?? "",
      bodyPath: workspace.detectionResult.bodyCandidates[0]?.path ?? "",
      tagPath: workspace.detectionResult.tagCandidates[0]?.path ?? "",
      needNestedJson: Boolean(workspace.detectionResult.nestedJsonCandidates[0]?.path),
      nestedJsonPath: workspace.detectionResult.nestedJsonCandidates[0]?.path
    });
  }

  function applyFieldDraft() {
    const draft = workspace.aiDrafts.fieldRecommend;
    const suggested = readSuggestedFieldKeysFromDraft(draft, workspace.queryableFields);

    if (suggested.length > 0) {
      workspace.replaceDefaultFields(suggested);
    }
  }

  function applyPublishSummary() {
    return;
  }

  const selectedInstance = instanceOptions.find((item) => item.id === workspace.publishTarget.instanceId) ?? null;
  const requiresCluster = Boolean(selectedInstance?.clusters.length);

  async function handleConfirmPublish() {
    const targetName =
      workspace.publishTarget.databaseName && workspace.publishTarget.tableName
        ? `${workspace.publishTarget.databaseName}.${workspace.publishTarget.tableName}`
        : "当前发布目标";
    if (!window.confirm(`确认创建 ${targetName} 吗？该操作会写入真实接入配置。`)) {
      return;
    }
    await workspace.confirmPublishDraft();
  }

  return (
    <section className="cv-page cv-report-page cv-ingestion-page">
      <header className="cv-page-header">
        <div>
          <p className="cv-shell__eyebrow">Ingestion Workbench</p>
          <h1 className="cv-page-title">日志接入工作台</h1>
          <p className="cv-page-description">
            先理解样本，再确认解析草案，最后决定默认查询能力。首版坚持自动推荐加人工确认，不自动发布物化列。
          </p>
        </div>
      </header>

      <div className="cv-ingestion-layout">
        <IngestionStepNav steps={workspace.steps} currentStep={workspace.step} onSelect={workspace.setStep} />

        <section className="cv-panel cv-ingestion-main">
          <div className="cv-panel-header">
            <div>
              <h2 className="cv-panel-title">接入步骤</h2>
              <p className="cv-panel-description">默认先走 JSON 路径查询，观察性能后再决定是否升级为物化列。</p>
            </div>
            <div className="cv-inline-actions">
              <button type="button" className="cv-secondary-button" onClick={() => workspace.resetWorkspace()}>
                重置草案
              </button>
            </div>
          </div>

          {workspace.step === "source" ? (
            <div className="cv-section-stack">
              <div className="cv-inline-actions">
                <button type="button" className="cv-action-button" onClick={() => workspace.applySourceType("kafka_json")}>
                  Kafka JSON 新接入
                </button>
              </div>
              <div className="cv-status-card">
                当前首版只开放 Kafka JSON 新接入，先把“样本识别 -&gt; 解析确认 -&gt; 字段目录 -&gt; 发布草案”主链路做稳。已有
                ClickHouse 表接入后续再单独设计。
              </div>
            </div>
          ) : null}

          {workspace.step === "detect" ? (
            <div className="cv-section-stack">
              <div className="cv-form-row">
                <label className="cv-label" htmlFor="ingestion-sample-json">
                  样本 JSON
                </label>
                <textarea
                  id="ingestion-sample-json"
                  className="cv-textarea"
                  value={sampleText}
                  rows={16}
                  onChange={(event) => setSampleText(event.target.value)}
                />
              </div>
              <div className="cv-inline-actions">
                <button type="button" className="cv-action-button" onClick={handleDetect} disabled={workspace.loading}>
                  {workspace.loading ? "识别中..." : "识别样本结构"}
                </button>
              </div>
              {sampleError ? (
                <div role="alert" className="cv-query-alert">
                  {sampleError}
                </div>
              ) : null}
              {workspace.detectionResult ? (
                <div className="cv-section-stack">
                  <CandidateList title="时间候选" items={workspace.detectionResult.timeCandidates} />
                  <CandidateList title="正文候选" items={workspace.detectionResult.bodyCandidates} />
                  <CandidateList title="标签候选" items={workspace.detectionResult.tagCandidates} />
                  <CandidateList title="二次 JSON 候选" items={workspace.detectionResult.nestedJsonCandidates} />
                  {workspace.detectionResult.risks.length ? (
                    <div className="cv-status-card" role="alert">
                      {workspace.detectionResult.risks.map((item) => item.message).join("；")}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {workspace.step === "normalize" ? (
            <div className="cv-section-stack">
              <div className="cv-form-two-up">
                <div className="cv-form-row">
                  <label className="cv-label" htmlFor="ingestion-time-path">
                    事件时间路径
                  </label>
                  <input
                    id="ingestion-time-path"
                    className="cv-input"
                    value={workspace.normalizationDraft?.timePath ?? ""}
                    onChange={(event) => workspace.updateNormalizationDraft({ timePath: event.target.value })}
                  />
                </div>
                <div className="cv-form-row">
                  <label className="cv-label" htmlFor="ingestion-tag-path">
                    标签路径
                  </label>
                  <input
                    id="ingestion-tag-path"
                    className="cv-input"
                    value={workspace.normalizationDraft?.tagPath ?? ""}
                    onChange={(event) => workspace.updateNormalizationDraft({ tagPath: event.target.value })}
                  />
                </div>
              </div>
              <div className="cv-form-two-up">
                <div className="cv-form-row">
                  <label className="cv-label" htmlFor="ingestion-body-path">
                    正文路径
                  </label>
                  <input
                    id="ingestion-body-path"
                    className="cv-input"
                    value={workspace.normalizationDraft?.bodyPath ?? ""}
                    onChange={(event) => workspace.updateNormalizationDraft({ bodyPath: event.target.value })}
                  />
                </div>
                <div className="cv-form-row">
                  <label className="cv-label" htmlFor="ingestion-nested-path">
                    二次 JSON 路径
                  </label>
                  <input
                    id="ingestion-nested-path"
                    className="cv-input"
                    value={workspace.normalizationDraft?.nestedJsonPath ?? ""}
                    placeholder="无则留空"
                    onChange={(event) =>
                      workspace.updateNormalizationDraft({
                        nestedJsonPath: event.target.value,
                        needNestedJson: Boolean(event.target.value)
                      })
                    }
                  />
                </div>
              </div>
              <label className="cv-checkbox-card">
                <input
                  type="checkbox"
                  checked={workspace.normalizationDraft?.needNestedJson ?? false}
                  onChange={(event) =>
                    workspace.updateNormalizationDraft({
                      needNestedJson: event.target.checked,
                      nestedJsonPath: event.target.checked
                        ? workspace.normalizationDraft?.nestedJsonPath ?? ""
                        : ""
                    })
                  }
                />
                <span>启用二次 JSON 解析。适用于正文里嵌套 JSON 字符串的日志。</span>
              </label>
              <IngestionAIAssistant
                title="AI 解析建议"
                description="AI 只根据当前候选生成解析草案，不会直接修改配置。"
                draft={workspace.aiDrafts.detectionExplain ?? null}
                disabled={!workspace.detectionResult}
                loading={workspace.aiDraftState.detectionExplain.loading}
                errorMessage={workspace.aiDraftState.detectionExplain.errorMessage}
                applyLabel="应用解析草案"
                onGenerate={() => void workspace.generateAIDraft("detectionExplain")}
                onApply={applyDetectionDraft}
                onDiscard={() => workspace.discardAIDraft("detectionExplain")}
              />
              <div className="cv-inline-actions">
                <button type="button" className="cv-action-button" onClick={() => void workspace.confirmNormalization()} disabled={workspace.loading}>
                  {workspace.loading ? "生成字段目录..." : "确认解析并生成字段目录"}
                </button>
              </div>
            </div>
          ) : null}

          {workspace.step === "fields" ? (
            <div className="cv-section-stack">
              <div className="cv-status-card">
                当前字段目录默认支持 JSON 路径查询。这里只决定首版暴露哪些默认字段，不自动新增物化列。
              </div>
              <div className="cv-table-wrap">
                <table className="cv-table">
                  <thead>
                    <tr>
                      <th>默认</th>
                      <th>字段</th>
                      <th>路径</th>
                      <th>来源</th>
                      <th>类型</th>
                      <th>覆盖/稳定</th>
                      <th>加速</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.queryableFields.map((item) => (
                      <tr key={item.fieldKey}>
                        <td>
                          <input
                            type="checkbox"
                            checked={workspace.defaultFields.includes(item.fieldKey)}
                            onChange={() => workspace.toggleDefaultField(item.fieldKey)}
                          />
                        </td>
                        <td>
                          <strong>{item.displayName}</strong>
                          <div>{item.fieldKey}</div>
                        </td>
                        <td>{item.path}</td>
                        <td>{item.source}</td>
                        <td>{item.valueType}</td>
                        <td>
                          {formatPercent(item.coverage)} / {formatPercent(item.stability)}
                        </td>
                        <td>{item.isAccelerated ? item.accelerationStatus : "JSON 路径"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <IngestionAIAssistant
                title="AI 默认字段推荐"
                description="优先推荐高覆盖、高稳定、可直接过滤的字段。应用后会覆盖当前默认字段选择。"
                draft={workspace.aiDrafts.fieldRecommend ?? null}
                disabled={!workspace.queryableFields.length}
                loading={workspace.aiDraftState.fieldRecommend.loading}
                errorMessage={workspace.aiDraftState.fieldRecommend.errorMessage}
                applyLabel="应用默认字段"
                onGenerate={() => void workspace.generateAIDraft("fieldRecommend")}
                onApply={applyFieldDraft}
                onDiscard={() => workspace.discardAIDraft("fieldRecommend")}
              />
              <div className="cv-inline-actions">
                <button type="button" className="cv-action-button" onClick={() => void workspace.buildReviewDraft()} disabled={workspace.loading}>
                  {workspace.loading ? "生成中..." : "进入发布预览"}
                </button>
              </div>
            </div>
          ) : null}

          {workspace.step === "publish" ? (
            <div className="cv-section-stack">
              <div className="cv-kv">
                <div className="cv-kv-row">
                  <span className="cv-kv-key">来源类型</span>
                  <span className="cv-kv-value">{workspace.publishDraft?.sourceType ?? "-"}</span>
                </div>
                <div className="cv-kv-row">
                  <span className="cv-kv-key">时间路径</span>
                  <span className="cv-kv-value">{workspace.publishDraft?.normalization.timePath ?? "-"}</span>
                </div>
                <div className="cv-kv-row">
                  <span className="cv-kv-key">正文路径</span>
                  <span className="cv-kv-value">{workspace.publishDraft?.normalization.bodyPath ?? "-"}</span>
                </div>
                <div className="cv-kv-row">
                  <span className="cv-kv-key">默认字段</span>
                  <span className="cv-kv-value">
                    {workspace.publishDraft?.defaultFields.length
                      ? workspace.publishDraft.defaultFields.join(", ")
                      : "未选择"}
                  </span>
                </div>
              </div>
              {workspace.publishDraft?.warnings.length ? (
                <div role="alert" className="cv-query-alert">
                  {workspace.publishDraft.warnings.map((item) => item.message).join("；")}
                </div>
              ) : null}
              <IngestionAIAssistant
                title="AI 发布摘要"
                description="AI 只生成发布说明草案，便于用户确认本次接入策略。"
                draft={workspace.aiDrafts.publishSummary ?? null}
                disabled={!workspace.publishDraft}
                loading={workspace.aiDraftState.publishSummary.loading}
                errorMessage={workspace.aiDraftState.publishSummary.errorMessage}
                applyLabel="确认采用此摘要"
                onGenerate={() => void workspace.generateAIDraft("publishSummary")}
                onApply={applyPublishSummary}
                onDiscard={() => workspace.discardAIDraft("publishSummary")}
              />
              <div className="cv-inline-actions">
                <button type="button" className="cv-action-button" onClick={() => void handleConfirmPublish()} disabled={workspace.loading}>
                  {workspace.loading ? "创建中..." : "确认并创建"}
                </button>
              </div>
              <div className="cv-form-two-up">
                <label className="cv-form-row">
                  <span className="cv-label">发布实例</span>
                  <select
                    className="cv-input"
                    aria-label="发布实例"
                    value={workspace.publishTarget.instanceId ? String(workspace.publishTarget.instanceId) : ""}
                    onChange={(event) =>
                      workspace.updatePublishTarget({
                        instanceId: Number(event.target.value),
                        cluster: ""
                      })
                    }
                  >
                    <option value="">选择实例</option>
                    {instanceOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="cv-form-row">
                  <span className="cv-label">时间类型</span>
                  <select
                    className="cv-input"
                    aria-label="时间类型"
                    value={String(workspace.publishTarget.timeFieldType)}
                    onChange={(event) =>
                      workspace.setPublishTimeFieldType(Number(event.target.value))
                    }
                  >
                    <option value="1">Unix 秒</option>
                    <option value="2">Unix 毫秒</option>
                    <option value="0">DateTime</option>
                    <option value="3">DateTime64(3)</option>
                    <option value="4">DateTime64(6)</option>
                    <option value="5">DateTime64(9)</option>
                  </select>
                </label>
              </div>
              <div className="cv-form-two-up">
                <label className="cv-form-row">
                  <span className="cv-label">数据库</span>
                  <input
                    className="cv-input"
                    aria-label="数据库"
                    list="ingestion-publish-database-options"
                    value={workspace.publishTarget.databaseName}
                    onChange={(event) =>
                      workspace.updatePublishTarget({
                        databaseName: event.target.value
                      })
                    }
                    placeholder="选择或输入数据库"
                  />
                  <datalist id="ingestion-publish-database-options">
                    {databaseOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <label className="cv-form-row">
                  <span className="cv-label">日志库</span>
                  <input
                    className="cv-input"
                    aria-label="日志库"
                    value={workspace.publishTarget.tableName}
                    onChange={(event) =>
                      workspace.updatePublishTarget({
                        tableName: event.target.value
                      })
                    }
                    placeholder="输入日志库名"
                  />
                </label>
              </div>
              {requiresCluster ? (
                <label className="cv-form-row">
                  <span className="cv-label">Cluster</span>
                  <select
                    className="cv-input"
                    aria-label="Cluster"
                    value={workspace.publishTarget.cluster ?? ""}
                    onChange={(event) =>
                      workspace.updatePublishTarget({
                        cluster: event.target.value
                      })
                    }
                  >
                    <option value="">选择 cluster</option>
                    {selectedInstance?.clusters.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="cv-form-row">
                <span className="cv-label">接入描述</span>
                <input
                  className="cv-input"
                  aria-label="接入描述"
                  value={workspace.publishTarget.desc}
                  onChange={(event) =>
                    workspace.updatePublishTarget({
                      desc: event.target.value
                    })
                  }
                  placeholder="说明本次接入用途"
                />
              </label>
              {workspace.confirmations.publishConfirmed ? (
                <div className="cv-status-card" role="status">
                  已创建 {workspace.publishResult?.databaseName}.{workspace.publishResult?.tableName}，
                  共写入 {workspace.publishResult?.fieldCount ?? 0} 个查询字段，仍由人工完成最后执行确认。
                </div>
              ) : null}
            </div>
          ) : null}

          {workspace.errorMessage ? (
            <div role="alert" className="cv-query-alert">
              {workspace.errorMessage}
            </div>
          ) : null}
        </section>

        <IngestionSummaryPanel summary={workspace.summary} />
      </div>
    </section>
  );
}
