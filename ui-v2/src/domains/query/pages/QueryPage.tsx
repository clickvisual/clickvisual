import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import QueryAccessLogLibraryModal from "../components/QueryAccessLogLibraryModal";
import QueryCreateDatabaseModal from "../components/QueryCreateDatabaseModal";
import QueryEditDatabaseModal from "../components/QueryEditDatabaseModal";
import {
  createQueryShareShortUrl,
  deleteQueryDatabase,
  deleteQueryTable,
  getQueryFieldStats
} from "../api/query";
import { buildQueryFieldRef, buildStructuredConditions, useQueryWorkspace } from "../hooks/useQueryWorkspace";
import type {
  QueryFieldStatsResponse,
  QueryFieldRef,
  QueryFilterCondition,
  QueryFilterValueType,
  QuerySourceDatabase,
  QuerySourceInstance,
  QuerySourceTable,
  QuerySourceTreeTarget
} from "../types/contracts";
import ContextMenu from "../../../shared/components/ContextMenu";
import { buildV2RouteHref } from "../../../shared/layout/VersionSwitcher";

type QueryDateRange = [Date, Date] | null;
type QueryConditionModalMode = "create" | "edit";
type NormalizedLogRow = {
  original: Record<string, unknown>;
  parsed: Record<string, unknown>;
  timeText: string;
  levelText: string;
  messageText: string;
};
type QueryResultColumn = {
  key: string;
  label: string;
  kind: "builtin" | "field";
};
type TraceTag = {
  key?: string;
  vStr?: string;
  vInt64?: number;
  vBool?: boolean;
  vFloat64?: number;
  vType?: string;
};
type TraceSpanRaw = {
  traceId: string;
  spanId: string;
  operationName?: string;
  startTime?: string;
  duration?: string | number;
  references?: Array<{ spanId?: string }>;
  process?: {
    serviceName?: string;
    tags?: TraceTag[];
  };
  tags?: TraceTag[];
  logs?: Array<{ timestamp?: string; fields?: TraceTag[] }>;
};
type TraceSpanNode = {
  key: string;
  raw: TraceSpanRaw;
  row: Record<string, unknown>;
  children: TraceSpanNode[];
  startMs: number;
  durationMs: number;
  depth: number;
  virtual?: boolean;
};
type TraceGroup = {
  key: string;
  traceId: string;
  root: TraceSpanNode;
  startMs: number;
  endMs: number;
  durationMs: number;
  serviceCount: number;
  spanCount: number;
};
type LinkQueryTableTarget = {
  id: number;
  databaseName: string;
  tableName: string;
};
type LinkQueryAnchor = {
  field: string;
  value: string;
  timeMs: number;
};
type TableAutoQueryRequest = {
  instanceId: number;
  databaseName: string;
  tableId: number;
  tableName: string;
  conditions: QueryFilterCondition[];
  range: {
    st: number;
    et: number;
  };
};
type OpenLogTab = {
  id: number;
  databaseName: string;
  tableName: string;
};
type QuickTimeRange = {
  label: string;
  minutes: number;
};
type LogDetailNestedEntry = {
  key: string;
  value: string;
  fieldRef?: QueryFieldRef;
};

const DEFAULT_RESULT_COLUMN_KEYS = ["__time", "__level", "__message"] as const;
const RESULT_COLUMN_STORAGE_PREFIX = "clickvisual-v2-query-result-columns";
const QUICK_TIME_RANGES: QuickTimeRange[] = [
  { label: "Last 15 minutes", minutes: 15 },
  { label: "Last 30 minutes", minutes: 30 },
  { label: "Last 1 hour", minutes: 60 },
  { label: "Last 6 hours", minutes: 6 * 60 },
  { label: "Last 12 hours", minutes: 12 * 60 },
  { label: "Last 24 hours", minutes: 24 * 60 },
  { label: "Last 2 days", minutes: 2 * 24 * 60 },
  { label: "Last 7 days", minutes: 7 * 24 * 60 },
  { label: "Last 30 days", minutes: 30 * 24 * 60 },
  { label: "Last 90 days", minutes: 90 * 24 * 60 },
  { label: "Last 6 months", minutes: 183 * 24 * 60 },
  { label: "Last 1 year", minutes: 365 * 24 * 60 }
];

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function roundUpChartAxisMax(value: number) {
  if (value <= 10) {
    return 10;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function formatDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildDefaultTimeRange() {
  const end = new Date(Date.now());
  end.setSeconds(0, 0);
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  return [start, end] as [Date, Date];
}

function buildInitialTimeRangeFromSearchParams(searchParams: URLSearchParams) {
  const start = Number(searchParams.get("start") || searchParams.get("st") || "");
  const end = Number(searchParams.get("end") || searchParams.get("et") || "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= start) {
    return buildDefaultTimeRange();
  }
  return [new Date(start * 1000), new Date(end * 1000)] as [Date, Date];
}

function writeTimeRangeToURL(range: QueryDateRange) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (range) {
    const { st, et } = toSecondRange(range);
    url.searchParams.set("start", String(st));
    url.searchParams.set("end", String(et));
  } else {
    url.searchParams.delete("start");
    url.searchParams.delete("end");
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(window.history.state, "", next);
  }
}

function readPositiveIntSearchParam(searchParams: URLSearchParams, key: string) {
  const value = Number(searchParams.get(key) || "");
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function buildRecentMinutesTimeRange(minutes: number) {
  const end = new Date(Date.now());
  end.setSeconds(0, 0);
  const start = new Date(end.getTime() - minutes * 60 * 1000);
  return [start, end] as [Date, Date];
}

function toSecondRange(range: [Date, Date]) {
  return {
    st: Math.floor(range[0].getTime() / 1000),
    et: Math.floor(range[1].getTime() / 1000)
  };
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
  return copied;
}

function formatTimeRangeDisplay(range: QueryDateRange) {
  if (!range) {
    return "Select time range";
  }
  const [start, end] = range;
  const now = new Date(Date.now());
  const endDeltaSeconds = Math.abs(end.getTime() - now.getTime()) / 1000;
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  const quickRange = QUICK_TIME_RANGES.find((item) => item.minutes === durationMinutes);
  if (quickRange && endDeltaSeconds < 90) {
    return quickRange.label;
  }
  return `${formatDateTimeLocalValue(start).replace("T", " ")} to ${formatDateTimeLocalValue(end).replace("T", " ")}`;
}

function TimeRangeDropdown({
  value,
  onChange
}: {
  value: QueryDateRange;
  onChange: (value: QueryDateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [absoluteStart, setAbsoluteStart] = useState(value ? formatDateTimeLocalValue(value[0]) : "");
  const [absoluteEnd, setAbsoluteEnd] = useState(value ? formatDateTimeLocalValue(value[1]) : "");
  const label = formatTimeRangeDisplay(value);
  const activeDurationMinutes = value ? Math.round((value[1].getTime() - value[0].getTime()) / 60_000) : null;
  const visibleRanges = QUICK_TIME_RANGES.filter((item) =>
    item.label.toLowerCase().includes(quickSearch.trim().toLowerCase())
  );

  useEffect(() => {
    if (!open || !value) {
      return;
    }
    setAbsoluteStart(formatDateTimeLocalValue(value[0]));
    setAbsoluteEnd(formatDateTimeLocalValue(value[1]));
  }, [open, value]);

  function applyQuickRange(range: QuickTimeRange) {
    onChange(buildRecentMinutesTimeRange(range.minutes));
    setOpen(false);
  }

  function applyAbsoluteRange() {
    const start = new Date(absoluteStart);
    const end = new Date(absoluteEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() >= end.getTime()) {
      return;
    }
    onChange([start, end]);
    setOpen(false);
  }

  return (
    <div className="cv-query-time-range">
      <button
        type="button"
        className={`cv-query-time-range__trigger${open ? " cv-query-time-range__trigger--open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`时间范围 ${label}`}
      >
        <span className="cv-query-time-range__icon" aria-hidden="true">◷</span>
        <span>{label}</span>
        <span className="cv-query-time-range__chevron" aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="cv-query-time-popover" role="dialog" aria-label="选择时间范围">
          <section className="cv-query-time-popover__absolute">
            <h2>Absolute time range</h2>
            <label className="cv-query-time-field">
              <span>From</span>
              <input
                type="datetime-local"
                value={absoluteStart}
                onChange={(event) => setAbsoluteStart(event.target.value)}
                aria-label="From"
              />
            </label>
            <label className="cv-query-time-field">
              <span>To</span>
              <input
                type="datetime-local"
                value={absoluteEnd}
                onChange={(event) => setAbsoluteEnd(event.target.value)}
                aria-label="To"
              />
            </label>
            <button type="button" className="cv-query-time-popover__apply" onClick={applyAbsoluteRange}>
              Apply time range
            </button>
            <div className="cv-query-time-popover__recent">
              <strong>Recently used absolute ranges</strong>
              <span>{value ? `${formatClientDateTime(value[0])} to ${formatClientDateTime(value[1])}` : "No range selected"}</span>
            </div>
            <div className="cv-query-time-popover__footer">
              <span>Browser Time</span>
              <strong>China, CST</strong>
            </div>
          </section>
          <section className="cv-query-time-popover__quick">
            <label className="cv-query-time-search">
              <span aria-hidden="true">⌕</span>
              <input
                value={quickSearch}
                onChange={(event) => setQuickSearch(event.target.value)}
                placeholder="Search quick ranges"
                aria-label="Search quick ranges"
              />
            </label>
            <div className="cv-query-time-popover__quick-list">
              {visibleRanges.map((range) => {
                const isActive = activeDurationMinutes === range.minutes;
                return (
                  <button
                    key={range.label}
                    type="button"
                    className={`cv-query-time-popover__quick-item${isActive ? " cv-query-time-popover__quick-item--active" : ""}`}
                    onClick={() => applyQuickRange(range)}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function truncate(value: unknown, maxLength = 96) {
  const text = String(value ?? "");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
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
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function parseJsonArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  if (!text.startsWith("[")) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
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

function formatTraceDuration(valueMs: number) {
  if (!Number.isFinite(valueMs) || valueMs <= 0) {
    return "0 ms";
  }
  if (valueMs < 1) {
    return `${(valueMs * 1000).toFixed(1)} us`;
  }
  if (valueMs < 1000) {
    return `${valueMs.toFixed(valueMs < 10 ? 2 : 1)} ms`;
  }
  return `${(valueMs / 1000).toFixed(2)} s`;
}

function formatTraceTagValue(tag: TraceTag) {
  if (isPresentLogValue(tag.vStr)) {
    return stripAnsi(String(tag.vStr));
  }
  if (isPresentLogValue(tag.vInt64)) {
    return String(tag.vInt64);
  }
  if (isPresentLogValue(tag.vFloat64)) {
    return String(tag.vFloat64);
  }
  if (typeof tag.vBool === "boolean") {
    return String(tag.vBool);
  }
  return "—";
}

function extractTraceSpan(row: Record<string, unknown>): TraceSpanRaw | null {
  const rawSpan =
    parseJsonObject(row.rawLogJson) ??
    parseJsonObject(row["_raw_log_"]) ??
    parseJsonObject(row["_raw_log"]) ??
    parseJsonObject(row.raw);
  const span = (rawSpan ?? row) as Record<string, unknown>;
  if (!isPresentLogValue(span.traceId) || !isPresentLogValue(span.spanId)) {
    return null;
  }
  return span as TraceSpanRaw;
}

function createTraceNode(row: Record<string, unknown>, raw: TraceSpanRaw): TraceSpanNode {
  const startMs = raw.startTime ? toDateFromLogValue(raw.startTime)?.getTime() ?? 0 : 0;
  return {
    key: raw.spanId,
    raw,
    row,
    children: [],
    startMs,
    durationMs: parseDurationToMs(raw.duration),
    depth: 1
  };
}

function collectTraceNodes(node: TraceSpanNode, result: TraceSpanNode[] = []) {
  result.push(node);
  node.children.forEach((child) => collectTraceNodes(child, result));
  return result;
}

function assignTraceDepth(node: TraceSpanNode, depth: number) {
  node.depth = depth;
  node.children.forEach((child) => assignTraceDepth(child, depth + 1));
}

function buildTraceGroups(rows: Array<Record<string, unknown>>, isTrace?: number): TraceGroup[] {
  const spans = rows
    .map((row) => {
      const raw = extractTraceSpan(row);
      return raw ? createTraceNode(row, raw) : null;
    })
    .filter(Boolean) as TraceSpanNode[];
  if (spans.length === 0 || (isTrace !== 1 && spans.length < 2)) {
    return [];
  }

  const grouped = new Map<string, TraceSpanNode[]>();
  spans.forEach((span) => {
    const groupKey = String(span.row._key ?? span.raw.traceId);
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), span]);
  });

  return Array.from(grouped.entries()).flatMap(([groupKey, groupSpans]) => {
    const bySpanId = new Map(groupSpans.map((span) => [span.raw.spanId, span]));
    const serviceNames = new Set<string>();
    const roots: TraceSpanNode[] = [];
    const missingParentIds = new Set<string>();

    groupSpans.forEach((span) => {
      if (span.raw.process?.serviceName) {
        serviceNames.add(span.raw.process.serviceName);
      }
      const parentSpanId = span.raw.references?.[0]?.spanId;
      const parent = parentSpanId ? bySpanId.get(parentSpanId) : null;
      if (parent) {
        parent.children.push(span);
      } else {
        roots.push(span);
        if (parentSpanId) {
          missingParentIds.add(parentSpanId);
        }
      }
    });

    const sortedRoots = roots.sort((left, right) => left.startMs - right.startMs);
    const root =
      sortedRoots.length === 1 && missingParentIds.size === 0
        ? sortedRoots[0]
        : {
            key: `virtual-${groupKey}`,
            raw: {
              traceId: groupSpans[0]?.raw.traceId ?? groupKey,
              spanId: `virtual-${groupKey}`,
              operationName: missingParentIds.size > 0 ? "Virtual Root Span" : "Trace Root",
              startTime: groupSpans[0]?.raw.startTime,
              process: { serviceName: "trace" },
              tags: []
            },
            row: groupSpans[0]?.row ?? {},
            children: sortedRoots,
            startMs: Math.min(...groupSpans.map((span) => span.startMs || Number.POSITIVE_INFINITY)),
            durationMs: 0,
            depth: 1,
            virtual: true
          };

    assignTraceDepth(root, 1);
    const allNodes = collectTraceNodes(root).filter((node) => !node.virtual);
    const startMs = Math.min(...allNodes.map((node) => node.startMs || Number.POSITIVE_INFINITY));
    const endMs = Math.max(...allNodes.map((node) => (node.startMs || 0) + node.durationMs));
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return [];
    }
    return [
      {
        key: groupKey,
        traceId: groupSpans[0]?.raw.traceId ?? groupKey,
        root,
        startMs,
        endMs,
        durationMs: Math.max(endMs - startMs, 0),
        serviceCount: serviceNames.size,
        spanCount: allNodes.length
      }
    ];
  });
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

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function toDateFromLogValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
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
    const normalizedText =
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(text) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)
        ? text.replace(" ", "T")
        : text;
    const date = new Date(normalizedText);
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

function formatTimeAxisLabel(value: unknown) {
  const date = toDateFromLogValue(value);
  if (!date) {
    return String(value ?? "-");
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
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

function normalizeLogRow(row: Record<string, unknown>): NormalizedLogRow {
  const parsed = parseNestedJsonFields(row);
  const merged = { ...row, ...parsed };
  const timeValue = firstPresentValue(merged, ["_time", "_time_", "_time_second_", "time", "timestamp", "ts"]);
  const levelValue = firstPresentValue(merged, ["level", "severity", "lv", "log_level"]);
  const messageValue = firstPresentValue(merged, ["message", "msg", "content", "body", "_raw_log_"]);
  return {
    original: row,
    parsed: merged,
    timeText: formatClientDateTime(timeValue),
    levelText: levelValue === undefined ? "-" : String(levelValue),
    messageText: messageValue === undefined ? JSON.stringify(row) : String(messageValue)
  };
}

function formatConditionSummaryValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function formatLogDetailValue(value: unknown) {
  if (!isPresentLogValue(value)) {
    return "—";
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

function sanitizeLogJsonValue(value: unknown): unknown {
  if (!isPresentLogValue(value)) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const items = value
      .map((item) => sanitizeLogJsonValue(item))
      .filter((item) => item !== undefined);
    return items;
  }
  if (value && typeof value === "object") {
    return sanitizeLogJsonObject(value as Record<string, unknown>);
  }
  if (typeof value === "string") {
    const parsedJson = parseJsonObject(value);
    if (parsedJson) {
      return sanitizeLogJsonObject(parsedJson);
    }
    const parsedJsonArray = parseJsonArray(value);
    if (parsedJsonArray) {
      return parsedJsonArray
        .map((item) => sanitizeLogJsonValue(item))
        .filter((item) => item !== undefined);
    }
    return stripAnsi(value);
  }
  return value;
}

function sanitizeLogJsonObject(row: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    const sanitizedValue = sanitizeLogJsonValue(value);
    if (sanitizedValue !== undefined) {
      result[key] = sanitizedValue;
    }
  });
  return result;
}

function formatLogJsonPreview(row: NormalizedLogRow) {
  return JSON.stringify(sanitizeLogJsonObject(row.parsed), null, 2);
}

function canCreateConditionFromDetailValue(field: string, value: unknown) {
  if (/^_?raw/i.test(field)) {
    return false;
  }
  if (!isPresentLogValue(value)) {
    return false;
  }
  if (value && typeof value === "object") {
    return false;
  }
  return String(value).trim().length > 0 && String(value).trim().length <= 256;
}

function canOpenFieldStats(field: string, value: unknown) {
  return Boolean(field) && !/^_?raw/i.test(field) && !(value && typeof value === "object");
}

function canStartAIAnalysisFromField(field: string, value: unknown) {
  return canCreateConditionFromDetailValue(field, value);
}

function createDetailConditionValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      value,
      valueType: "number" as const
    };
  }
  const text = typeof value === "string" ? stripAnsi(value).trim() : String(value).trim();
  return {
    value: text,
    valueType: /^-?\d+(\.\d+)?$/.test(text) ? "number" as const : "string" as const
  };
}

function createTypedDetailConditionValue(value: unknown, valueType: QueryFilterValueType) {
  const sample = createDetailConditionValue(value);
  if (valueType === "number") {
    const numeric = typeof sample.value === "number" ? sample.value : Number(sample.value);
    return Number.isFinite(numeric) ? { value: numeric, valueType } : null;
  }
  if (valueType === "datetime") {
    return { value: String(sample.value), valueType };
  }
  return { value: String(sample.value), valueType };
}

function isRawLogDetailParent(parentKey: string) {
  const normalized = parentKey.trim().toLowerCase();
  return normalized === "_raw_log_" || normalized === "_raw_log" || normalized === "raw_log";
}

function scalarJsonEntries(parentKey: string, value: unknown) {
  const parsed = parseJsonObject(value);
  if (parsed) {
    return Object.entries(parsed)
      .filter(([, item]) => isPresentLogValue(item) && !(item && typeof item === "object"))
      .map(([key, item]) => {
        const fieldKey = isRawLogDetailParent(parentKey) ? key : `${parentKey}.${key}`;
        return {
          key,
          value: formatLogDetailValue(item),
          fieldRef: {
            fieldKey,
            displayName: key,
            source: "json_path",
            path: fieldKey,
            valueType: createDetailConditionValue(item).valueType,
            isAccelerated: false
          }
        } as LogDetailNestedEntry;
      })
      .filter((item) => item.value.trim().length > 0 && item.value.trim().length <= 256);
  }
  const parsedArray = parseJsonArray(value);
  if (!parsedArray) {
    return [] as LogDetailNestedEntry[];
  }
  return parsedArray
    .map((item, index) => {
      const text = formatLogDetailValue(item).trim();
      const separatorIndex = text.indexOf("=");
      if (separatorIndex > 0) {
        const key = text.slice(0, separatorIndex).trim();
        const itemValue = text.slice(separatorIndex + 1).trim();
        if (key && itemValue) {
          return {
            key,
            value: itemValue,
            fieldRef: {
              fieldKey: `${parentKey}.${key}`,
              displayName: key,
              source: "tag_path",
              path: `${parentKey}.${key}`,
              valueType: "string",
              isAccelerated: false
            }
          } as LogDetailNestedEntry;
        }
      }
      return { key: `#${index + 1}`, value: text } as LogDetailNestedEntry;
    })
    .filter((item) => item.value.trim().length > 0 && item.value.trim().length <= 256);
}

function isLogTimeField(field: string) {
  return /^_time(_[a-z]+)?_$/.test(field) || field === "time" || field === "timestamp" || field === "ts";
}

function formatDateTimeForQuery(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function createDetailTimeRangeConditions(field: string, value: unknown): QueryFilterCondition[] {
  const date = toDateFromLogValue(value);
  if (!date) {
    return [];
  }
  const start = new Date(date);
  start.setMilliseconds(0);
  const end = new Date(start.getTime() + 1000);
  const idPrefix = `cond_detail_time_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return [
    {
      id: `${idPrefix}_gte`,
      field,
      operator: ">=",
      value: formatDateTimeForQuery(start),
      valueType: "datetime"
    },
    {
      id: `${idPrefix}_lt`,
      field,
      operator: "<",
      value: formatDateTimeForQuery(end),
      valueType: "datetime"
    }
  ];
}

function getLogRowTimeMs(row: NormalizedLogRow) {
  const value = firstPresentValue(row.parsed, [
    "_time",
    "_time_",
    "_time_nanosecond_",
    "_time_second_",
    "time",
    "timestamp",
    "ts"
  ]);
  return toDateFromLogValue(value)?.getTime() ?? null;
}


function readJsonUserKey(raw: string | null) {
  if (!raw) {
    return "";
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return String(parsed.uid ?? parsed.id ?? parsed.username ?? parsed.name ?? "").trim();
  } catch {
    return raw.trim();
  }
}

function getCurrentBrowserUserKey() {
  if (typeof window === "undefined") {
    return "anonymous";
  }
  const localStorageKeys = ["clickvisual-current-user", "cv-current-user", "currentUser", "user"];
  for (const key of localStorageKeys) {
    const value = readJsonUserKey(window.localStorage.getItem(key));
    if (value) {
      return value;
    }
  }
  const cookieUser = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => /^(uid|user_id|username)=/.test(item));
  if (cookieUser) {
    return decodeURIComponent(cookieUser.split("=").slice(1).join("=")) || "anonymous";
  }
  return "anonymous";
}

function readResultColumnKeys(storageKey: string) {
  if (typeof window === "undefined") {
    return [...DEFAULT_RESULT_COLUMN_KEYS];
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(parsed)) {
      const keys = parsed.map((item) => String(item)).filter(Boolean);
      return keys.length > 0 ? keys : [...DEFAULT_RESULT_COLUMN_KEYS];
    }
  } catch {
    return [...DEFAULT_RESULT_COLUMN_KEYS];
  }
  return [...DEFAULT_RESULT_COLUMN_KEYS];
}

function writeResultColumnKeys(storageKey: string, columnKeys: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(columnKeys));
}

function createConditionDraft(): QueryFilterCondition {
  return {
    id: `cond_modal_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    field: "",
    operator: "=",
    value: "",
    valueType: "string"
  };
}

const queryOperatorOptions = [
  { label: "=", value: "=" },
  { label: "!=", value: "!=" },
  { label: ">", value: ">" },
  { label: ">=", value: ">=" },
  { label: "<", value: "<" },
  { label: "<=", value: "<=" },
  { label: "like", value: "like" },
  { label: "not like", value: "not like" }
] as const;

const queryValueTypeOptions = [
  { label: "字符串", value: "string" },
  { label: "数字", value: "number" },
  { label: "时间", value: "datetime" }
] as const;

function TraceSpanRow({
  node,
  groupStartMs,
  groupDurationMs
}: {
  node: TraceSpanNode;
  groupStartMs: number;
  groupDurationMs: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const safeDuration = Math.max(groupDurationMs, 1);
  const offsetPercent = Math.max(0, Math.min(100, ((node.startMs - groupStartMs) / safeDuration) * 100));
  const widthPercent = Math.max(0.6, Math.min(100 - offsetPercent, (node.durationMs / safeDuration) * 100));
  const serviceName = node.raw.process?.serviceName || (node.virtual ? "trace" : "unknown");
  const operationName = node.raw.operationName || node.raw.spanId;
  const tags = node.raw.tags ?? [];
  const processTags = node.raw.process?.tags ?? [];
  const logs = node.raw.logs ?? [];

  return (
    <div className="cv-query-trace-span">
      <button
        type="button"
        className={node.virtual ? "cv-query-trace-span__row cv-query-trace-span__row--virtual" : "cv-query-trace-span__row"}
        style={{ paddingLeft: `${Math.min(node.depth - 1, 8) * 18 + 8}px` }}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="cv-query-trace-span__name">
          <strong>{serviceName}</strong>
          <em>{operationName}</em>
        </span>
        <span className="cv-query-trace-span__timeline">
          <span
            className="cv-query-trace-span__bar"
            style={{
              marginLeft: `${offsetPercent}%`,
              width: `${widthPercent}%`
            }}
          />
          {logs.map((item, index) => {
            const logTime = item.timestamp ? toDateFromLogValue(item.timestamp)?.getTime() : null;
            const left = logTime ? Math.max(0, Math.min(100, ((logTime - groupStartMs) / safeDuration) * 100)) : -1;
            return left >= 0 ? (
              <span
                key={`${item.timestamp}-${index}`}
                className="cv-query-trace-span__event"
                style={{ left: `${left}%` }}
                title={item.timestamp}
              />
            ) : null;
          })}
        </span>
        <span className="cv-query-trace-span__duration">{formatTraceDuration(node.durationMs)}</span>
      </button>
      {expanded ? (
        <div className="cv-query-trace-span__detail">
          <div>
            <strong>SpanID</strong>
            <span>{node.raw.spanId}</span>
          </div>
          <div>
            <strong>开始</strong>
            <span>{node.raw.startTime ? formatClientDateTime(node.raw.startTime) : "—"}</span>
          </div>
          {tags.length > 0 ? (
            <div className="cv-query-trace-span__kv">
              <strong>Tags</strong>
              <span>
                {tags.map((tag) => (
                  <em key={tag.key}>
                    {tag.key}={formatTraceTagValue(tag)}
                  </em>
                ))}
              </span>
            </div>
          ) : null}
          {processTags.length > 0 ? (
            <div className="cv-query-trace-span__kv">
              <strong>Process</strong>
              <span>
                {processTags.map((tag) => (
                  <em key={tag.key}>
                    {tag.key}={formatTraceTagValue(tag)}
                  </em>
                ))}
              </span>
            </div>
          ) : null}
          {logs.length > 0 ? (
            <div className="cv-query-trace-span__logs">
              <strong>Logs</strong>
              <span>
                {logs.map((item, index) => (
                  <em key={`${item.timestamp}-${index}`}>
                    {item.timestamp ? formatTraceDuration((toDateFromLogValue(item.timestamp)?.getTime() ?? groupStartMs) - groupStartMs) : "event"}
                    {item.fields?.length ? ` ${item.fields.map((field) => `${field.key}=${formatTraceTagValue(field)}`).join(" ")}` : ""}
                  </em>
                ))}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
      {node.children.map((child) => (
        <TraceSpanRow
          key={child.key}
          node={child}
          groupStartMs={groupStartMs}
          groupDurationMs={groupDurationMs}
        />
      ))}
    </div>
  );
}

function TraceTimeline({ groups }: { groups: TraceGroup[] }) {
  if (groups.length === 0) {
    return null;
  }
  return (
    <section className="cv-query-trace-panel" aria-label="Trace 链路">
      <div className="cv-query-trace-panel__header">
        <div>
          <strong>Trace 链路</strong>
          <span>按 `_key` / traceId 分组，使用 Jaeger JSON 渲染 span 树</span>
        </div>
        <span>{groups.length} 条链路</span>
      </div>
      <div className="cv-query-trace-groups">
        {groups.map((group) => (
          <article key={group.key} className="cv-query-trace-group">
            <header className="cv-query-trace-group__header">
              <div>
                <strong>{group.traceId}</strong>
                <span>
                  Trace Start: {formatClientDateTime(group.startMs)} · Duration: {formatTraceDuration(group.durationMs)}
                </span>
              </div>
              <div>
                <span>{group.serviceCount} services</span>
                <span>{group.spanCount} spans</span>
              </div>
            </header>
            <div className="cv-query-trace-axis" aria-hidden="true">
              <span>Service & Operation</span>
              <span>0</span>
              <span>50%</span>
              <span>{formatTraceDuration(group.durationMs)}</span>
            </div>
            <TraceSpanRow
              node={group.root}
              groupStartMs={group.startMs}
              groupDurationMs={group.durationMs}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

export default function QueryPage() {
  const initialSearchParams = useMemo(
    () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
    []
  );
  const initialTreeTarget = useMemo<QuerySourceTreeTarget | undefined>(() => {
    const instanceId = Number(initialSearchParams.get("instanceId") || "");
    const databaseName = initialSearchParams.get("database") || "";
    const tableName = initialSearchParams.get("table") || "";
    const tableId = Number(initialSearchParams.get("tableId") || initialSearchParams.get("tid") || "");
    if (Number.isInteger(tableId) && tableId > 0) {
      return {
        instanceId: Number.isFinite(instanceId) && instanceId > 0 ? instanceId : undefined,
        databaseName: databaseName || undefined,
        tableName: tableName || undefined,
        tableId
      };
    }
    if (!Number.isFinite(instanceId) || instanceId <= 0 || !databaseName || !tableName) {
      return undefined;
    }
    return {
      instanceId,
      databaseName,
      tableName
    };
  }, [initialSearchParams]);
  const defaultRange = useMemo(() => buildInitialTimeRangeFromSearchParams(initialSearchParams), [initialSearchParams]);
  const initialPage = useMemo(() => readPositiveIntSearchParam(initialSearchParams, "page"), [initialSearchParams]);
  const initialPageSize = useMemo(() => readPositiveIntSearchParam(initialSearchParams, "size"), [initialSearchParams]);
  const [timeRange, setTimeRange] = useState<QueryDateRange>(defaultRange);
  const startTime = timeRange ? formatDateTimeLocalValue(timeRange[0]) : "";
  const endTime = timeRange ? formatDateTimeLocalValue(timeRange[1]) : "";
  const workspace = useQueryWorkspace(startTime, endTime, initialTreeTarget, {
    initialPage,
    initialPageSize
  });
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [resultColumnSelectorOpen, setResultColumnSelectorOpen] = useState(false);
  const [resultColumnKeys, setResultColumnKeys] = useState<string[]>([...DEFAULT_RESULT_COLUMN_KEYS]);
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);
  const [expandedLogDisplayMode, setExpandedLogDisplayMode] = useState<"fields" | "json">("fields");
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [conditionModalMode, setConditionModalMode] = useState<QueryConditionModalMode>("create");
  const [conditionDraft, setConditionDraft] = useState<QueryFilterCondition | null>(null);
  const [saveQueryModalOpen, setSaveQueryModalOpen] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState("");
  const [savedQueryMenuOpen, setSavedQueryMenuOpen] = useState(false);
  const [queryHistoryMenuOpen, setQueryHistoryMenuOpen] = useState(false);
  const [linkQueryAnchor, setLinkQueryAnchor] = useState<LinkQueryAnchor | null>(null);
  const [linkQueryWindowMinutes, setLinkQueryWindowMinutes] = useState(5);
  const [linkQuerySelectedTableIds, setLinkQuerySelectedTableIds] = useState<number[]>([]);
  const [tableAutoQueryRequest, setTableAutoQueryRequest] = useState<TableAutoQueryRequest | null>(null);
  const [openLogTabs, setOpenLogTabs] = useState<OpenLogTab[]>([]);
  const [conditionsByLogTab, setConditionsByLogTab] = useState<Record<number, QueryFilterCondition[]>>({});
  const [fieldStatsState, setFieldStatsState] = useState<{
    field: string;
    fieldRef: QueryFieldRef;
    loading: boolean;
    data: QueryFieldStatsResponse | null;
    error: string;
  } | null>(null);
  const [fieldStatsConfirmState, setFieldStatsConfirmState] = useState<{
    fieldRef: QueryFieldRef;
    value: string;
    actionText: string;
  } | null>(null);
  const [createDatabaseInstance, setCreateDatabaseInstance] = useState<QuerySourceInstance | null>(null);
  const [accessLogLibraryState, setAccessLogLibraryState] = useState<{
    instance: QuerySourceInstance | null;
    databaseName?: string;
  }>({
    instance: null
  });
  const [editDatabaseState, setEditDatabaseState] = useState<{
    instance: QuerySourceInstance | null;
    database: QuerySourceDatabase | null;
  }>({
    instance: null,
    database: null
  });
  const [treeContextMenu, setTreeContextMenu] = useState<{
    ariaLabel: string;
    items: Array<{ key: string; label: string; onSelect: () => void }>;
    x: number;
    y: number;
  }>({
    ariaLabel: "节点操作",
    items: [],
    x: 0,
    y: 0
  });
  const [confirmState, setConfirmState] = useState<
    | {
        title: string;
        content: string;
        confirmLabel: string;
        onConfirm: () => Promise<void>;
      }
    | null
  >(null);
  const initialQueryStartedRef = useRef(false);
  const conditionRestoreTargetRef = useRef<number | null>(null);

  const chartMax = useMemo(
    () => workspace.charts.reduce((max, item) => Math.max(max, item.count), 0) || 1,
    [workspace.charts]
  );
  const chartAxisMax = useMemo(() => roundUpChartAxisMax(chartMax), [chartMax]);

  const normalizedLogRows = useMemo(
    () => (workspace.logs?.logs ?? []).map((row) => normalizeLogRow(row)),
    [workspace.logs]
  );
  const traceGroups = useMemo(
    () => buildTraceGroups(workspace.logs?.logs ?? [], workspace.logs?.isTrace),
    [workspace.logs]
  );
  const linkQueryTableOptions = useMemo(() => {
    return workspace.databases.flatMap((database) => {
      const tables = workspace.tablesByDatabase[database.name] ?? database.tables ?? [];
      return tables.map((table) => ({
        id: table.id,
        databaseName: database.name,
        tableName: table.name
      }));
    });
  }, [workspace.databases, workspace.tablesByDatabase]);
  const validOpenLogTabs = useMemo(() => {
    const tableIds = new Set(linkQueryTableOptions.map((item) => item.id));
    return openLogTabs.filter((item) => tableIds.has(item.id));
  }, [linkQueryTableOptions, openLogTabs]);

  useEffect(() => {
    setExpandedLogIndex(null);
    setExpandedLogDisplayMode("fields");
  }, [workspace.logs]);

  useEffect(() => {
    writeTimeRangeToURL(timeRange);
  }, [timeRange]);

  useEffect(() => {
    if (initialQueryStartedRef.current || tableAutoQueryRequest || !workspace.selectedTableId) {
      return;
    }
    initialQueryStartedRef.current = true;
    const hasURLRange = Boolean(
      (initialSearchParams.get("start") && initialSearchParams.get("end")) ||
        (initialSearchParams.get("st") && initialSearchParams.get("et"))
    );
    const range = hasURLRange && timeRange ? timeRange : buildRecentMinutesTimeRange(15);
    setTimeRange(range);
    void workspace.runQuery(initialPage ?? 1, toSecondRange(range));
  }, [initialPage, initialSearchParams, tableAutoQueryRequest, timeRange, workspace.selectedTableId]);

  useEffect(() => {
    setLinkQueryAnchor(null);
  }, [workspace.selectedInstanceId]);

  useEffect(() => {
    setOpenLogTabs([]);
    setConditionsByLogTab({});
  }, [workspace.selectedInstanceId]);

  useEffect(() => {
    if (!workspace.selectedTableId) {
      return;
    }
    if (
      conditionRestoreTargetRef.current !== null &&
      conditionRestoreTargetRef.current !== workspace.selectedTableId
    ) {
      return;
    }
    setConditionsByLogTab((current) => ({
      ...current,
      [workspace.selectedTableId as number]: workspace.conditions
    }));
    if (conditionRestoreTargetRef.current === workspace.selectedTableId) {
      conditionRestoreTargetRef.current = null;
    }
  }, [workspace.conditions, workspace.selectedTableId]);

  useEffect(() => {
    if (!workspace.selectedTableId || !workspace.selectedDatabase || !workspace.selectedTable) {
      return;
    }
    const nextTab: OpenLogTab = {
      id: workspace.selectedTableId,
      databaseName: workspace.selectedDatabase,
      tableName: workspace.selectedTable
    };
    setOpenLogTabs((current) =>
      current.some((item) => item.id === nextTab.id) ? current : [...current, nextTab]
    );
  }, [workspace.selectedDatabase, workspace.selectedTable, workspace.selectedTableId]);

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }
    const timer = window.setTimeout(() => {
      setFeedbackMessage("");
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  useEffect(() => {
    if (!tableAutoQueryRequest) {
      return;
    }
    const selectedMatches =
      workspace.selectedInstanceId === tableAutoQueryRequest.instanceId &&
      workspace.selectedDatabase === tableAutoQueryRequest.databaseName &&
      workspace.selectedTable === tableAutoQueryRequest.tableName &&
      workspace.selectedTableId === tableAutoQueryRequest.tableId;
    if (!selectedMatches) {
      return;
    }
    const request = tableAutoQueryRequest;
    setTableAutoQueryRequest(null);
    void workspace.runQuery(1, request.range, request.conditions);
  }, [
    tableAutoQueryRequest,
    workspace.selectedDatabase,
    workspace.selectedInstanceId,
    workspace.selectedTable,
    workspace.selectedTableId
  ]);

  const resultColumnStorageKey = useMemo(() => {
    const userKey = getCurrentBrowserUserKey();
    const scope = [
      workspace.selectedInstanceId ?? "no-instance",
      workspace.selectedDatabase || "no-database",
      workspace.selectedTable || "no-table"
    ].join(":");
    return `${RESULT_COLUMN_STORAGE_PREFIX}:${userKey}:${scope}`;
  }, [workspace.selectedDatabase, workspace.selectedInstanceId, workspace.selectedTable]);

  useEffect(() => {
    setResultColumnKeys(readResultColumnKeys(resultColumnStorageKey));
  }, [resultColumnStorageKey]);

  const resultColumnOptions = useMemo(() => {
    const fields = new Set<string>();
    normalizedLogRows.forEach((row) => {
      Object.keys(row.parsed).forEach((key) => fields.add(key));
    });
    const builtinColumns: QueryResultColumn[] = [
      { key: "__time", label: "时间", kind: "builtin" },
      { key: "__level", label: "级别", kind: "builtin" },
      { key: "__message", label: "内容", kind: "builtin" }
    ];
    const fieldColumns = Array.from(fields)
      .sort((left, right) => left.localeCompare(right))
      .map((field) => ({ key: field, label: field, kind: "field" as const }));
    return [...builtinColumns, ...fieldColumns];
  }, [normalizedLogRows]);

  const visibleResultColumns = useMemo(() => {
    const optionMap = new Map(resultColumnOptions.map((item) => [item.key, item]));
    const columns = resultColumnKeys.map((key) => optionMap.get(key)).filter(Boolean) as QueryResultColumn[];
    return columns.length > 0 ? columns : resultColumnOptions.slice(0, 3);
  }, [resultColumnKeys, resultColumnOptions]);

  function parseProfileTime(value: string) {
    const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function openSaveQueryModal() {
    setSaveQueryName(queryPreview && queryPreview !== "无条件" ? truncate(queryPreview, 32) : "");
    setSaveQueryModalOpen(true);
  }

  async function handleSaveQuery() {
    try {
      await workspace.saveCurrentQuery(saveQueryName, {
        startTime,
        endTime
      });
      setFeedbackMessage("已保存到收藏查询");
      setSaveQueryModalOpen(false);
      setSavedQueryMenuOpen(true);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "保存查询失败");
    }
  }

  function applySavedFilterProfile(profile: (typeof workspace.savedFilterProfiles)[number]) {
    const start = parseProfileTime(profile.timeRange.startTime);
    const end = parseProfileTime(profile.timeRange.endTime);
    const nextRange = start && end ? ([start, end] as [Date, Date]) : timeRange;
    if (nextRange) {
      setTimeRange(nextRange);
    }
    workspace.applyFilterProfile(profile);
    setSavedQueryMenuOpen(false);
    void workspace.runQuery(1, nextRange ? toSecondRange(nextRange) : undefined, profile.conditions);
  }

  async function deleteSavedFilterProfile(id: number, name: string) {
    try {
      await workspace.deleteSavedFilterProfile(id);
      setFeedbackMessage(`已删除收藏 ${name}`);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "删除收藏失败");
    }
  }

  async function handleShareQuery() {
    if (shareLoading) {
      return;
    }
    try {
      setShareLoading(true);
      const shareUrl = new URL(window.location.href);
      shareUrl.pathname = shareUrl.pathname.endsWith("/query") ? shareUrl.pathname : "/v2/query";
      shareUrl.hash = "";
      if (queryPreview && queryPreview !== "无条件" && !queryPreview.includes("不合法")) {
        shareUrl.searchParams.set("query", queryPreview);
      } else {
        shareUrl.searchParams.delete("query");
      }
      if (startTime) {
        shareUrl.searchParams.set("startTime", startTime);
      }
      if (endTime) {
        shareUrl.searchParams.set("endTime", endTime);
      }
      if (workspace.selectedInstanceId) {
        shareUrl.searchParams.set("instanceId", String(workspace.selectedInstanceId));
      }
      if (workspace.selectedDatabase) {
        shareUrl.searchParams.set("database", workspace.selectedDatabase);
      }
      if (workspace.selectedTable) {
        shareUrl.searchParams.set("table", workspace.selectedTable);
      }
      const shortUrl = await createQueryShareShortUrl({ originUrl: shareUrl.toString() });
      const copied = await copyTextToClipboard(shortUrl);
      setFeedbackMessage(copied ? "分享短链已复制" : `分享短链已生成：${shortUrl}`);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "分享失败，请稍后重试");
    } finally {
      setShareLoading(false);
    }
  }

  function updateResultColumnKeys(nextKeys: string[]) {
    const uniqueKeys = Array.from(new Set(nextKeys));
    const normalizedKeys = uniqueKeys.length > 0 ? uniqueKeys : [...DEFAULT_RESULT_COLUMN_KEYS];
    setResultColumnKeys(normalizedKeys);
    writeResultColumnKeys(resultColumnStorageKey, normalizedKeys);
  }

  function toggleResultColumn(columnKey: string) {
    const nextKeys = resultColumnKeys.includes(columnKey)
      ? resultColumnKeys.filter((key) => key !== columnKey)
      : [...resultColumnKeys, columnKey];
    updateResultColumnKeys(nextKeys);
  }

  function resetResultColumns() {
    updateResultColumnKeys([...DEFAULT_RESULT_COLUMN_KEYS]);
  }

  function closeFieldStatsModal() {
    setFieldStatsState(null);
  }

  function buildRawLogFieldStatsRef(field: string, sampleValue: unknown) {
    const sample = createDetailConditionValue(sampleValue);
    const path = field.replace(/^_?raw_log_?\./i, "");
    return {
      fieldKey: path,
      displayName: path,
      source: "json_path" as const,
      path,
      valueType: sample.valueType === "number" ? "number" as const : "string" as const,
      isAccelerated: false
    };
  }

  function buildDetailFieldRef(field: string, value: unknown) {
    const sample = createDetailConditionValue(value);
    return buildQueryFieldRef(
      {
        id: "detail_field",
        field,
        operator: "=",
        value: sample.value,
        valueType: sample.valueType
      },
      workspace.analysisFields
    );
  }

  async function openFieldStatsModal(
    field: string,
    sampleValue: unknown,
    preferRawLog = false,
    explicitFieldRef?: QueryFieldRef
  ) {
    if (!workspace.selectedTableId || !timeRange) {
      setFeedbackMessage("请先选择日志表和时间范围");
      return;
    }
    if (!field || /^_?raw/i.test(field)) {
      setFeedbackMessage("原始日志字段不适合做值分布统计");
      return;
    }
    const sample = createDetailConditionValue(sampleValue);
    const catalogFieldRef =
      explicitFieldRef ??
      buildQueryFieldRef(
        {
          id: "field_stats",
          field,
          operator: "=",
          value: sample.value,
          valueType: sample.valueType
        },
        workspace.analysisFields
      );
    const fieldRef =
      explicitFieldRef ??
      (preferRawLog && !(catalogFieldRef.source === "column" && catalogFieldRef.isAccelerated)
        ? buildRawLogFieldStatsRef(field, sampleValue)
        : catalogFieldRef);
    const range = toSecondRange(timeRange);
    setFieldStatsState({ field, fieldRef, loading: true, data: null, error: "" });
    try {
      const data = await getQueryFieldStats({
        tid: workspace.selectedTableId,
        st: range.st,
        et: range.et,
        page: 1,
        pageSize: workspace.pageSize,
        conditions: buildStructuredConditions(workspace.conditions, workspace.analysisFields),
        sorts: [],
        displayFields: [],
        field: fieldRef,
        limit: 10
      });
      setFieldStatsState({ field, fieldRef, loading: false, data, error: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "字段统计失败";
      setFieldStatsState({ field, fieldRef, loading: false, data: null, error: message });
    }
  }

  function toggleExpandedLog(index: number) {
    setExpandedLogIndex((current) => {
      if (current === index) {
        setExpandedLogDisplayMode("fields");
        return null;
      }
      setExpandedLogDisplayMode("fields");
      return index;
    });
  }

  function formatResultColumnValue(row: NormalizedLogRow, column: QueryResultColumn) {
    let rawValue: unknown;
    if (column.key === "__time") {
      rawValue = row.timeText;
    } else if (column.key === "__level") {
      rawValue = row.levelText;
    } else if (column.key === "__message") {
      rawValue = row.messageText;
    } else {
      rawValue = row.parsed[column.key];
    }
    const empty = !isPresentLogValue(rawValue) || rawValue === "-";
    return {
      empty,
      text: empty ? "—" : formatLogDetailValue(rawValue)
    };
  }

  function addConditionFromLogDetail(field: string, value: unknown) {
    if (!canCreateConditionFromDetailValue(field, value)) {
      return;
    }
    const fieldRef = buildDetailFieldRef(field, value);
    if (fieldRef.valueType === "datetime" && isLogTimeField(fieldRef.fieldKey)) {
      const timeConditions = createDetailTimeRangeConditions(field, value);
      if (timeConditions.length > 0) {
        const existingRange = timeConditions.every((nextCondition) =>
          workspace.conditions.some(
            (condition) =>
              condition.field === nextCondition.field &&
              condition.operator === nextCondition.operator &&
              condition.valueType === nextCondition.valueType &&
              String(condition.value) === String(nextCondition.value)
          )
        );
        if (existingRange) {
          workspace.setActiveConditionId(
            workspace.conditions.find(
              (condition) =>
                condition.field === timeConditions[0].field &&
                condition.operator === timeConditions[0].operator &&
                String(condition.value) === String(timeConditions[0].value)
            )?.id ?? null
          );
          setFeedbackMessage(`已存在时间范围 ${field}`);
          return;
        }
        workspace.setConditions([...workspace.conditions, ...timeConditions]);
        workspace.setActiveConditionId(timeConditions[0].id);
        setFeedbackMessage(`已添加时间范围 ${field} ${timeConditions[0].value} - ${timeConditions[1].value}`);
        return;
      }
    }
    const conditionValue = createTypedDetailConditionValue(
      value,
      fieldRef.valueType === "number" || fieldRef.valueType === "datetime" ? fieldRef.valueType : "string"
    );
    if (!conditionValue) {
      setFeedbackMessage(`${field} 的值无法按数字条件加入查询`);
      return;
    }
    const existingCondition = workspace.conditions.find(
      (condition) =>
        condition.field === field &&
        condition.operator === "=" &&
        condition.valueType === conditionValue.valueType &&
        String(condition.value) === String(conditionValue.value)
    );
    if (existingCondition) {
      workspace.setActiveConditionId(existingCondition.id);
      setFeedbackMessage(`已存在条件 ${field} = ${conditionValue.value}`);
      return;
    }
    const nextCondition: QueryFilterCondition = {
      id: `cond_detail_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      field,
      operator: "=",
      value: conditionValue.value,
      valueType: conditionValue.valueType
    };
    workspace.setConditions([...workspace.conditions, nextCondition]);
    workspace.setActiveConditionId(nextCondition.id);
    setFeedbackMessage(`已添加条件 ${field} = ${conditionValue.value}`);
  }

  function addGlobalMatchFromLogDetailValue(value: string) {
    const text = stripAnsi(value).trim();
    if (!text || text.length > 256) {
      return;
    }
    const existingCondition = workspace.conditions.find(
      (condition) => condition.field === "全局匹配" && String(condition.value) === text
    );
    if (existingCondition) {
      workspace.setActiveConditionId(existingCondition.id);
      setFeedbackMessage(`已存在全局匹配 ${text}`);
      return;
    }
    const nextCondition: QueryFilterCondition = {
      id: `cond_detail_global_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      field: "全局匹配",
      operator: "like",
      value: text,
      valueType: "string"
    };
    workspace.setConditions([...workspace.conditions, nextCondition]);
    workspace.setActiveConditionId(nextCondition.id);
    setFeedbackMessage(`已添加全局匹配 ${text}`);
  }

  function addConditionFromFieldStatsValue(fieldRef: QueryFieldRef, value: string) {
    if (fieldRef.source === "tag_path") {
      addConditionFromLogDetail(fieldRef.fieldKey, value);
      return;
    }
    if (fieldRef.source !== "column" || !fieldRef.isAccelerated) {
      addGlobalMatchFromLogDetailValue(value);
      return;
    }
    addConditionFromLogDetail(fieldRef.fieldKey, value);
  }

  function requestAddConditionFromFieldStatsValue(fieldRef: QueryFieldRef, value: string) {
    setFieldStatsConfirmState({
      fieldRef,
      value,
      actionText:
        fieldRef.source === "tag_path" || (fieldRef.source === "column" && fieldRef.isAccelerated)
          ? `${fieldRef.fieldKey} = ${truncate(value, 120)}`
          : `全局匹配：${truncate(value, 120)}`
    });
  }

  function confirmAddConditionFromFieldStatsValue() {
    if (!fieldStatsConfirmState) {
      return;
    }
    addConditionFromFieldStatsValue(fieldStatsConfirmState.fieldRef, fieldStatsConfirmState.value);
    setFieldStatsConfirmState(null);
    closeFieldStatsModal();
  }

  function openLinkQueryModal(row: NormalizedLogRow, field: string, value: unknown) {
    const text = formatLogDetailValue(value).trim();
    const timeMs = getLogRowTimeMs(row);
    if (!text || text === "—") {
      setFeedbackMessage("链路查询需要一个有效的字段值");
      return;
    }
    if (!timeMs) {
      setFeedbackMessage("当前日志缺少可识别时间，无法创建链路查询窗口");
      return;
    }
    setLinkQueryAnchor({ field, value: text, timeMs });
    setLinkQueryWindowMinutes(5);
    setLinkQuerySelectedTableIds(workspace.selectedTableId ? [workspace.selectedTableId] : []);
  }

  function closeLinkQueryModal() {
    setLinkQueryAnchor(null);
  }

  function toggleLinkQueryTable(tableId: number) {
    setLinkQuerySelectedTableIds((current) =>
      current.includes(tableId) ? current.filter((item) => item !== tableId) : [...current, tableId]
    );
  }

  function openLinkQueryPage() {
    if (!linkQueryAnchor) {
      return;
    }
    const targets = linkQueryTableOptions.filter((item) => linkQuerySelectedTableIds.includes(item.id));
    if (targets.length === 0) {
      setFeedbackMessage("请至少选择一张日志表");
      return;
    }
    const params = new URLSearchParams();
    params.set("field", linkQueryAnchor.field);
    params.set("value", linkQueryAnchor.value);
    params.set("time", String(linkQueryAnchor.timeMs));
    params.set("window", String(linkQueryWindowMinutes));
    params.set(
      "tables",
      targets
        .map((item) => `${item.id}:${encodeURIComponent(item.databaseName)}.${encodeURIComponent(item.tableName)}`)
        .join(",")
    );
    window.open(buildV2RouteHref("query/link", params), "_blank");
    setLinkQueryAnchor(null);
  }

  function selectTableAndQueryRecentLogs(
    instance: QuerySourceInstance,
    database: QuerySourceDatabase,
    table: QuerySourceTable
  ) {
    const nextConditions =
      table.id === workspace.selectedTableId ? workspace.conditions : conditionsByLogTab[table.id] ?? [];
    conditionRestoreTargetRef.current = table.id;
    workspace.setConditions(nextConditions);
    workspace.setActiveConditionId(nextConditions[0]?.id ?? null);
    setOpenLogTabs((current) =>
      current.some((item) => item.id === table.id)
        ? current
        : [...current, { id: table.id, databaseName: database.name, tableName: table.name }]
    );
    const range = buildRecentMinutesTimeRange(15);
    setTimeRange(range);
    workspace.setSelectedInstanceId(instance.id);
    workspace.setSelectedDatabase(database.name);
    workspace.setSelectedTable(table.name);
    setTableAutoQueryRequest({
      instanceId: instance.id,
      databaseName: database.name,
      tableId: table.id,
      tableName: table.name,
      conditions: nextConditions,
      range: toSecondRange(range)
    });
  }

  function switchLogTab(tab: OpenLogTab) {
    if (tab.id === workspace.selectedTableId) {
      return;
    }
    const database = workspace.databases.find((item) => item.name === tab.databaseName);
    const table = (workspace.tablesByDatabase[tab.databaseName] ?? database?.tables ?? []).find(
      (item) => item.id === tab.id
    );
    if (!workspace.selectedInstance || !database || !table) {
      setFeedbackMessage("日志表不存在或已被移除");
      setOpenLogTabs((current) => current.filter((item) => item.id !== tab.id));
      return;
    }
    selectTableAndQueryRecentLogs(workspace.selectedInstance, database, table);
  }

  function closeLogTab(tab: OpenLogTab) {
    setConditionsByLogTab((current) => {
      const next = { ...current };
      delete next[tab.id];
      return next;
    });
    setOpenLogTabs((current) => {
      const index = current.findIndex((item) => item.id === tab.id);
      const next = current.filter((item) => item.id !== tab.id);
      if (tab.id === workspace.selectedTableId && next.length > 0) {
        const fallback = next[Math.max(0, Math.min(index, next.length - 1))];
        window.setTimeout(() => switchLogTab(fallback), 0);
      }
      return next;
    });
  }

  async function handleTreeRefreshSuccess(target: QuerySourceTreeTarget) {
    await workspace.refreshSourceTree(target);
    if (target.tableName) {
      setFeedbackMessage(`已接入 ${target.databaseName}.${target.tableName}`);
      return;
    }
    if (target.databaseName) {
      setFeedbackMessage(`已定位到 ${target.databaseName}`);
    }
  }

  function closeInstanceContextMenu() {
    setTreeContextMenu((current) =>
      current.items.length > 0 ? { ariaLabel: "节点操作", items: [], x: 0, y: 0 } : current
    );
  }

  function openCreateDatabase(instance: QuerySourceInstance) {
    setCreateDatabaseInstance(instance);
  }

  function openAccessLogLibrary(instance: QuerySourceInstance, databaseName?: string) {
    setAccessLogLibraryState({
      instance,
      databaseName
    });
  }

  function openEditDatabase(instance: QuerySourceInstance, database: QuerySourceDatabase) {
    setEditDatabaseState({
      instance,
      database
    });
  }

  function openContextMenu(
    x: number,
    y: number,
    ariaLabel: string,
    items: Array<{ key: string; label: string; onSelect: () => void }>
  ) {
    setTreeContextMenu({
      ariaLabel,
      items,
      x,
      y
    });
  }

  function requestDeleteDatabase(instance: QuerySourceInstance, database: QuerySourceDatabase) {
    setConfirmState({
      title: "删除数据库",
      content: `确认删除数据库 ${database.name}？`,
      confirmLabel: "删除",
      onConfirm: async () => {
        await deleteQueryDatabase(database.id);
        await workspace.refreshSourceTree({ instanceId: instance.id });
        setFeedbackMessage(`已删除 ${database.name}`);
      }
    });
  }

  function requestDeleteTable(
    instance: QuerySourceInstance,
    database: QuerySourceDatabase,
    table: QuerySourceTable
  ) {
    setConfirmState({
      title: "删除表",
      content: `确认删除日志表 ${table.name}？`,
      confirmLabel: "删除",
      onConfirm: async () => {
        await deleteQueryTable(table.id);
        await workspace.refreshSourceTree({
          instanceId: instance.id,
          databaseName: database.name
        });
        setFeedbackMessage(`已删除 ${table.name}`);
      }
    });
  }

  function openNewConditionModal() {
    setConditionDraft(createConditionDraft());
    setConditionModalMode("create");
    setFieldPickerOpen(false);
    setConditionModalOpen(true);
  }

  function openEditConditionModal(conditionId: string) {
    const condition = workspace.conditions.find((item) => item.id === conditionId);
    if (!condition) {
      return;
    }
    workspace.setActiveConditionId(conditionId);
    setConditionDraft({ ...condition });
    setConditionModalMode("edit");
    setFieldPickerOpen(false);
    setConditionModalOpen(true);
  }

  function closeConditionModal() {
    setFieldPickerOpen(false);
    setConditionModalOpen(false);
    setConditionDraft(null);
  }

  function saveConditionModal() {
    if (!conditionDraft) {
      return;
    }
    if (conditionDraft.field === "全局匹配" && workspace.analysisFields.supportsGlobalMatch === false) {
      setFeedbackMessage("当前日志表未配置日志内容字段，不能使用全局匹配");
      return;
    }
    if (conditionModalMode === "create") {
      workspace.setConditions([...workspace.conditions, conditionDraft]);
      workspace.setActiveConditionId(conditionDraft.id);
    } else {
      workspace.updateCondition(conditionDraft.id, conditionDraft);
    }
    closeConditionModal();
  }

  function deleteConditionFromModal() {
    if (!conditionDraft) {
      return;
    }
    workspace.removeCondition(conditionDraft.id);
    closeConditionModal();
  }

  function toggleConditionDisabled(condition: QueryFilterCondition) {
    const nextConditions = workspace.conditions.map((item) =>
      item.id === condition.id ? { ...item, disabled: !condition.disabled } : item
    );
    workspace.setConditions(nextConditions);
    workspace.setActiveConditionId(condition.id);
    setFeedbackMessage(condition.disabled ? `已启用条件 ${condition.field}` : `已禁用条件 ${condition.field}`);
    void workspace.runQuery(1, timeRange ? toSecondRange(timeRange) : undefined, nextConditions);
  }

  const activeCondition = useMemo(
    () =>
      workspace.conditions.find((item) => item.id === workspace.activeConditionId) ??
      workspace.conditions[0] ??
      null,
    [workspace.activeConditionId, workspace.conditions]
  );

  const conditionFieldOptions = useMemo(() => workspace.suggestionFieldOptions, [workspace.suggestionFieldOptions]);

  const activeFieldOption = useMemo(() => {
    const field = String(conditionDraft ? conditionDraft.field : activeCondition?.field || "").trim();
    if (!field) {
      return null;
    }
    return conditionFieldOptions.find((item) => item.field === field) ?? null;
  }, [activeCondition?.field, conditionDraft?.field, conditionFieldOptions]);

  const visibleFieldOptions = useMemo(() => {
    const keyword = String(conditionDraft ? conditionDraft.field : activeCondition?.field || "").trim().toLowerCase();
    const filtered = keyword
      ? conditionFieldOptions.filter((item) => item.field.toLowerCase().includes(keyword))
      : conditionFieldOptions;
    return filtered.slice(0, 40);
  }, [activeCondition?.field, conditionDraft?.field, conditionFieldOptions]);
  const isGlobalMatchDraft = conditionDraft?.field === "全局匹配";
  const isGlobalMatchUnsupported =
    isGlobalMatchDraft && workspace.analysisFields.supportsGlobalMatch === false;

  function handleConditionDraftFieldChange(field: string) {
    const matched = conditionFieldOptions.find((item) => item.field === field);
    setConditionDraft((current) =>
      current
        ? {
            ...current,
            field,
            ...(matched ? { valueType: matched.valueType } : {}),
            ...(field === "全局匹配" ? { operator: "like" as const, valueType: "string" as const } : {})
          }
        : current
    );
  }

  const queryPreview = (() => {
    if (workspace.queryText.trim()) {
      return workspace.queryText.trim();
    }
    try {
      return workspace.buildQueryText() || "无条件";
    } catch (error) {
      return error instanceof Error ? error.message : "筛选条件不合法";
    }
  })();

  function applyQueryHistoryItem(query: string) {
    workspace.applySuggestion(query);
    setQueryHistoryMenuOpen(false);
    setFeedbackMessage("已填入最近查询");
  }

  function clearQueryHistory() {
    workspace.clearQueryHistory();
    setQueryHistoryMenuOpen(false);
    setFeedbackMessage("已清空当前日志表的最近查询");
  }

  return (
    <section className="cv-section-stack cv-query-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>查询</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">日志查询</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">日志查询</h1>
        </div>
        <div className="cv-query-toolbar-chips">
          <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
        </div>
      </header>

      <div className="cv-query-shell">
        <aside aria-label="查询上下文" className="cv-panel cv-query-panel cv-query-sidebar">
          <div className="cv-panel-header">
            <div>
              <h2 className="cv-panel-title">数据源</h2>
            </div>
            {workspace.contextLoading ? <span className="cv-query-panel__status">加载中...</span> : null}
          </div>
          <div className="cv-query-sidebar__body">
            <section role="tree" aria-label="实例、数据库与日志表" className="cv-query-tree">
              <div className="cv-query-tree__heading">
                <strong>实例 / 数据库 / 日志表</strong>
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
                    <div className={`cv-query-tree__instance-row${isActiveInstance ? " cv-query-tree__instance-row--active" : ""}`}>
                      <button
                        type="button"
                        className={`cv-query-tree__instance${isActiveInstance ? " cv-query-tree__instance--active" : ""}`}
                        onClick={() => workspace.setSelectedInstanceId(item.id)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          workspace.setSelectedInstanceId(item.id);
                          openContextMenu(event.clientX, event.clientY, "实例操作", [
                            {
                              key: "create-database",
                              label: "新增数据库",
                              onSelect: () => openCreateDatabase(item)
                            }
                          ]);
                        }}
                        aria-haspopup="menu"
                        aria-expanded={treeContextMenu.items.length > 0}
                      >
                        <span className="cv-query-tree__instance-mark" aria-hidden="true" />
                        <span className="cv-query-tree__instance-name">{item.name}</span>
                      </button>
                    </div>
                    {isActiveInstance ? (
                      <div role="group" aria-label={`${item.name} 数据库`} className="cv-query-tree__children">
                        {workspace.databases.map((database) => {
                          const isActiveDatabase = workspace.selectedDatabase === database.name;
                          const databaseTables = workspace.tablesByDatabase[database.name] ?? [];
                          return (
                            <div key={database.name} className="cv-query-tree__database-group">
                              <button
                                type="button"
                                aria-pressed={isActiveDatabase}
                                aria-label={`数据库 ${database.name}`}
                                className={`cv-query-tree__database${isActiveDatabase ? " cv-query-tree__database--active" : ""}`}
                                onClick={() => workspace.setSelectedDatabase(database.name)}
                                onContextMenu={(event) => {
                                  event.preventDefault();
                                  workspace.setSelectedInstanceId(item.id);
                                  workspace.setSelectedDatabase(database.name);
                                  openContextMenu(event.clientX, event.clientY, "数据库操作", [
                                    {
                                      key: "edit-database",
                                      label: "编辑数据库",
                                      onSelect: () => openEditDatabase(item, database)
                                    },
                                    {
                                      key: "access-log-library",
                                      label: "接入已有日志表",
                                      onSelect: () => openAccessLogLibrary(item, database.name)
                                    },
                                    {
                                      key: "delete-database",
                                      label: "删除数据库",
                                      onSelect: () => requestDeleteDatabase(item, database)
                                    }
                                  ]);
                                }}
                              >
                                <span className="cv-query-tree__database-rail" aria-hidden="true" />
                                <span className="cv-query-tree__database-dot" aria-hidden="true" />
                                {database.name}
                              </button>
                              {isActiveDatabase ? (
                                <div role="group" aria-label={`${database.name} 日志表`} className="cv-query-tree__tables">
                                  {databaseTables.map((table) => {
                                    const isActiveTable = workspace.selectedTable === table.name;
                                    return (
                                      <button
                                        key={table.name}
                                        type="button"
                                        aria-pressed={isActiveTable}
                                        aria-label={`日志表 ${table.name}`}
                                        className={`cv-query-tree__table${isActiveTable ? " cv-query-tree__table--active" : ""}`}
                                        onClick={() => selectTableAndQueryRecentLogs(item, database, table)}
                                        onContextMenu={(event) => {
                                          event.preventDefault();
                                          workspace.setSelectedInstanceId(item.id);
                                          workspace.setSelectedDatabase(database.name);
                                          workspace.setSelectedTable(table.name);
                                          openContextMenu(event.clientX, event.clientY, "日志表操作", [
                                            {
                                              key: "delete-table",
                                              label: "删除表",
                                              onSelect: () => requestDeleteTable(item, database, table)
                                            }
                                          ]);
                                        }}
                                      >
                                        <span className="cv-query-tree__table-rail" aria-hidden="true" />
                                        <span className="cv-query-tree__table-dot" aria-hidden="true" />
                                        {table.name}
                                      </button>
                                    );
                                  })}
                                  {databaseTables.length === 0 ? (
                                    <span className="cv-query-tree__empty">无日志表</span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                        {workspace.databases.length === 0 ? (
                          <span className="cv-query-tree__empty">无库</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          </div>
        </aside>

        <div className="cv-query-main">
          {validOpenLogTabs.length > 0 ? (
            <div className="cv-query-log-tabs" role="tablist" aria-label="日志表工作区标签">
              {validOpenLogTabs.map((tab) => {
                const active = tab.id === workspace.selectedTableId;
                return (
                  <span
                    key={tab.id}
                    className={active ? "cv-query-log-tab cv-query-log-tab--active" : "cv-query-log-tab"}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className="cv-query-log-tab__main"
                      onClick={() => switchLogTab(tab)}
                    >
                      <strong>{tab.tableName}</strong>
                      <span>{tab.databaseName}</span>
                    </button>
                    <button
                      type="button"
                      className="cv-query-log-tab__close"
                      aria-label={`关闭日志表 ${tab.tableName}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        closeLogTab(tab);
                      }}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          ) : null}
          <section aria-label="查询输入" className="cv-panel cv-query-panel">
            <div className="cv-panel-header">
              <div>
                <h2 className="cv-panel-title">筛选</h2>
              </div>
              <div className="cv-query-action-row">
                <button type="button" className="cv-secondary-button" onClick={openNewConditionModal}>
                  新增条件
                </button>
                <div className="cv-query-saved">
                  <button
                    type="button"
                    className="cv-secondary-button"
                    onClick={() => {
                      setSavedQueryMenuOpen(false);
                      setQueryHistoryMenuOpen((current) => !current);
                    }}
                    aria-expanded={queryHistoryMenuOpen}
                    aria-haspopup="menu"
                  >
                    最近查询
                    {workspace.queryHistory.length > 0 ? ` ${workspace.queryHistory.length}` : ""}
                  </button>
                  {queryHistoryMenuOpen ? (
                    <div className="cv-query-saved__menu" role="menu" aria-label="最近查询">
                      <div className="cv-query-saved__menu-header">
                        <strong>最近查询</strong>
                        <span>{workspace.queryHistory.length} 条</span>
                      </div>
                      {workspace.queryHistory.length > 0 ? (
                        <>
                          <div className="cv-query-saved__list">
                            {workspace.queryHistory.map((query, index) => (
                              <article key={`${query}-${index}`} className="cv-query-saved__item cv-query-saved__item--single">
                                <button type="button" role="menuitem" onClick={() => applyQueryHistoryItem(query)}>
                                  <strong title={query}>{query}</strong>
                                  <span>点击填入查询语句</span>
                                </button>
                              </article>
                            ))}
                          </div>
                          <button type="button" className="cv-query-saved__create" onClick={clearQueryHistory}>
                            清空最近查询
                          </button>
                        </>
                      ) : (
                        <div className="cv-query-saved__empty">执行查询后会自动记录最近 10 条</div>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="cv-query-saved">
                  <button
                    type="button"
                    className="cv-secondary-button"
                    onClick={() => {
                      setQueryHistoryMenuOpen(false);
                      setSavedQueryMenuOpen((current) => !current);
                    }}
                    aria-expanded={savedQueryMenuOpen}
                    aria-haspopup="menu"
                  >
                    收藏查询
                    {workspace.savedFilterProfiles.length > 0 ? ` ${workspace.savedFilterProfiles.length}` : ""}
                  </button>
                  {savedQueryMenuOpen ? (
                    <div className="cv-query-saved__menu" role="menu" aria-label="收藏查询">
                      <div className="cv-query-saved__menu-header">
                        <strong>收藏查询</strong>
                        <span>{workspace.savedFilterLoading ? "加载中..." : `${workspace.savedFilterProfiles.length} 条`}</span>
                      </div>
                      <button
                        type="button"
                        className="cv-query-saved__create"
                        onClick={() => {
                          setSavedQueryMenuOpen(false);
                          openSaveQueryModal();
                        }}
                      >
                        保存当前查询
                      </button>
                      {workspace.savedFilterProfiles.length > 0 ? (
                        <div className="cv-query-saved__list">
                          {workspace.savedFilterProfiles.map((profile) => (
                            <article key={profile.id} className="cv-query-saved__item">
                              <button type="button" role="menuitem" onClick={() => applySavedFilterProfile(profile)}>
                                <strong>{profile.name}</strong>
                                <span>{profile.conditions.length} 条条件 · {profile.creator || "system"}</span>
                              </button>
                              <button
                                type="button"
                                className="cv-query-saved__delete"
                                aria-label={`删除收藏 ${profile.name}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void deleteSavedFilterProfile(profile.id, profile.name);
                                }}
                              >
                                删除
                              </button>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="cv-query-saved__empty">暂无收藏查询</div>
                      )}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="cv-secondary-button"
                  onClick={() => void handleShareQuery()}
                  disabled={shareLoading}
                >
                  {shareLoading ? "生成中..." : "分享"}
                </button>
                <button
                  type="button"
                  className="cv-action-button"
                  onClick={() => void workspace.runQuery(1)}
                  disabled={workspace.loading}
                >
                  {workspace.loading ? "查询中..." : "执行查询"}
                </button>
              </div>
            </div>

            <div className="cv-query-builder">
              <section
                aria-label="条件清单"
                className="cv-query-builder__list"
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    openNewConditionModal();
                  }
                }}
              >
                <div className="cv-query-builder__list-header">
                  <h3 className="cv-query-builder__title">条件</h3>
                  <span>{workspace.conditions.length} 项</span>
                </div>
                {workspace.conditions.length > 0 ? (
                  <div className="cv-query-condition-list">
                    {workspace.conditions.map((condition) => (
                      <span
                        key={condition.id}
                        className={
                          [
                            "cv-query-condition",
                            condition.id === activeCondition?.id ? "cv-query-condition--active" : "",
                            condition.disabled ? "cv-query-condition--disabled" : ""
                          ]
                            .filter(Boolean)
                            .join(" ")
                        }
                      >
                        <button
                          type="button"
                          className="cv-query-condition__main"
                          onClick={() => openEditConditionModal(condition.id)}
                        >
                          {`${condition.field || "未选字段"} / ${condition.operator} / ${formatConditionSummaryValue(condition.value)}`}
                        </button>
                        <button
                          type="button"
                          className="cv-query-condition__toggle"
                          aria-label={`${condition.disabled ? "启用" : "禁用"}条件 ${condition.field || "未选字段"}`}
                          title={condition.disabled ? "启用条件" : "禁用条件"}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleConditionDisabled(condition);
                          }}
                        >
                          {condition.disabled ? "启用" : "禁用"}
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <button type="button" className="cv-query-empty-action" onClick={openNewConditionModal}>
                    暂无条件，点击添加
                  </button>
                )}
              </section>
            </div>

            <div className="cv-query-builder__preview">
              <strong>查询预览</strong>
              <code>{queryPreview}</code>
            </div>

            {feedbackMessage ? (
              <div className="cv-query-feedback" role="status" aria-live="polite">
                {feedbackMessage}
              </div>
            ) : null}
          </section>

          <div className="cv-query-workspace">
            <section aria-label="直方图" className="cv-panel cv-query-panel">
        <div className="cv-panel-header">
          <div>
            <h2 className="cv-panel-title">时间分布</h2>
          </div>
          {workspace.chartLoading ? <span className="cv-query-panel__status">加载中...</span> : null}
        </div>
        {workspace.charts.length > 0 ? (
          <div className="cv-query-histogram">
            <div className="cv-query-histogram__y-axis" aria-hidden="true">
              <span>{formatCount(chartAxisMax)}</span>
              <span>0</span>
            </div>
            <div className="cv-query-histogram__plot">
              {workspace.charts.map((item) => {
                const hasCount = item.count > 0;
                return (
                  <div key={`${item.from}-${item.to}`} className="cv-query-histogram__item">
                    <span className="cv-query-histogram__value">{hasCount ? formatCount(item.count) : ""}</span>
                    <button
                      type="button"
                      title={
                        hasCount
                          ? `${formatTimeAxisLabel(item.from)} - ${formatTimeAxisLabel(item.to)}：${formatCount(item.count)} 条`
                          : undefined
                      }
                      onClick={() => {
                        if (hasCount) {
                          const nextRange = [new Date(item.from * 1000), new Date(item.to * 1000)] as [Date, Date];
                          setTimeRange(nextRange);
                          void workspace.runQuery(1, { st: item.from, et: item.to });
                        }
                      }}
                      className={hasCount ? "cv-query-histogram__bar" : "cv-query-histogram__bar cv-query-histogram__bar--empty"}
                      aria-disabled={!hasCount}
                      tabIndex={hasCount ? 0 : -1}
                      style={{
                        height: hasCount ? `${Math.max(12, Math.round((item.count / chartAxisMax) * 72))}px` : "0px"
                      }}
                    />
                    <span className="cv-query-histogram__axis">{formatTimeAxisLabel(item.from)}</span>
                  </div>
                );
              })}
              <div className="cv-query-histogram__baseline" aria-hidden="true" />
            </div>
          </div>
        ) : (
          <div className="cv-query-empty-text cv-query-empty-text--spaced">暂无分布</div>
        )}
            </section>

            <section aria-label="查询结果" className="cv-panel cv-query-panel">
        <div className="cv-panel-header">
          <div>
            <h2 className="cv-panel-title">查询结果</h2>
          </div>
          {workspace.logs ? (
            <div className="cv-query-result-meta">
              <span>共 {formatCount(workspace.logs.count)} 条结果</span>
              <span>耗时 {workspace.logs.cost} ms</span>
            </div>
          ) : null}
        </div>
        <div className="cv-query-result-tools">
          <div className="cv-query-column-config">
            <button
              type="button"
              className="cv-secondary-button"
              onClick={() => setResultColumnSelectorOpen((current) => !current)}
            >
              列配置
            </button>
            {resultColumnSelectorOpen ? (
              <div className="cv-query-column-config__panel" role="dialog" aria-label="结果列配置">
                <div className="cv-query-column-config__header">
                  <strong>显示字段</strong>
                  <button type="button" className="cv-link-button" onClick={resetResultColumns}>
                    恢复默认
                  </button>
                </div>
                <div className="cv-query-column-config__list">
                  {resultColumnOptions.map((item) => (
                    <label key={item.key} className="cv-query-column-config__item">
                      <input
                        type="checkbox"
                        checked={resultColumnKeys.includes(item.key)}
                        onChange={() => toggleResultColumn(item.key)}
                      />
                      <span>{item.label}</span>
                      <em>{item.kind === "builtin" ? "摘要" : "字段"}</em>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {workspace.errorMessage ? (
          <div role="alert" className="cv-query-alert">
            {workspace.errorMessage}
          </div>
        ) : null}

        {!workspace.errorMessage && workspace.logs && workspace.logs.logs.length > 0 ? (
          <div className="cv-query-result-stack">
            <TraceTimeline groups={traceGroups} />
            <table className="cv-query-result-table">
                <thead>
                  <tr>
                    {visibleResultColumns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {normalizedLogRows.map((row, index) => (
                    <Fragment key={`${index}-${row.timeText}`}>
                      <tr
                        className={
                          expandedLogIndex === index
                            ? "cv-query-result-table__row cv-query-result-table__row--active"
                            : "cv-query-result-table__row"
                        }
                        tabIndex={0}
                        aria-expanded={expandedLogIndex === index}
                        onClick={() => toggleExpandedLog(index)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleExpandedLog(index);
                          }
                        }}
                      >
                        {visibleResultColumns.map((column) => {
                          const value = formatResultColumnValue(row, column);
                          const cellClassName = [
                            column.key === "__level" || column.key === "lv" ? "cv-query-result-table__level" : "",
                            value.empty ? "cv-query-result-table__empty" : ""
                          ]
                            .filter(Boolean)
                            .join(" ");
                          return (
                            <td
                              key={column.key}
                              className={cellClassName || undefined}
                            >
                              <span className="cv-query-truncate-text" title={value.text}>
                                {truncate(value.text)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                      {expandedLogIndex === index ? (
                        <tr className="cv-query-result-table__detail-row">
                          <td colSpan={visibleResultColumns.length}>
                            <section
                              aria-label="日志详情"
                              className="cv-query-detail cv-query-detail--inline"
                            >
                              <div className="cv-query-detail__header">
                                <div>
                                  <strong>日志详情</strong>
                                  <span>{Object.keys(row.parsed).length} 个字段</span>
                                </div>
                                <button
                                  type="button"
                                  className="cv-secondary-button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setExpandedLogDisplayMode((current) => (current === "json" ? "fields" : "json"));
                                  }}
                                >
                                  {expandedLogDisplayMode === "json" ? "字段" : "JSON"}
                                </button>
                              </div>
                              {expandedLogDisplayMode === "json" ? (
                                <pre className="cv-query-pre cv-query-detail__json">
                                  {formatLogJsonPreview(row)}
                                </pre>
                              ) : (
                                <div className="cv-query-detail__body">
                                  {Object.entries(row.parsed).map(([key, value]) => {
                                    const nestedEntries = scalarJsonEntries(key, value);
                                    return (
                                      <Fragment key={key}>
                                        <div className="cv-query-detail__row">
                                          <strong title={key}>
                                            {canOpenFieldStats(key, value) ? (
                                              <button
                                                type="button"
                                                className="cv-query-detail__key-button"
                                                title={`查看 ${key} 的值分布`}
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  void openFieldStatsModal(key, value, !isPresentLogValue(row.original[key]));
                                                }}
                                              >
                                                {key}
                                              </button>
                                            ) : (
                                              key
                                            )}
                                          </strong>
                                          {canCreateConditionFromDetailValue(key, value) ? (
                                            <span className="cv-query-detail__value-actions">
                                              <button
                                                type="button"
                                                className="cv-query-detail__value-button"
                                                title={`查看 ${key} = ${formatLogDetailValue(value)} 的分布`}
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  void openFieldStatsModal(key, value, !isPresentLogValue(row.original[key]));
                                                }}
                                              >
                                                {formatLogDetailValue(value)}
                                              </button>
                                              {canStartAIAnalysisFromField(key, value) ? (
                                                <button
                                                  type="button"
                                                  className="cv-query-detail__link-button"
                                                  title={`用 ${key} 进行 AI 分析`}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    openLinkQueryModal(row, key, value);
                                                  }}
                                                >
                                                  AI 分析
                                                </button>
                                              ) : null}
                                            </span>
                                          ) : (
                                            <span className="cv-query-detail__value-text" title={formatLogDetailValue(value)}>
                                              {formatLogDetailValue(value)}
                                            </span>
                                          )}
                                        </div>
                                        {nestedEntries.map((nestedEntry) => {
                                          const nestedKey = nestedEntry.key;
                                          const nestedValue = nestedEntry.value;
                                          return (
                                            <div key={`${key}.${nestedKey}`} className="cv-query-detail__row cv-query-detail__row--nested">
                                              <strong title={`${key}.${nestedKey}`}>
                                                <button
                                                  type="button"
                                                  className="cv-query-detail__key-button"
                                                  title={`查看 ${nestedKey} 的值分布`}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    void openFieldStatsModal(nestedKey, nestedValue, true, nestedEntry.fieldRef);
                                                  }}
                                                >
                                                  {nestedKey}
                                                </button>
                                              </strong>
                                              <span className="cv-query-detail__value-actions">
                                                <button
                                                  type="button"
                                                  className="cv-query-detail__value-button"
                                                  title={`查看 ${nestedKey} = ${nestedValue} 的分布`}
                                                  aria-label={`查看 JSON 字段 ${nestedKey} 的值分布`}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    void openFieldStatsModal(nestedKey, nestedValue, true, nestedEntry.fieldRef);
                                                  }}
                                                >
                                                  {nestedValue}
                                                </button>
                                                {canStartAIAnalysisFromField(nestedKey, nestedValue) ? (
                                                  <button
                                                    type="button"
                                                    className="cv-query-detail__link-button"
                                                    title={`用 ${nestedKey} 进行 AI 分析`}
                                                    onClick={(event) => {
                                                      event.stopPropagation();
                                                      openLinkQueryModal(row, nestedKey, nestedValue);
                                                    }}
                                                  >
                                                    AI 分析
                                                  </button>
                                                ) : null}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </Fragment>
                                    );
                                  })}
                                </div>
                              )}
                            </section>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
            </table>
            <div className="cv-query-pagination">
              <span className="cv-query-empty-text">
                第 {workspace.page} 页，每页 {workspace.pageSize} 条
              </span>
              <div className="cv-query-action-row">
                <button
                  type="button"
                  className="cv-secondary-button"
                  disabled={workspace.page <= 1 || workspace.loading}
                  onClick={() => void workspace.runQuery(workspace.page - 1)}
                >
                  上一页
                </button>
                <button
                  type="button"
                  className="cv-secondary-button"
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
          <div className="cv-query-empty-text cv-query-empty-text--spaced">无结果</div>
        ) : null}

        {!workspace.errorMessage && !workspace.logs ? (
          <div className="cv-query-empty-text cv-query-empty-text--spaced">
            执行后显示结果
          </div>
        ) : null}
            </section>
          </div>
        </div>
      </div>

      <ContextMenu
        open={treeContextMenu.items.length > 0}
        x={treeContextMenu.x}
        y={treeContextMenu.y}
        ariaLabel={treeContextMenu.ariaLabel}
        items={treeContextMenu.items}
        onClose={closeInstanceContextMenu}
      />

      {fieldStatsState ? (
        <div className="cv-report-modal-backdrop" role="presentation" onClick={closeFieldStatsModal}>
          <section
            className="cv-report-modal cv-query-modal cv-query-field-stats-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${fieldStatsState.field} 字段值分布`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 className="cv-panel-title">{fieldStatsState.field}</h2>
                <p className="cv-panel-description">
                  当前时间范围和筛选条件下的字段值占比
                  {fieldStatsState.data ? ` · 非空 ${formatCount(fieldStatsState.data.total)} 条` : ""}
                  {fieldStatsState.fieldRef.source !== "column" || !fieldStatsState.fieldRef.isAccelerated
                    ? " · 来源日志内容字段"
                    : " · 来源外层字段"}
                  {" · 点击值加入搜索条件"}
                </p>
              </div>
              <button type="button" className="cv-secondary-button" onClick={closeFieldStatsModal}>
                关闭
              </button>
            </div>
            <div className="cv-query-field-stats">
              {fieldStatsState.loading ? <div className="cv-query-empty-text">统计中...</div> : null}
              {fieldStatsState.error ? (
                <div className="cv-query-alert" role="alert">{fieldStatsState.error}</div>
              ) : null}
              {!fieldStatsState.loading && !fieldStatsState.error && fieldStatsState.data?.items.length === 0 ? (
                <div className="cv-query-empty-text">当前条件下没有非空字段值</div>
              ) : null}
              {fieldStatsState.data?.items.map((item) => (
                <button
                  key={`${item.value}-${item.count}`}
                  type="button"
                  className="cv-query-field-stats__item"
                  title={
                    fieldStatsState.fieldRef.source === "column" && fieldStatsState.fieldRef.isAccelerated
                      ? `添加条件：${fieldStatsState.field} = ${item.value}`
                      : `添加全局匹配：${item.value}`
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    requestAddConditionFromFieldStatsValue(fieldStatsState.fieldRef, item.value);
                  }}
                >
                  <span className="cv-query-field-stats__value">{item.value}</span>
                  <span className="cv-query-field-stats__bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(item.percentage, 1)}%` }} />
                  </span>
                  <span className="cv-query-field-stats__meta">
                    <strong>{formatPercentage(item.percentage)}</strong>
                    <span>{formatCount(item.count)}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {fieldStatsConfirmState ? (
        <div
          className="cv-report-modal-backdrop cv-query-confirm-backdrop"
          role="presentation"
          onClick={() => setFieldStatsConfirmState(null)}
        >
          <section
            className="cv-report-modal cv-query-field-stats-confirm"
            role="dialog"
            aria-modal="true"
            aria-label="确认加入搜索条件"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-query-field-stats-confirm__header">
              <div>
                <h2 className="cv-panel-title">加入搜索条件</h2>
                <p className="cv-panel-description">确认后会追加到当前查询条件中。</p>
              </div>
              <button type="button" className="cv-secondary-button" onClick={() => setFieldStatsConfirmState(null)}>
                关闭
              </button>
            </div>
            <div className="cv-query-field-stats-confirm__body">
              <span>将加入</span>
              <code title={fieldStatsConfirmState.actionText}>{fieldStatsConfirmState.actionText}</code>
            </div>
            <div className="cv-query-modal__footer">
              <button type="button" className="cv-secondary-button" onClick={() => setFieldStatsConfirmState(null)}>
                取消
              </button>
              <button type="button" className="cv-action-button" onClick={confirmAddConditionFromFieldStatsValue}>
                加入查询
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {conditionModalOpen && conditionDraft ? (
        <div className="cv-report-modal-backdrop" role="presentation" onClick={closeConditionModal}>
          <section
            className="cv-report-modal cv-query-modal cv-query-condition-modal"
            role="dialog"
            aria-modal="true"
            aria-label={conditionModalMode === "create" ? "新增条件" : "编辑条件"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 className="cv-panel-title">
                  {conditionModalMode === "create" ? "新增条件" : "编辑条件"}
                </h2>
              </div>
              <button type="button" className="cv-secondary-button" onClick={closeConditionModal}>
                关闭
              </button>
            </div>
            <div className="cv-query-condition-modal__body">
              <div className="cv-query-builder-form cv-query-builder-form--modal">
                <label
                  className="cv-query-builder-form__field cv-query-builder-form__field--field-picker"
                  htmlFor="query-condition-field"
                >
                  字段
                  <input
                    id="query-condition-field"
                    value={conditionDraft.field}
                    onFocus={() => setFieldPickerOpen(true)}
                    onBlur={() => window.setTimeout(() => setFieldPickerOpen(false), 120)}
                    onChange={(event) => {
                      handleConditionDraftFieldChange(event.target.value);
                      setFieldPickerOpen(true);
                    }}
                    placeholder="请输入字段名"
                  />
                  {fieldPickerOpen && visibleFieldOptions.length > 0 ? (
                    <div className="cv-query-field-picker" role="listbox" aria-label="字段候选">
                      {visibleFieldOptions.map((item) => (
                        <button
                          key={`field-${item.source}-${item.field}`}
                          type="button"
                          className={
                            item.field === conditionDraft.field
                              ? "cv-query-field-picker__option cv-query-field-picker__option--active"
                              : "cv-query-field-picker__option"
                          }
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleConditionDraftFieldChange(item.field);
                            setFieldPickerOpen(false);
                          }}
                        >
                          <span className="cv-query-field-picker__name">{item.field}</span>
                          <span className="cv-query-field-picker__meta">
                            <span>{item.sourceLabel}</span>
                            <span>{item.queryLabel}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {fieldPickerOpen && visibleFieldOptions.length === 0 ? (
                    <div className="cv-query-field-picker cv-query-field-picker--empty">
                      未匹配字段目录
                    </div>
                  ) : null}
                  <div className="cv-query-field-meta">
                    {activeFieldOption ? (
                      <>
                        <span className="cv-query-field-meta__badge">{activeFieldOption.sourceLabel}</span>
                        <span>{activeFieldOption.queryLabel}</span>
                      </>
                    ) : isGlobalMatchUnsupported ? (
                      <span>当前日志表未配置日志内容字段，不能使用全局匹配</span>
                    ) : (
                      <span>未匹配字段目录，默认按 JSON 路径查询</span>
                    )}
                  </div>
                </label>

                {!isGlobalMatchDraft ? (
                  <label className="cv-query-builder-form__field" htmlFor="query-condition-operator">
                    运算符
                    <select
                      id="query-condition-operator"
                      value={conditionDraft.operator}
                      onChange={(event) =>
                        setConditionDraft((current) =>
                          current
                            ? {
                                ...current,
                                operator: event.target.value as (typeof queryOperatorOptions)[number]["value"]
                              }
                            : current
                        )
                      }
                    >
                      {queryOperatorOptions.map((item) => (
                        <option key={`operator-${item.value}`} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {!isGlobalMatchDraft ? (
                  <label className="cv-query-builder-form__field" htmlFor="query-condition-value-type">
                    值类型
                    <select
                      id="query-condition-value-type"
                      value={conditionDraft.valueType}
                      onChange={(event) =>
                        setConditionDraft((current) =>
                          current
                            ? {
                                ...current,
                                valueType: event.target.value as (typeof queryValueTypeOptions)[number]["value"],
                                operator:
                                  event.target.value !== "string" &&
                                  (current.operator === "like" || current.operator === "not like")
                                    ? "="
                                    : current.operator
                              }
                            : current
                        )
                      }
                    >
                      {queryValueTypeOptions.map((item) => (
                        <option key={`value-type-${item.value}`} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="cv-query-builder-form__field" htmlFor="query-condition-value">
                  条件值
                  <input
                    id="query-condition-value"
                    value={String(conditionDraft.value ?? "")}
                    onChange={(event) =>
                      setConditionDraft((current) =>
                        current
                          ? {
                              ...current,
                              value: event.target.value
                            }
                          : current
                      )
                    }
                    placeholder={conditionDraft.valueType === "number" ? "请输入数字" : "请输入筛选值"}
                  />
                </label>
              </div>
              <div className="cv-query-condition-modal__footer">
                {conditionModalMode === "edit" ? (
                  <button type="button" className="cv-secondary-button" onClick={deleteConditionFromModal}>
                    删除条件
                  </button>
                ) : (
                  <span />
                )}
                <div className="cv-query-condition-modal__actions">
                  <button type="button" className="cv-secondary-button" onClick={closeConditionModal}>
                    取消
                  </button>
                  <button
                    type="button"
                    className="cv-action-button"
                    onClick={saveConditionModal}
                    disabled={isGlobalMatchUnsupported}
                  >
                    确认
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {linkQueryAnchor ? (
        <div className="cv-report-modal-backdrop" role="presentation" onClick={closeLinkQueryModal}>
          <section
            className="cv-report-modal cv-query-modal cv-query-link-modal"
            role="dialog"
            aria-modal="true"
            aria-label="链路查询"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 className="cv-panel-title">链路查询</h2>
              </div>
              <button type="button" className="cv-secondary-button" onClick={closeLinkQueryModal}>
                关闭
              </button>
            </div>
            <div className="cv-query-link-modal__body">
              <div className="cv-query-link-anchor">
                <span>锚点字段</span>
                <strong>{linkQueryAnchor.field}</strong>
                <span>锚点值</span>
                <code>{linkQueryAnchor.value}</code>
              </div>
              <label className="cv-query-builder-form__field" htmlFor="query-link-window">
                时间窗口
                <select
                  id="query-link-window"
                  value={linkQueryWindowMinutes}
                  onChange={(event) => setLinkQueryWindowMinutes(Number(event.target.value))}
                >
                  <option value={1}>前后 1 分钟</option>
                  <option value={5}>前后 5 分钟</option>
                  <option value={15}>前后 15 分钟</option>
                  <option value={30}>前后 30 分钟</option>
                </select>
              </label>
              <div className="cv-query-link-table-picker" role="group" aria-label="选择日志表">
                <div className="cv-query-link-table-picker__header">
                  <strong>查询日志表</strong>
                  <button
                    type="button"
                    className="cv-link-button"
                    onClick={() => setLinkQuerySelectedTableIds(linkQueryTableOptions.map((item) => item.id))}
                  >
                    全选
                  </button>
                </div>
                <div className="cv-query-link-table-picker__list">
                  {linkQueryTableOptions.map((item) => (
                    <label key={`${item.databaseName}.${item.tableName}`} className="cv-query-link-table-picker__item">
                      <input
                        type="checkbox"
                        checked={linkQuerySelectedTableIds.includes(item.id)}
                        onChange={() => toggleLinkQueryTable(item.id)}
                      />
                      <span>{item.databaseName}.{item.tableName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="cv-query-modal__footer">
                <button type="button" className="cv-secondary-button" onClick={closeLinkQueryModal}>
                  取消
                </button>
                <button type="button" className="cv-action-button" onClick={openLinkQueryPage}>
                  打开链路查询
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <QueryCreateDatabaseModal
        open={Boolean(createDatabaseInstance)}
        instance={createDatabaseInstance}
        onClose={() => setCreateDatabaseInstance(null)}
        onSuccess={(target) => void handleTreeRefreshSuccess(target)}
      />
      <QueryAccessLogLibraryModal
        open={Boolean(accessLogLibraryState.instance)}
        instance={accessLogLibraryState.instance}
        initialDatabaseName={accessLogLibraryState.databaseName}
        onClose={() => setAccessLogLibraryState({ instance: null })}
        onSuccess={(target) => void handleTreeRefreshSuccess(target)}
      />
      <QueryEditDatabaseModal
        open={Boolean(editDatabaseState.instance && editDatabaseState.database)}
        instance={editDatabaseState.instance}
        database={editDatabaseState.database}
        onClose={() => setEditDatabaseState({ instance: null, database: null })}
        onSuccess={(target) => void handleTreeRefreshSuccess(target)}
      />
      {saveQueryModalOpen ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => setSaveQueryModalOpen(false)}
        >
          <section
            className="cv-report-modal cv-query-modal"
            role="dialog"
            aria-modal="true"
            aria-label="保存查询"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 className="cv-panel-title">保存查询</h2>
              </div>
              <button type="button" className="cv-secondary-button" onClick={() => setSaveQueryModalOpen(false)}>
                关闭
              </button>
            </div>
            <div className="cv-form-grid cv-query-modal__form">
              <label className="cv-query-field">
                <span className="cv-query-label">收藏名称</span>
                <input
                  className="cv-input"
                  value={saveQueryName}
                  onChange={(event) => setSaveQueryName(event.target.value)}
                  placeholder="例如：错误日志排查"
                  aria-label="收藏名称"
                />
              </label>
              <div className="cv-query-builder__preview">
                <strong>保存内容</strong>
                <code>{queryPreview}</code>
              </div>
              <div className="cv-query-modal__footer">
                <button type="button" className="cv-secondary-button" onClick={() => setSaveQueryModalOpen(false)}>
                  取消
                </button>
                <button type="button" className="cv-action-button" onClick={() => void handleSaveQuery()}>
                  保存
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {confirmState ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => setConfirmState(null)}
        >
          <section
            className="cv-report-modal cv-query-modal"
            role="dialog"
            aria-modal="true"
            aria-label={confirmState.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 className="cv-panel-title">{confirmState.title}</h2>
              </div>
              <button type="button" className="cv-secondary-button" onClick={() => setConfirmState(null)}>
                关闭
              </button>
            </div>
            <div className="cv-form-grid cv-query-modal__form">
              <div className="cv-query-confirm__content">{confirmState.content}</div>
              <div className="cv-query-modal__footer">
                <button type="button" className="cv-secondary-button" onClick={() => setConfirmState(null)}>
                  取消
                </button>
                <button
                  type="button"
                  className="cv-action-button cv-action-button--danger"
                  onClick={() => {
                    void confirmState.onConfirm().finally(() => setConfirmState(null));
                  }}
                >
                  {confirmState.confirmLabel}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
