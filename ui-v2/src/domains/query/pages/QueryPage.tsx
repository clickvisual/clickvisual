import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { getTimeRangeLabel, useTimeRange } from "../../../shared/state/TimeRangeContext";
import { useQueryWorkspace } from "../hooks/useQueryWorkspace";

const pageStyle: CSSProperties = {
  display: "grid",
  gap: 12
};

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(37, 99, 235, 0.08)",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)"
};

const compactGridStyle: CSSProperties = {
  display: "grid",
  gap: 12
};

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  minWidth: 180,
  flex: "1 1 180px"
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#335c99"
};

const selectStyle: CSSProperties = {
  height: 32,
  borderRadius: 10,
  border: "1px solid rgba(37, 99, 235, 0.08)",
  padding: "0 12px",
  background: "#ffffff",
  color: "#0f172a"
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 84,
  borderRadius: 10,
  border: "1px solid rgba(37, 99, 235, 0.08)",
  padding: 10,
  background: "#ffffff",
  resize: "vertical",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  lineHeight: 1.5,
  color: "#0f172a"
};

const primaryButtonStyle: CSSProperties = {
  height: 32,
  borderRadius: 10,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  padding: "0 12px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13
};

const secondaryButtonStyle: CSSProperties = {
  height: 32,
  borderRadius: 10,
  border: "1px solid rgba(37, 99, 235, 0.08)",
  background: "#ffffff",
  color: "#335c99",
  padding: "0 12px",
  fontWeight: 700,
  fontSize: 13
};

const histogramStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(48px, 1fr))",
  alignItems: "end",
  gap: 8
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse"
};

const truncateTextStyle: CSSProperties = {
  display: "inline-block",
  maxWidth: 560,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  verticalAlign: "bottom"
};

const suggestionChipStyle: CSSProperties = {
  border: "1px solid rgba(37, 99, 235, 0.08)",
  background: "#eff6ff",
  color: "#1e3a8a",
  borderRadius: 999,
  minHeight: 24,
  padding: "0 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer"
};

const tabButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  cursor: "pointer"
};

type QueryResultTab = "raw" | "agg" | "trace" | "json";

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function truncate(value: unknown, maxLength = 96) {
  const text = String(value ?? "");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function pickMessageField(row: Record<string, unknown>) {
  const priorities = ["message", "msg", "_raw_log_", "content"];
  for (const key of priorities) {
    if (row[key]) {
      return row[key];
    }
  }
  return JSON.stringify(row);
}

export default function QueryPage() {
  const { timeRange } = useTimeRange();
  const workspace = useQueryWorkspace(timeRange);
  const [activeTab, setActiveTab] = useState<QueryResultTab>("raw");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const chartMax = useMemo(
    () => workspace.charts.reduce((max, item) => Math.max(max, item.count), 0) || 1,
    [workspace.charts]
  );

  const aggregationRows = useMemo(() => {
    const rows = workspace.logs?.logs ?? [];
    const summary = new Map<string, number>();
    rows.forEach((row) => {
      const level = String(row.level ?? row.severity ?? "UNKNOWN");
      summary.set(level, (summary.get(level) ?? 0) + 1);
    });
    return Array.from(summary.entries()).map(([key, value]) => ({ key, value }));
  }, [workspace.logs]);

  const traceTokens = useMemo(() => {
    const fixed = ["trace-trace_id", "trace-span_id", "trace-request_id"];
    const dynamic = new Set<string>();
    (workspace.logs?.logs ?? []).forEach((row) => {
      ["trace_id", "traceId", "span_id", "request_id"].forEach((key) => {
        const value = row[key];
        if (value) {
          dynamic.add(`trace-${String(value)}`);
        }
      });
    });
    return [...fixed, ...Array.from(dynamic)].slice(0, 6);
  }, [workspace.logs]);

  const jsonPreview = useMemo(() => {
    if (!workspace.logs?.logs?.length) {
      return "[]";
    }
    return JSON.stringify(workspace.logs.logs, null, 2);
  }, [workspace.logs]);

  const selectedLog = useMemo(() => workspace.logs?.logs?.[0] ?? null, [workspace.logs]);

  const traceFieldEntries = useMemo(() => {
    if (!selectedLog) {
      return [];
    }
    return ["trace_id", "traceId", "span_id", "request_id"]
      .map((key) => [key, selectedLog[key]] as const)
      .filter(([, value]) => value !== undefined && value !== null && value !== "");
  }, [selectedLog]);

  const selectedJsonPreview = useMemo(() => {
    if (!selectedLog) {
      return "{}";
    }
    return JSON.stringify(selectedLog, null, 2);
  }, [selectedLog]);

  async function handleSaveQuery() {
    const saved = workspace.saveCurrentQuery();
    setFeedbackMessage(saved ? "已保存当前查询" : "请输入查询内容后再保存");
  }

  function handleAiOptimize() {
    const text = workspace.queryText.trim();
    if (!text) {
      workspace.setQueryText("level:error AND service:gateway");
      setFeedbackMessage("已填入一条更适合排错的查询模板");
      return;
    }
    if (!text.includes("service:")) {
      workspace.setQueryText(`${text} AND service:gateway`);
      setFeedbackMessage("已补充 service 过滤，减少扫描范围");
      return;
    }
    setFeedbackMessage("当前查询已经具备基础过滤条件");
  }

  async function handleTraceRefine(value: unknown) {
    const text = String(value ?? "").trim();
    if (!text) {
      return;
    }
    workspace.setQueryText(`trace_id:${text}`);
    setFeedbackMessage(`已切换为 trace_id:${text}，请执行查询查看链路相关日志`);
    setActiveTab("trace");
  }

  return (
    <section style={pageStyle}>
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>查询</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">日志查询</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">日志查询</h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center" }}>
            {getTimeRangeLabel(timeRange)}
          </span>
          <span style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center" }}>
            {workspace.selectedTableId ? `tableId #${workspace.selectedTableId}` : "等待解析日志库"}
          </span>
        </div>
      </header>

      <section aria-label="查询上下文" style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, color: "#0f172a" }}>查询上下文</h2>
          </div>
          {workspace.contextLoading ? <span style={{ color: "#2563eb", fontSize: 13 }}>加载中...</span> : null}
        </div>
        <div className="cv-query-context">
          <section role="tree" aria-label="实例与数据库" className="cv-query-tree">
            <div className="cv-query-tree__heading">
              <strong>数据源结构</strong>
              <span>实例 / 数据库</span>
            </div>
            {workspace.instances.map((item) => {
              const isActiveInstance = workspace.selectedInstanceId === item.id;
              return (
                <div
                  key={item.id}
                  role="treeitem"
                  aria-label={item.name}
                  aria-expanded={isActiveInstance}
                  className="cv-query-tree__group"
                >
                  <button
                    type="button"
                    className={`cv-query-tree__instance${isActiveInstance ? " cv-query-tree__instance--active" : ""}`}
                    onClick={() => workspace.setSelectedInstanceId(item.id)}
                  >
                    <span className="cv-query-tree__instance-mark" aria-hidden="true" />
                    {item.name}
                  </button>
                  {isActiveInstance ? (
                    <div role="group" aria-label={`${item.name} 数据库`} className="cv-query-tree__children">
                      {workspace.databases.map((database) => {
                        const isActiveDatabase = workspace.selectedDatabase === database.name;
                        return (
                          <button
                            key={database.name}
                            type="button"
                            aria-pressed={isActiveDatabase}
                            aria-label={`数据库 ${database.name}`}
                            className={`cv-query-tree__database${isActiveDatabase ? " cv-query-tree__database--active" : ""}`}
                            onClick={() => workspace.setSelectedDatabase(database.name)}
                          >
                            <span className="cv-query-tree__database-rail" aria-hidden="true" />
                            <span className="cv-query-tree__database-dot" aria-hidden="true" />
                            {database.name}
                          </button>
                        );
                      })}
                      {workspace.databases.length === 0 ? (
                        <span className="cv-query-tree__empty">
                          当前实例暂无数据库
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>

          <div className="cv-query-context__main">
            <div className="cv-query-context__meta">
              <span style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center" }}>
                {workspace.selectedInstance?.name ?? "未选择实例"}
              </span>
              <span style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center" }}>
                {workspace.selectedDatabase || "未选择数据库"}
              </span>
            </div>
            <label style={fieldStyle}>
              <span style={labelStyle}>表</span>
              <select
                aria-label="表"
                style={selectStyle}
                value={workspace.selectedTable}
                onChange={(event) => workspace.setSelectedTable(event.target.value)}
              >
                {workspace.tables.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {workspace.tables.length === 0 ? (
              <span className="cv-query-context__empty">
                当前数据库下暂无数据表，请切换其他数据库继续查询。
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-label="查询输入" style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, color: "#0f172a" }}>查询输入</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center" }}>DSL 模式</span>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void workspace.runQuery(1)}
              disabled={workspace.loading}
            >
              {workspace.loading ? "查询中..." : "查询"}
            </button>
            <button
              type="button"
              style={tabButtonStyle}
              onClick={() => void handleSaveQuery()}
            >
              保存查询
            </button>
            <button
              type="button"
              style={tabButtonStyle}
              onClick={() => setActiveTab("agg")}
            >
              生成图表
            </button>
            <button
              type="button"
              style={tabButtonStyle}
              onClick={handleAiOptimize}
            >
              AI 优化查询
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void workspace.runQuery(1)}
              disabled={workspace.loading}
            >
              {workspace.loading ? "查询中..." : "执行查询"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <textarea
            style={textareaStyle}
            placeholder="输入查询语句，例如 level:error AND service:gateway"
            value={workspace.queryText}
            onChange={(event) => workspace.setQueryText(event.target.value)}
          />
        </div>
        {feedbackMessage ? (
          <div
            style={{
              marginTop: 10,
              borderRadius: 12,
              padding: "6px 10px",
              background: "#eff6ff",
              border: "1px solid rgba(37, 99, 235, 0.08)",
              color: "#1d4ed8",
              fontSize: 12,
              fontWeight: 700
            }}
          >
            {feedbackMessage}
          </div>
        ) : null}
        <div style={{ ...compactGridStyle, marginTop: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <strong style={{ fontSize: 12, color: "#335c99" }}>字段提示</strong>
            <div style={rowStyle}>
              {workspace.suggestionFields.length > 0 ? (
                workspace.suggestionFields.map((item) => (
                  <button
                    key={`field-${item}`}
                    type="button"
                    style={suggestionChipStyle}
                    onClick={() => workspace.applySuggestion(item)}
                  >
                    {item}
                  </button>
                ))
              ) : (
                <span style={{ color: "#64748b", fontSize: 12 }}>当前表暂无可用字段提示</span>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <strong style={{ fontSize: 12, color: "#335c99" }}>历史记录</strong>
            <div style={rowStyle}>
              {workspace.queryHistory.length > 0 ? (
                workspace.queryHistory.map((item) => (
                  <button
                    key={`history-${item}`}
                    type="button"
                    style={suggestionChipStyle}
                    onClick={() => workspace.applySuggestion(item)}
                  >
                    {truncate(item, 42)}
                  </button>
                ))
              ) : (
                <span style={{ color: "#64748b", fontSize: 12 }}>执行查询后会按日志库保存最近 10 条记录</span>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <strong style={{ fontSize: 12, color: "#335c99" }}>自动补全</strong>
            <div style={rowStyle}>
              {workspace.autocompleteItems.length > 0 ? (
                workspace.autocompleteItems.map((item) => (
                  <button
                    key={`auto-${item}`}
                    type="button"
                    style={suggestionChipStyle}
                    onClick={() => workspace.applySuggestion(item)}
                  >
                    {truncate(item, 42)}
                  </button>
                ))
              ) : (
                <span style={{ color: "#64748b", fontSize: 12 }}>输入查询内容后会返回实例侧的补全建议</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="直方图" style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, color: "#0f172a" }}>直方图</h2>
          </div>
          {workspace.chartLoading ? <span style={{ color: "#2563eb", fontSize: 13 }}>加载中...</span> : null}
        </div>
        {workspace.charts.length > 0 ? (
          <div style={{ ...histogramStripStyle, marginTop: 14 }}>
            {workspace.charts.map((item) => (
              <div key={`${item.from}-${item.to}`} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                <button
                  type="button"
                  title={`${item.count}`}
                  onClick={() => void workspace.runQuery(1, { st: item.from, et: item.to })}
                  style={{
                    width: "100%",
                    minHeight: 12,
                    height: `${Math.max(12, Math.round((item.count / chartMax) * 72))}px`,
                    borderRadius: 10,
                    background: "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)",
                    border: "none",
                    cursor: "pointer"
                  }}
                />
                <span style={{ fontSize: 12, color: "#475569" }}>{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>当前没有可展示的直方图数据。</div>
        )}
      </section>

      <section aria-label="查询结果" style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, color: "#0f172a" }}>查询结果</h2>
          </div>
          {workspace.logs ? (
            <div style={{ display: "flex", gap: 16, color: "#1e3a8a", fontWeight: 700 }}>
              <span>共 {formatCount(workspace.logs.count)} 条结果</span>
              <span>耗时 {workspace.logs.cost} ms</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={activeTab === "raw" ? primaryButtonStyle : tabButtonStyle} onClick={() => setActiveTab("raw")}>
            原始日志
          </button>
          <button type="button" style={activeTab === "agg" ? primaryButtonStyle : tabButtonStyle} onClick={() => setActiveTab("agg")}>
            聚合统计
          </button>
          <button type="button" style={activeTab === "trace" ? primaryButtonStyle : tabButtonStyle} onClick={() => setActiveTab("trace")}>
            Trace 视图
          </button>
          <button type="button" style={activeTab === "json" ? primaryButtonStyle : tabButtonStyle} onClick={() => setActiveTab("json")}>
            JSON 视图
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {traceTokens.map((item) => (
            <button
              key={item}
              type="button"
              style={tabButtonStyle}
              onClick={() => workspace.applySuggestion(item.replace(/^trace-/, ""))}
            >
              {item}
            </button>
          ))}
        </div>

        {workspace.errorMessage ? (
          <div
            role="alert"
            style={{
              marginTop: 12,
              borderRadius: 12,
              padding: "10px 12px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8"
            }}
          >
            {workspace.errorMessage}
          </div>
        ) : null}

        {!workspace.errorMessage && workspace.logs && workspace.logs.logs.length > 0 ? (
          <div style={{ ...compactGridStyle, marginTop: 12 }}>
            {activeTab === "raw" ? (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(37, 99, 235, 0.08)" }}>
                    <th style={{ padding: "0 0 10px", color: "#335c99", fontSize: 12 }}>时间</th>
                    <th style={{ padding: "0 0 10px", color: "#335c99", fontSize: 12 }}>级别</th>
                    <th style={{ padding: "0 0 10px", color: "#335c99", fontSize: 12 }}>内容</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.logs.logs.map((row, index) => (
                    <tr
                      key={`${index}-${String(row._time ?? row.time ?? "")}`}
                      style={{
                        borderBottom: "1px solid rgba(37, 99, 235, 0.06)",
                        background: index === 0 ? "#f8fbff" : "transparent"
                      }}
                    >
                      <td style={{ padding: "8px 0", color: "#0f172a", verticalAlign: "top", fontSize: 12 }}>
                        {String(row._time ?? row.time ?? "-")}
                      </td>
                      <td style={{ padding: "8px 0", color: "#1d4ed8", verticalAlign: "top", fontWeight: 700, fontSize: 12 }}>
                        {String(row.level ?? row.severity ?? "-")}
                      </td>
                      <td style={{ padding: "8px 0", color: "#334155", verticalAlign: "top", fontSize: 12 }}>
                        <span style={truncateTextStyle} title={String(pickMessageField(row))}>
                          {truncate(pickMessageField(row))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {activeTab === "agg" ? (
              <div style={{ display: "grid", gap: 8 }}>
                {aggregationRows.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid rgba(37, 99, 235, 0.08)",
                      borderRadius: 10,
                      padding: "8px 10px",
                      background: "#f8fbff"
                    }}
                  >
                    <strong style={{ color: "#0f172a" }}>{item.key}</strong>
                    <span style={{ color: "#1d4ed8", fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {activeTab === "trace" ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  {traceFieldEntries.length > 0 ? (
                    traceFieldEntries.map(([key, value]) => (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          border: "1px solid rgba(37, 99, 235, 0.08)",
                          borderRadius: 10,
                          padding: "8px 10px",
                          background: "#f8fbff"
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ color: "#0f172a" }}>{key}</strong>
                          <span style={{ color: "#475569", fontSize: 12 }}>{String(value)}</span>
                        </div>
                        <button type="button" style={tabButtonStyle} onClick={() => void handleTraceRefine(value)}>
                          按 {key} 重查
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#64748b", fontSize: 13 }}>当前日志没有可用的 trace 字段。</div>
                  )}
                </div>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  当前视图优先暴露 trace 相关 hook，后续可继续接入 trace 链路详情和关联跳转。
                </div>
              </div>
            ) : null}
            {activeTab === "json" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    borderRadius: 10,
                    border: "1px solid rgba(37, 99, 235, 0.08)",
                    padding: "8px 10px",
                    background: "#f8fbff"
                  }}
                >
                  <strong style={{ color: "#0f172a" }}>当前选中日志</strong>
                  <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                    默认展示第一条命中日志的完整 JSON，便于复制和比对字段。
                  </div>
                </div>
                <pre
                  style={{
                    margin: 0,
                    borderRadius: 10,
                    border: "1px solid rgba(37, 99, 235, 0.08)",
                    padding: 10,
                    background: "#f8fbff",
                    color: "#0f172a",
                    overflow: "auto",
                    fontSize: 12,
                    lineHeight: 1.6
                  }}
                >
                  {selectedJsonPreview}
                </pre>
                <details>
                  <summary style={{ cursor: "pointer", color: "#1d4ed8", fontWeight: 700 }}>查看当前页全部 JSON</summary>
                  <pre
                    style={{
                      margin: "10px 0 0",
                      borderRadius: 10,
                      border: "1px solid rgba(37, 99, 235, 0.08)",
                      padding: 10,
                      background: "#f8fbff",
                      color: "#0f172a",
                      overflow: "auto",
                      fontSize: 12,
                      lineHeight: 1.6
                    }}
                  >
                    {jsonPreview}
                  </pre>
                </details>
              </div>
            ) : null}
            {selectedLog ? (
              <section
                aria-label="日志详情"
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(37, 99, 235, 0.08)",
                  padding: 10,
                  background: "#f8fbff",
                  display: "grid",
                  gap: 10
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <strong style={{ color: "#0f172a" }}>日志详情</strong>
                    <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                      当前先展示首条命中日志的关键字段，后续可扩到显式行选择。
                    </div>
                  </div>
                  <button type="button" style={tabButtonStyle} onClick={() => setActiveTab("json")}>
                    查看 JSON 详情
                  </button>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {Object.entries(selectedLog)
                    .slice(0, 6)
                    .map(([key, value]) => (
                      <div
                        key={key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "160px minmax(0, 1fr)",
                          gap: 12,
                          alignItems: "start"
                        }}
                      >
                        <strong style={{ color: "#335c99", fontSize: 12 }}>{key}</strong>
                        <span style={{ color: "#334155", fontSize: 13, wordBreak: "break-all" }}>{String(value)}</span>
                      </div>
                    ))}
                </div>
              </section>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#64748b", fontSize: 13 }}>
                第 {workspace.page} 页，每页 {workspace.pageSize} 条
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={workspace.page <= 1 || workspace.loading}
                  onClick={() => void workspace.runQuery(workspace.page - 1)}
                >
                  上一页
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={workspace.loading || workspace.logs.logs.length < workspace.pageSize}
                  onClick={() => void workspace.runQuery(workspace.page + 1)}
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!workspace.errorMessage && workspace.logs && workspace.logs.logs.length === 0 ? (
          <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>当前查询没有命中结果。</div>
        ) : null}

        {!workspace.errorMessage && !workspace.logs ? (
          <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
            选择上下文并执行查询后，这里会展示真实日志结果。
          </div>
        ) : null}
      </section>
    </section>
  );
}
