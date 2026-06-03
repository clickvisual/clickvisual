interface IngestionSummaryPanelProps {
  summary: {
    sourceType: string | null;
    timePath: string;
    bodyPath: string;
    tagPath: string;
    nestedJsonPath: string;
    fieldCount: number;
    defaultFieldCount: number;
    warningCount: number;
  };
}

export function IngestionSummaryPanel({ summary }: IngestionSummaryPanelProps) {
  return (
    <aside className="cv-panel cv-ingestion-summary">
      <div className="cv-panel-header">
        <div>
          <h3 className="cv-panel-title">当前草案摘要</h3>
          <p className="cv-panel-description">跨步骤持续展示，避免配置走散。</p>
        </div>
      </div>
      <dl className="cv-kv">
        <div className="cv-kv-row">
          <dt>来源</dt>
          <dd>{summary.sourceType ?? "未选择"}</dd>
        </div>
        <div className="cv-kv-row">
          <dt>时间路径</dt>
          <dd>{summary.timePath || "未确认"}</dd>
        </div>
        <div className="cv-kv-row">
          <dt>正文路径</dt>
          <dd>{summary.bodyPath || "未确认"}</dd>
        </div>
        <div className="cv-kv-row">
          <dt>标签路径</dt>
          <dd>{summary.tagPath || "未确认"}</dd>
        </div>
        <div className="cv-kv-row">
          <dt>二次 JSON</dt>
          <dd>{summary.nestedJsonPath || "无"}</dd>
        </div>
        <div className="cv-kv-row">
          <dt>字段数</dt>
          <dd>{summary.fieldCount}</dd>
        </div>
        <div className="cv-kv-row">
          <dt>默认字段</dt>
          <dd>{summary.defaultFieldCount}</dd>
        </div>
        <div className="cv-kv-row">
          <dt>风险项</dt>
          <dd>{summary.warningCount}</dd>
        </div>
      </dl>
    </aside>
  );
}
