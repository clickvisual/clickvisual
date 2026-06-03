import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { getQueryLogs, runQueryLinkAIAnalysis } from "../api/query";
import type { AIDraftResponse, AILinkAnalyzeInput } from "../types/contracts";

type LinkTableTarget = {
  id: number;
  databaseName: string;
  tableName: string;
};

type NormalizedLogRow = {
  original: Record<string, unknown>;
  parsed: Record<string, unknown>;
  timeText: string;
  timeSource: string;
  levelText: string;
  messageText: string;
};

type LinkLogItem = {
  id: string;
  source: LinkTableTarget;
  row: NormalizedLogRow;
  timeMs: number;
  durationMs: number;
  sequence: number;
};

const LINK_AI_INPUT_BUDGET_BYTES = 24 * 1024;

function byteLength(value: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }
  return value.length * 2;
}

function truncateText(value: unknown, maxLength: number) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  if (!text || (!text.startsWith("{") && !text.startsWith("["))) {
    const objectStart = text.indexOf("{");
    const objectEnd = text.lastIndexOf("}");
    if (objectStart < 0 || objectEnd <= objectStart) {
      return null;
    }
    return parseJsonObject(text.slice(objectStart, objectEnd + 1));
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function isPresentLogValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    return text !== "[null]" && text !== "null" && text !== "nil";
  }
  return true;
}

function firstPresentValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (isPresentLogValue(value)) {
      return value;
    }
  }
  return undefined;
}

function toDateFromLogValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "number") {
    const milliseconds = Math.abs(value) < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const text = value.trim();
    const numeric = Number(text);
    if (text && Number.isFinite(numeric)) {
      return toDateFromLogValue(numeric);
    }
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatClientDateTime(value: unknown) {
  const date = toDateFromLogValue(value);
  if (!date) {
    return value === undefined || value === null || value === "" ? "-" : String(value);
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatPreciseDateTime(valueMs: number) {
  if (!Number.isFinite(valueMs) || valueMs <= 0) {
    return "-";
  }
  const date = new Date(valueMs);
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
  return `${date.toLocaleString("zh-CN", { hour12: false })}.${milliseconds}`;
}

function parseNestedJsonFields(row: Record<string, unknown>) {
  const parsed: Record<string, unknown> = {};
  ["_raw_log_", "_raw_log", "_raw", "raw_log", "raw", "content", "message", "msg"].forEach((key) => {
    const value = parseJsonObject(row[key]);
    if (value) {
      Object.assign(parsed, value);
    }
  });
  return parsed;
}

function normalizeLogRow(row: Record<string, unknown>): NormalizedLogRow {
  const parsed = parseNestedJsonFields(row);
  const merged = { ...row, ...parsed };
  const timeField = pickLogTimeField(merged);
  const timeValue = timeField ? merged[timeField] : undefined;
  const levelValue = firstPresentValue(merged, ["level", "severity", "lv", "log_level"]);
  const messageValue = firstPresentValue(merged, ["message", "msg", "content", "body", "_raw_log_"]);
  return {
    original: row,
    parsed: merged,
    timeText: formatClientDateTime(timeValue),
    timeSource: timeField ?? "-",
    levelText: levelValue === undefined ? "-" : stripAnsi(String(levelValue)),
    messageText: messageValue === undefined ? JSON.stringify(row) : stripAnsi(String(messageValue))
  };
}

function pickLogTimeField(row: Record<string, unknown>) {
  const priority = ["ts", "timestamp", "time", "_time_nanosecond_", "_time_second_", "_time", "_time_"];
  return priority.find((key) => isPresentLogValue(row[key])) ?? null;
}

function getLogRowTimeMs(row: NormalizedLogRow) {
  const value = row.timeSource !== "-" ? row.parsed[row.timeSource] : undefined;
  return toDateFromLogValue(value)?.getTime() ?? 0;
}

function formatLogDetailValue(value: unknown) {
  if (!isPresentLogValue(value)) {
    return "-";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return typeof value === "string" ? stripAnsi(value) : String(value);
}

function orderedDetailEntries(row: NormalizedLogRow) {
  const priority = new Set(["ts", "timestamp", "time", "_time_nanosecond_", "_time_second_", "_time", "_time_"]);
  return Object.entries(row.parsed).sort(([left], [right]) => {
    const leftPriority = priority.has(left) ? 0 : 1;
    const rightPriority = priority.has(right) ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return left.localeCompare(right);
  });
}

function parseDurationToMs(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 10_000 ? value * 1000 : value;
  }
  if (typeof value !== "string") {
    return 0;
  }
  const text = value.trim();
  const match = text.match(/^(-?\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)?$/i);
  if (!match) {
    return 0;
  }
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  switch ((match[2] || "ms").toLowerCase()) {
    case "ns":
      return amount / 1_000_000;
    case "us":
    case "µs":
      return amount / 1_000;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "ms":
    default:
      return amount;
  }
}

function formatDuration(valueMs: number) {
  if (!Number.isFinite(valueMs) || valueMs <= 0) {
    return "event";
  }
  if (valueMs < 1000) {
    return `${valueMs.toFixed(valueMs < 10 ? 2 : 1)} ms`;
  }
  return `${(valueMs / 1000).toFixed(2)} s`;
}

function formatOffset(valueMs: number) {
  if (!Number.isFinite(valueMs)) {
    return "-";
  }
  const sign = valueMs >= 0 ? "+" : "-";
  const abs = Math.abs(valueMs);
  if (abs < 1000) {
    return `${sign}${abs.toFixed(0)} ms`;
  }
  return `${sign}${(abs / 1000).toFixed(3)} s`;
}

function formatRelativeTimelineTime(valueMs: number) {
  if (!Number.isFinite(valueMs) || valueMs < 0) {
    return "-";
  }
  if (valueMs === 0) {
    return "0";
  }
  if (valueMs < 60_000) {
    return `${(valueMs / 1000).toFixed(valueMs < 10_000 ? 1 : 0)}s`;
  }
  const minutes = valueMs / 60_000;
  if (minutes < 60) {
    return `${Number.isInteger(minutes) ? minutes.toFixed(0) : minutes.toFixed(1)}m`;
  }
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)}h`;
}

function formatCompactTime(valueMs: number) {
  if (!Number.isFinite(valueMs) || valueMs <= 0) {
    return "-";
  }
  const date = new Date(valueMs);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function getLogDurationMs(row: NormalizedLogRow) {
  const value = firstPresentValue(row.parsed, ["duration", "durationMs", "cost", "elapsed", "latency"]);
  return parseDurationToMs(value);
}

function createLinkQueryText(value: string) {
  return `_raw_log_ like '%${value.replaceAll("'", "\\'")}%'`;
}

function compactAIFields(row: NormalizedLogRow) {
  const priority = [
    "ts",
    "timestamp",
    "time",
    "_time_nanosecond_",
    "_time_second_",
    "lv",
    "level",
    "severity",
    "msg",
    "message",
    "tid",
    "traceId",
    "spanId",
    "status",
    "code",
    "method",
    "path",
    "host.name",
    "container.name",
    "k8s.pod.name"
  ];
  const entries = Object.entries(row.parsed).filter(([, value]) => isPresentLogValue(value));
  const selected = new Map<string, unknown>();
  priority.forEach((key) => {
    if (isPresentLogValue(row.parsed[key])) {
      selected.set(key, row.parsed[key]);
    }
  });
  entries.slice(0, 24).forEach(([key, value]) => {
    if (!selected.has(key) && selected.size < 8) {
      selected.set(key, value);
    }
  });
  return Object.fromEntries(
    Array.from(selected.entries()).map(([key, value]) => [key, truncateText(formatLogDetailValue(value), 96)])
  );
}

function buildLinkAILogItem(item: LinkLogItem) {
  return {
    sequence: item.sequence,
    source: {
      tableId: item.source.id,
      databaseName: item.source.databaseName,
      tableName: item.source.tableName
    },
    time: formatPreciseDateTime(item.timeMs),
    timeSource: item.row.timeSource,
    level: truncateText(item.row.levelText, 32),
    message: truncateText(item.row.messageText, 180),
    fields: compactAIFields(item.row)
  };
}

function limitLinkAIInput(input: AILinkAnalyzeInput) {
  const next: AILinkAnalyzeInput = {
    ...input,
    anchorValue: truncateText(input.anchorValue, 160),
    query: truncateText(input.query, 260),
    logs: []
  };
  for (const item of input.logs) {
    const candidate = {
      ...next,
      logs: [...next.logs, item]
    };
    if (byteLength(JSON.stringify(candidate)) > LINK_AI_INPUT_BUDGET_BYTES) {
      break;
    }
    next.logs = candidate.logs;
  }
  if (next.logs.length === 0 && input.logs.length > 0) {
    const first = input.logs[0];
    next.logs = [
      {
        ...first,
        message: truncateText(first.message, 80),
        fields: {}
      }
    ];
  }
  return next;
}

function buildLinkAIInput({
  field,
  value,
  anchorTime,
  windowMinutes,
  query,
  range,
  tables,
  items
}: {
  field: string;
  value: string;
  anchorTime: number;
  windowMinutes: number;
  query: string;
  range: { st: number; et: number };
  tables: LinkTableTarget[];
  items: LinkLogItem[];
}): AILinkAnalyzeInput {
  return limitLinkAIInput({
    anchorField: field,
    anchorValue: value,
    anchorTime,
    windowMinutes,
    query,
    range,
    tables: tables.map((table) => ({
      tableId: table.id,
      databaseName: table.databaseName,
      tableName: table.tableName
    })),
    logs: items.map((item) => buildLinkAILogItem(item))
  });
}

function parseTables(raw: string | null): LinkTableTarget[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((item) => {
      const [idText, rest] = item.split(":");
      const dotIndex = rest?.indexOf(".") ?? -1;
      if (!idText || !rest || dotIndex < 0) {
        return null;
      }
      return {
        id: Number(idText),
        databaseName: decodeURIComponent(rest.slice(0, dotIndex)),
        tableName: decodeURIComponent(rest.slice(dotIndex + 1))
      };
    })
    .filter((item): item is LinkTableTarget => Boolean(item && Number.isFinite(item.id)));
}

export default function QueryLinkPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const field = params.get("field") || "";
  const value = params.get("value") || "";
  const anchorTime = Number(params.get("time") || "0");
  const windowMinutes = Number(params.get("window") || "5");
  const tables = useMemo(() => parseTables(params.get("tables")), [params]);
  const query = useMemo(() => createLinkQueryText(value), [value]);
  const range = useMemo(() => {
    const offset = windowMinutes * 60 * 1000;
    return {
      st: Math.floor((anchorTime - offset) / 1000),
      et: Math.floor((anchorTime + offset) / 1000)
    };
  }, [anchorTime, windowMinutes]);
  const totalRangeMs = Math.max((range.et - range.st) * 1000, 1);
  const anchorRelativeMs = Math.max(0, anchorTime - range.st * 1000);
  const [items, setItems] = useState<LinkLogItem[]>([]);
  const [errors, setErrors] = useState<Array<{ source: LinkTableTarget; message: string }>>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState("");
  const [aiAnalysis, setAIAnalysis] = useState<AIDraftResponse | null>(null);
  const [aiAnalyzedLogCount, setAIAnalyzedLogCount] = useState(0);

  async function run() {
    if (!value || !Number.isFinite(anchorTime) || tables.length === 0) {
      return;
    }
    setLoading(true);
    const settled = await Promise.allSettled(
      tables.map(async (target) => ({
        target,
        logs: await getQueryLogs(target.id, {
          ...range,
          query,
          page: 1,
          pageSize: 200
        })
      }))
    );
    const nextItems: LinkLogItem[] = [];
    const nextErrors: Array<{ source: LinkTableTarget; message: string }> = [];
    settled.forEach((item, index) => {
      if (item.status === "fulfilled") {
        item.value.logs.logs.forEach((row, rowIndex) => {
          const normalized = normalizeLogRow(row);
          nextItems.push({
            id: `${item.value.target.id}-${rowIndex}-${normalized.timeText}`,
            source: item.value.target,
            row: normalized,
            timeMs: getLogRowTimeMs(normalized),
            durationMs: getLogDurationMs(normalized),
            sequence: 0
          });
        });
      } else {
        nextErrors.push({
          source: tables[index],
          message: item.reason instanceof Error ? item.reason.message : "查询失败"
        });
      }
    });
    nextItems.sort((left, right) => left.timeMs - right.timeMs);
    nextItems.forEach((item, index) => {
      item.sequence = index + 1;
    });
    setItems(nextItems);
    setErrors(nextErrors);
    setLoading(false);
  }

  async function runAIAnalysis() {
    if (items.length === 0) {
      setAIError("当前没有可分析的链路日志，请先确认查询结果。");
      return;
    }
    setAILoading(true);
    setAIError("");
    try {
      const input = buildLinkAIInput({
        field,
        value,
        anchorTime,
        windowMinutes,
        query,
        range,
        tables,
        items
      });
      setAIAnalyzedLogCount(input.logs.length);
      const result = await runQueryLinkAIAnalysis(input);
      setAIAnalysis(result);
    } catch (error) {
      setAIError(error instanceof Error ? error.message : "AI 解析失败");
    } finally {
      setAILoading(false);
    }
  }

  useEffect(() => {
    void run();
  }, []);

  return (
    <section className="cv-section-stack cv-query-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>查询</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">链路日志</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">链路日志</h1>
        </div>
        <div className="cv-query-link-actions">
          <button type="button" className="cv-action-button cv-action-button--secondary" onClick={() => void runAIAnalysis()} disabled={aiLoading || loading}>
            {aiLoading ? "AI 解析中..." : "AI 解析"}
          </button>
          <button type="button" className="cv-action-button" onClick={() => void run()} disabled={loading}>
            {loading ? "查询中..." : "重新查询"}
          </button>
        </div>
      </header>

      <section className="cv-panel cv-query-panel cv-query-link-panel" aria-label="关联日志链路">
        <div className="cv-query-link-panel__header">
          <div>
            <strong>关联日志链路</strong>
            <span>
              {field} = {value} · 前后 {windowMinutes} 分钟 · {items.length} 条
            </span>
          </div>
          <code>{query}</code>
        </div>
        {errors.length > 0 ? (
          <div className="cv-query-link-errors">
            {errors.map((item) => (
              <span key={`${item.source.id}-${item.message}`}>
                {item.source.databaseName}.{item.source.tableName}: {item.message}
              </span>
            ))}
          </div>
        ) : null}
        {(aiAnalysis || aiError || aiLoading) ? (
          <section className="cv-query-link-ai" aria-label="AI 解析结果">
            <div className="cv-query-link-ai__header">
              <div>
                <strong>AI 排查结论</strong>
                <span>
                  基于当前链路页已加载的 {items.length} 条日志生成
                  {aiAnalyzedLogCount > 0 && aiAnalyzedLogCount < items.length ? `，已抽样 ${aiAnalyzedLogCount} 条` : ""}
                  ，不会修改查询条件。
                </span>
              </div>
              {aiLoading ? <span className="cv-pill">分析中</span> : null}
            </div>
            {aiError ? <div className="cv-query-link-ai__error">{aiError}</div> : null}
            {aiAnalysis ? (
              <div className="cv-query-link-ai__body">
                <p>{aiAnalysis.summary}</p>
                {aiAnalysis.decisions.length > 0 ? (
                  <div className="cv-query-link-ai__grid">
                    {aiAnalysis.decisions.map((item) => (
                      <article key={item.key || item.title}>
                        <strong>{item.title || item.key}</strong>
                        <span>{item.description}</span>
                      </article>
                    ))}
                  </div>
                ) : null}
                {aiAnalysis.risks.length > 0 ? (
                  <div className="cv-query-link-ai__list">
                    <strong>不确定性</strong>
                    {aiAnalysis.risks.map((item) => (
                      <span key={`${item.code}-${item.message}`}>{item.level}: {item.message}</span>
                    ))}
                  </div>
                ) : null}
                {aiAnalysis.suggestions.length > 0 ? (
                  <div className="cv-query-link-ai__list">
                    <strong>建议动作</strong>
                    {aiAnalysis.suggestions.map((item) => (
                      <span key={`${item.type}-${item.title}`}>{item.title}: {item.description}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
        <div className="cv-query-link-timeline" style={{ "--link-lane-count": String(Math.max(items.length, 1)) } as CSSProperties}>
          <div className="cv-query-link-timeline__axis" aria-hidden="true">
            <span>Service & Operation</span>
            <span className="cv-query-link-axis-label cv-query-link-axis-label--start">
              <strong>0</strong>
              <em>{formatCompactTime(range.st * 1000)}</em>
            </span>
            <span className="cv-query-link-axis-label cv-query-link-axis-label--anchor">
              <strong>{formatRelativeTimelineTime(anchorRelativeMs)}</strong>
              <em>anchor</em>
            </span>
            <span className="cv-query-link-axis-label cv-query-link-axis-label--end">
              <strong>{formatRelativeTimelineTime(totalRangeMs)}</strong>
              <em>{formatCompactTime(range.et * 1000)}</em>
            </span>
            <span>time</span>
          </div>
          {items.map((item) => {
            const expanded = expandedId === item.id;
            const relativeMs = Math.max(0, item.timeMs - range.st * 1000);
            const left = Math.max(0, Math.min(100, (relativeMs / totalRangeMs) * 100));
            const width = item.durationMs > 0 ? Math.max(0.8, Math.min(100 - left, (item.durationMs / totalRangeMs) * 100)) : 0;
            return (
              <article key={item.id} className={expanded ? "cv-query-link-item cv-query-link-item--active" : "cv-query-link-item"}>
                <button
                  type="button"
                  className="cv-query-link-item__summary"
                  aria-expanded={expanded}
                  onClick={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                >
                  <span className="cv-query-link-item__identity">
                    <strong>
                      <span>#{item.sequence}</span>
                      {item.source.databaseName}.{item.source.tableName}
                    </strong>
                    <em>{item.row.messageText}</em>
                  </span>
                  <span className="cv-query-link-item__track">
                    <span
                      className={item.durationMs > 0 ? "cv-query-link-item__bar" : "cv-query-link-item__dot"}
                      style={item.durationMs > 0 ? { left: `${left}%`, width: `${width}%` } : { left: `${left}%` }}
                      title={`${formatPreciseDateTime(item.timeMs)} · ${formatRelativeTimelineTime(relativeMs)} · ${item.row.timeSource}`}
                    />
                    <span
                      className="cv-query-link-item__time-label"
                      style={{ left: `${left}%` }}
                    >
                      {formatRelativeTimelineTime(relativeMs)}
                    </span>
                  </span>
                  <span className="cv-query-link-item__meta">
                    <strong>{formatRelativeTimelineTime(relativeMs)}</strong>
                    <em>{formatPreciseDateTime(item.timeMs)}</em>
                    <em>{item.row.timeSource} · {formatDuration(item.durationMs)}</em>
                  </span>
                </button>
                {expanded ? (
                  <div className="cv-query-link-item__detail">
                    {orderedDetailEntries(item.row).map(([key, itemValue]) => (
                      <div key={key}>
                        <strong>{key}</strong>
                        <span>{formatLogDetailValue(itemValue)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {!loading && items.length === 0 ? <div className="cv-query-empty-text">关联日志无结果</div> : null}
      </section>
    </section>
  );
}
