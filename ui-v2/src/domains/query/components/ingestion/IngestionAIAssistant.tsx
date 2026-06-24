import type { AIDraftResponse } from "../../types/contracts";

interface IngestionAIAssistantProps {
  title: string;
  description: string;
  draft: AIDraftResponse | null;
  disabled?: boolean;
  loading?: boolean;
  errorMessage?: string;
  applyLabel?: string;
  onGenerate: () => void;
  onApply?: () => void;
  onDiscard?: () => void;
}

export function IngestionAIAssistant({
  title,
  description,
  draft,
  disabled = false,
  loading = false,
  errorMessage = "",
  applyLabel = "应用草案",
  onGenerate,
  onApply,
  onDiscard
}: IngestionAIAssistantProps) {
  return (
    <section className="cv-section-stack">
      <div className="cv-panel-header">
        <div>
          <h3 className="cv-panel-title">{title}</h3>
          <p className="cv-panel-description">{description}</p>
        </div>
        <span className="cv-pill">AI 仅生成草案</span>
      </div>

      {draft ? (
        <>
          <div className="cv-status-card">{draft.summary}</div>

          {draft.decisions.length ? (
            <div className="cv-section-stack cv-section-stack--tight">
              <strong>建议动作</strong>
              <ul className="cv-list">
                {draft.decisions.map((item) => (
                  <li key={item.key}>
                    <strong>{item.title}：</strong>
                    {item.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {draft.risks.length ? (
            <div className="cv-section-stack cv-section-stack--tight">
              <strong>风险提示</strong>
              <ul className="cv-list">
                {draft.risks.map((item) => (
                  <li key={`${item.code}-${item.message}`}>{item.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {draft.suggestions.length ? (
            <div className="cv-section-stack cv-section-stack--tight">
              <strong>草案内容</strong>
              <ul className="cv-list">
                {draft.suggestions.map((item) => (
                  <li key={`${item.type}-${item.title}`}>
                    <strong>{item.title}：</strong>
                    {item.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="cv-inline-actions">
            {onApply ? (
              <button type="button" className="cv-action-button" onClick={onApply}>
                {applyLabel}
              </button>
            ) : null}
            {onDiscard ? (
              <button type="button" className="cv-secondary-button" onClick={onDiscard}>
                丢弃草案
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <div className="cv-inline-actions">
          <button type="button" className="cv-secondary-button" onClick={onGenerate} disabled={disabled || loading}>
            {loading ? "生成中..." : "生成 AI 草案"}
          </button>
        </div>
      )}

      {errorMessage ? (
        <div role="alert" className="cv-query-alert">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
