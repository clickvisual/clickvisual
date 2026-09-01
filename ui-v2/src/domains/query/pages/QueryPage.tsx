import { Fragment, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, KeyboardEvent, MouseEvent, ReactNode, UIEvent, WheelEvent } from "react";
import {
  EuiButtonIcon,
  EuiDatePicker,
  EuiFieldSearch,
  EuiFieldText,
  EuiIcon,
  EuiPopover,
  EuiSuperSelect,
  EuiTab,
  EuiTabs,
  EuiToolTip
} from "@elastic/eui";
import {
  Axis,
  BrushAxis,
  Chart,
  type CustomTooltipProps,
  HistogramBarSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType
} from "@elastic/charts";
import type { PartialTheme } from "@elastic/charts";
import moment from "moment";
import "moment/locale/zh-cn";
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
  QueryStorageAnalysisField,
  QuerySourceDatabase,
  QuerySourceInstance,
  QuerySourceTable,
  QuerySourceTreeTarget
} from "../types/contracts";
import ContextMenu from "../../../shared/components/ContextMenu";
import { isPrivateLiteEdition } from "../../../shared/config/runtime";
import { buildShareRouteHref, buildV2RouteHref } from "../../../shared/layout/VersionSwitcher";

type QueryDateRange = [Date, Date] | null;
type QueryAbsolutePickerRange = {
  start: string;
  end: string;
};
type TimeRangeAbsoluteField = "start" | "end";
type QueryConditionModalMode = "create" | "edit";
type NormalizedLogRow = {
  original: Record<string, unknown>;
  parsed: Record<string, unknown>;
  timeText: string;
  levelField?: string;
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
type QueryEmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  variant?: "histogram" | "result";
  tone?: "neutral" | "loading" | "empty";
};
type QueryFieldPickerOption = {
  field: string;
  source: string;
  sourceLabel: string;
  queryLabel: string;
  valueType: QueryFilterValueType;
};
type HistogramSelection = {
  anchorIndex: number;
  hoverIndex: number;
};
type HistogramSelectionRange = {
  startIndex: number;
  endIndex: number;
  from: number;
  to: number;
  count: number;
};
type HistogramIntervalValue =
  | "auto"
  | "1m"
  | "5m"
  | "10m"
  | "15m"
  | "30m"
  | "1h"
  | "3h"
  | "6h"
  | "12h"
  | "1d"
  | "1w";
type HistogramChartDatum = {
  x: number;
  count: number;
  from: number;
  to: number;
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
type LogDetailNestedEntry = {
  key: string;
  value: string;
  fieldRef?: QueryFieldRef;
};
type QueryFieldCatalogGroupKey = "log" | "base" | "all";
type QueryFieldCatalogItem = {
  key: string;
  field: string;
  label: string;
  group: QueryFieldCatalogGroupKey;
  columnKey: string;
  valueType: QueryFilterValueType;
  sampleValue: unknown;
  fieldRef: QueryFieldRef;
  canToggleColumn: boolean;
  isColumnVisible: boolean;
  canShowTopValues: boolean;
};
type QueryFieldCatalogGroup = {
  key: QueryFieldCatalogGroupKey;
  title: string;
  items: QueryFieldCatalogItem[];
};
type QueryFieldStatsState = {
  field: string;
  fieldRef: QueryFieldRef;
  loading: boolean;
  data: QueryFieldStatsResponse | null;
  error: string;
};
type QueryFieldStatsView = {
  unsupportedError: boolean;
  shouldUseLoaded: boolean;
  items: QueryFieldStatsResponse["items"];
  total: number;
  source: string;
};

const CONTAINER_NAME_RESULT_COLUMN_KEY = "container.name";
const LEGACY_CONTAINER_NAME_RESULT_COLUMN_KEY = "_container_name_";
const DEFAULT_RESULT_COLUMN_KEYS = ["__time", "__level", "tid", "__message", CONTAINER_NAME_RESULT_COLUMN_KEY, "error"] as const;
const LEGACY_DEFAULT_RESULT_COLUMN_KEYS = ["__time", "__level", "__message"] as const;
const RESULT_COLUMN_STORAGE_PREFIX = "clickvisual-v2-query-result-columns";
const RESULT_COLUMN_STORAGE_VERSION = 2;
const OPEN_LOG_TABS_STORAGE_PREFIX = "clickvisual-v2-query-open-tabs";
const GLOBAL_MATCH_FIELD = "All fields";
const LEGACY_GLOBAL_MATCH_FIELD = "全局匹配";
const GLOBAL_MATCH_DISPLAY_LABEL = GLOBAL_MATCH_FIELD;
const QUERY_PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
const RESULT_TABLE_TOGGLE_COLUMN_WIDTH = 34;
const QUERY_OVERSCROLL_GUARD_CLASS = "cv-query-overscroll-guard";
const QUERY_HORIZONTAL_WHEEL_THRESHOLD = 4;
const QUERY_HORIZONTAL_WHEEL_DOMINANCE_RATIO = 1.15;
const HISTOGRAM_HEIGHT = 112;
const HISTOGRAM_AUTO_TARGET_BARS = 50;
const HISTOGRAM_LOADING_BARS = [26, 34, 22, 48, 66, 42, 30, 58, 74, 36, 52, 28, 44, 62, 32, 50, 70, 38] as const;
const RESULT_LOADING_ROWS = [
  ["52%", "36%", "86%", "64%", "48%"],
  ["58%", "42%", "72%", "52%", "62%"],
  ["46%", "34%", "92%", "58%", "44%"],
  ["64%", "38%", "78%", "68%", "56%"],
  ["50%", "40%", "88%", "46%", "60%"],
  ["56%", "32%", "74%", "62%", "50%"]
] as const;
const FIELD_STATS_LOADING_ROWS = ["82%", "68%", "76%", "54%", "72%", "60%"] as const;
const HISTOGRAM_INTERVAL_OPTIONS: Array<{ value: HistogramIntervalValue; label: string; milliseconds?: number }> = [
  { value: "auto", label: "Auto" },
  { value: "1m", label: "1 minute", milliseconds: 60_000 },
  { value: "5m", label: "5 minutes", milliseconds: 5 * 60_000 },
  { value: "10m", label: "10 minutes", milliseconds: 10 * 60_000 },
  { value: "15m", label: "15 minutes", milliseconds: 15 * 60_000 },
  { value: "30m", label: "30 minutes", milliseconds: 30 * 60_000 },
  { value: "1h", label: "1 hour", milliseconds: 60 * 60_000 },
  { value: "3h", label: "3 hours", milliseconds: 3 * 60 * 60_000 },
  { value: "6h", label: "6 hours", milliseconds: 6 * 60 * 60_000 },
  { value: "12h", label: "12 hours", milliseconds: 12 * 60 * 60_000 },
  { value: "1d", label: "1 day", milliseconds: 24 * 60 * 60_000 },
  { value: "1w", label: "1 week", milliseconds: 7 * 24 * 60 * 60_000 }
];

function shouldGuardHorizontalWheel(event: globalThis.WheelEvent) {
  const deltaX = event.deltaX;
  const deltaY = event.deltaY;
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    Math.abs(deltaX) < QUERY_HORIZONTAL_WHEEL_THRESHOLD ||
    Math.abs(deltaX) < Math.abs(deltaY) * QUERY_HORIZONTAL_WHEEL_DOMINANCE_RATIO
  ) {
    return false;
  }
  return !canConsumeHorizontalWheel(event.target, deltaX);
}

function canConsumeHorizontalWheel(target: EventTarget | null, deltaX: number) {
  if (typeof document === "undefined" || !(target instanceof Node)) {
    return false;
  }
  const start = target instanceof Element ? target : target.parentElement;
  const candidates: Element[] = [];
  for (let element: Element | null = start; element; element = element.parentElement) {
    candidates.push(element);
  }
  const scrollingElement = document.scrollingElement;
  if (scrollingElement && !candidates.includes(scrollingElement)) {
    candidates.push(scrollingElement);
  }
  if (!candidates.includes(document.documentElement)) {
    candidates.push(document.documentElement);
  }
  for (const element of candidates) {
    if (element.scrollWidth <= element.clientWidth + 1) {
      continue;
    }
    const overflowX = window.getComputedStyle(element).overflowX;
    if (overflowX !== "auto" && overflowX !== "scroll" && overflowX !== "overlay") {
      continue;
    }
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    if ((deltaX > 0 && element.scrollLeft < maxScrollLeft - 1) || (deltaX < 0 && element.scrollLeft > 1)) {
      return true;
    }
  }
  return false;
}

const HISTOGRAM_BAR_COLOR = "#f97316";
const HISTOGRAM_SELECTION_COLOR = "#f97316";
const HISTOGRAM_CHART_THEME: PartialTheme = {
  chartMargins: {
    top: 6,
    right: 8,
    bottom: 6,
    left: 2
  },
  axes: {
    axisLine: {
      visible: false
    },
    tickLine: {
      visible: false,
      size: 0,
      padding: 4
    },
    tickLabel: {
      fontSize: 10,
      fill: "#69707d",
      padding: { inner: 6, outer: 4 },
      wrapLines: 1,
      truncate: "end"
    },
    gridLine: {
      horizontal: {
        visible: true,
        stroke: "#edf1f6",
        strokeWidth: 1,
        opacity: 0.8,
        dash: []
      },
      vertical: {
        visible: true,
        stroke: "#f5f7fa",
        strokeWidth: 1,
        opacity: 0.56,
        dash: []
      }
    }
  },
  barSeriesStyle: {
    rect: {
      opacity: 0.88,
      widthRatio: 0.68
    },
    rectBorder: {
      visible: false,
      strokeWidth: 0
    }
  },
  brush: {
    fill: HISTOGRAM_SELECTION_COLOR,
    stroke: HISTOGRAM_SELECTION_COLOR,
    strokeWidth: 1,
    opacity: 0.14
  },
  rectAnnotation: {
    fill: HISTOGRAM_SELECTION_COLOR,
    stroke: HISTOGRAM_SELECTION_COLOR,
    strokeWidth: 0,
    opacity: 0.1
  }
};
const HISTOGRAM_BOTTOM_AXIS_STYLE = {
  tickLabel: {
    offset: {
      x: 8,
      y: 1,
      reference: "global"
    }
  }
} as const;
const HISTOGRAM_LEFT_AXIS_STYLE = {
  tickLabel: {
    offset: {
      x: 0,
      y: -1,
      reference: "global"
    }
  }
} as const;
const RESULT_COLUMN_FIELD_PRIORITY = ["tid", "msg", "message", CONTAINER_NAME_RESULT_COLUMN_KEY, "error"] as const;
const RESULT_BUILTIN_FIELD_ALIASES = [
  "time",
  "timestamp",
  "ts",
  "level",
  "severity",
  "lv",
  "log_level",
  "msg",
  "message",
  "content",
  "body"
] as const;
const RESULT_COLUMN_META_FIELD_PRIORITY = [
  "_raw_log_",
  "_raw_log",
  "_raw",
  "raw_log",
  "raw",
  "rawLogJson",
  "_cluster_",
  "_source_",
  "_log_agent_",
  "_namespace_",
  "_pod_name_",
  "_node_name_",
  "_node_ip_",
  "container.image.name",
  "host.ip",
  "host.name",
  "k8s.namespace.name",
  "k8s.pod.name",
  "k8s.node.ip",
  "k8s.node.name",
  "k8s.pod.uid",
  "_time_second_",
  "_time_nanosecond_",
  "time",
  "ts",
  "lname",
  "log.file.path"
] as const;
const LOG_LEVEL_FIELD_KEYS = ["level", "severity", "lv", "log_level"] as const;
const LOG_TIME_FIELD_KEYS = ["_time", "_time_", "_time_nanosecond_", "_time_second_", "time", "timestamp", "ts"] as const;
const LOG_DETAIL_FIELD_PRIORITY = [
  "tid",
  "trace_id",
  "traceId",
  "span_id",
  "spanId",
  "msg",
  "message",
  "level",
  "lv",
  "severity",
  "log_level",
  "container.name",
  "_container_name_",
  "container_name",
  "application",
  "service",
  "error",
  "status",
  "code",
  "method",
  "addr",
  "comp",
  "compName",
  "cost",
  "event",
  "ip",
  "name",
  "peerIp",
  "peerName",
  "type",
  "ucode"
] as const;
const FIELD_STATS_UNIQUE_FIELDS = ["tid"] as const;
const DEFAULT_TIME_RANGE_MINUTES = 15;
const ABSOLUTE_TIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
const ABSOLUTE_DAY_PRESET_RANGES = [
  { label: "Today", dayOffset: 0 },
  { label: "Yesterday", dayOffset: 1 }
] as const;
const ABSOLUTE_SPAN_PRESETS = [
  { label: "Apply 15 minute absolute span", shortLabel: "15m", minutes: 15 },
  { label: "Apply 1 hour absolute span", shortLabel: "1h", minutes: 60 },
  { label: "Apply 6 hour absolute span", shortLabel: "6h", minutes: 6 * 60 },
  { label: "Apply 24 hour absolute span", shortLabel: "24h", minutes: 24 * 60 },
  { label: "Apply 7 day absolute span", shortLabel: "7d", minutes: 7 * 24 * 60 }
] as const;
const DATE_PICKER_WEEKDAY_LABELS: Record<string, string> = {
  Sunday: "S",
  Sun: "S",
  Monday: "M",
  Mon: "M",
  Tuesday: "T",
  Tue: "T",
  Wednesday: "W",
  Wed: "W",
  Thursday: "T",
  Thu: "T",
  Friday: "F",
  Fri: "F",
  Saturday: "S",
  Sat: "S",
  星期日: "S",
  星期一: "M",
  星期二: "T",
  星期三: "W",
  星期四: "T",
  星期五: "F",
  星期六: "S"
};

type DatePickerHeaderProps = {
  date?: moment.Moment | Date | string | number;
  decreaseMonth: () => void;
  increaseMonth: () => void;
  prevMonthButtonDisabled?: boolean;
  nextMonthButtonDisabled?: boolean;
};

function formatDatePickerWeekday(day: string) {
  return DATE_PICKER_WEEKDAY_LABELS[day] ?? day.trim().charAt(0).toUpperCase();
}

function renderDatePickerHeader({
  date,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled
}: DatePickerHeaderProps) {
  const headerDate = moment.isMoment(date) ? date : moment(date);
  return (
    <div className="cv-query-date-picker-header">
      <button
        type="button"
        className="cv-query-date-picker-header__step"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        aria-label="Previous month"
      >
        <EuiIcon type="chevronSingleLeft" size="s" aria-hidden="true" />
      </button>
      <strong>{headerDate.isValid() ? headerDate.locale("en").format("MMM YYYY") : "Select month"}</strong>
      <button
        type="button"
        className="cv-query-date-picker-header__step"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        aria-label="Next month"
      >
        <EuiIcon type="chevronSingleRight" size="s" aria-hidden="true" />
      </button>
    </div>
  );
}

const LOCALIZED_EUI_DATE_PICKER_PROPS = {
  formatWeekDay: formatDatePickerWeekday,
  renderCustomHeader: renderDatePickerHeader,
  previousMonthButtonLabel: "Previous month",
  nextMonthButtonLabel: "Next month"
};

function isAbortRequestError(error: unknown) {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatFieldsCount(value: number) {
  return `${formatCount(value)} ${value === 1 ? "field" : "fields"}`;
}

function formatHitsLabel(value: number) {
  return value === 1 ? "hit" : "hits";
}

function formatRowsLabel(value: number) {
  return `${formatCount(value)} ${value === 1 ? "row" : "rows"}`;
}

function formatConditionCountLabel(value: number) {
  return `${formatCount(value)} ${value === 1 ? "condition" : "conditions"}`;
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
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
  const startTimeText = searchParams.get("startTime") || "";
  const endTimeText = searchParams.get("endTime") || "";
  if (startTimeText && endTimeText) {
    const startDate = new Date(startTimeText.includes("T") ? startTimeText : startTimeText.replace(" ", "T"));
    const endDate = new Date(endTimeText.includes("T") ? endTimeText : endTimeText.replace(" ", "T"));
    if (
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      endDate.getTime() > startDate.getTime()
    ) {
      return [startDate, endDate] as [Date, Date];
    }
  }
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
  if (url.searchParams.get("tab") === "relative") {
    url.searchParams.delete("tab");
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(window.history.state, "", next);
  }
}

function writeSelectedTableToURL({
  database,
  table
}: {
  instanceId: number | null;
  database: string;
  table: string;
  tableId: number | null;
}) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (database && table) {
    url.searchParams.set("database", database);
    url.searchParams.set("table", table);
  } else {
    url.searchParams.delete("database");
    url.searchParams.delete("table");
  }
  url.searchParams.delete("instanceId");
  url.searchParams.delete("tableId");
  url.searchParams.delete("tid");
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(window.history.state, "", next);
  }
}

function writeResultPaginationToURL(page: number, pageSize: number) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (page > 1) {
    url.searchParams.set("page", String(page));
  } else {
    url.searchParams.delete("page");
  }
  if (pageSize > 0 && pageSize !== QUERY_PAGE_SIZE_OPTIONS[0]) {
    url.searchParams.set("size", String(pageSize));
  } else {
    url.searchParams.delete("size");
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

function buildEndingNowTimeRange(minutes: number) {
  const end = new Date(Date.now());
  end.setSeconds(0, 0);
  const start = new Date(end.getTime() - minutes * 60 * 1000);
  return [start, end] as [Date, Date];
}

function buildDayOffsetTimeRange(dayOffset: number) {
  const start = moment().subtract(dayOffset, "day").startOf("day");
  const end = start.clone().endOf("day");
  return [start.toDate(), end.toDate()] as [Date, Date];
}

function buildDefaultAbsolutePickerRange() {
  return buildAbsolutePickerRange(buildEndingNowTimeRange(DEFAULT_TIME_RANGE_MINUTES));
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

function QueryEmptyState({
  icon,
  title,
  description,
  variant = "result",
  tone = "neutral"
}: QueryEmptyStateProps) {
  return (
    <div className={`cv-query-empty-state cv-query-empty-state--${variant} cv-query-empty-state--${tone}`}>
      <span className="cv-query-empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="cv-query-empty-state__body">
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}

function QueryHistogramLoadingState() {
  return (
    <div className="cv-query-histogram-loading" aria-label="Loading histogram" aria-busy="true">
      <div className="cv-query-histogram-loading__axis" aria-hidden="true" />
      <div className="cv-query-histogram-loading__bars" aria-hidden="true">
        {HISTOGRAM_LOADING_BARS.map((height, index) => (
          <span
            key={`${height}-${index}`}
            className="cv-query-histogram-loading__bar"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function QueryResultLoadingState({ onCancel }: { onCancel?: () => void }) {
  return (
    <div className="cv-query-result-loading" aria-label="Loading query results" aria-busy="true">
      <div className="cv-query-result-loading__bar">
        <span className="cv-query-skeleton cv-query-result-loading__summary" />
        {onCancel ? (
          <button
            type="button"
            className="cv-query-result-loading__cancel"
            aria-label="Cancel query"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : (
          <span className="cv-query-skeleton cv-query-result-loading__action" />
        )}
      </div>
      <div className="cv-query-result-loading__table">
        <div className="cv-query-result-loading__header" aria-hidden="true">
          <span className="cv-query-skeleton" />
          <span className="cv-query-skeleton" />
          <span className="cv-query-skeleton" />
          <span className="cv-query-skeleton" />
          <span className="cv-query-skeleton" />
        </div>
        <div className="cv-query-result-loading__rows" aria-hidden="true">
          {RESULT_LOADING_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="cv-query-result-loading__row">
              {row.map((width, cellIndex) => (
                <span
                  key={`${rowIndex}-${cellIndex}`}
                  className="cv-query-skeleton"
                  style={{ width }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QueryFieldStatsLoadingState() {
  return (
    <div className="cv-query-field-stats-loading" aria-label="Loading top values" aria-busy="true">
      {FIELD_STATS_LOADING_ROWS.map((width, index) => (
        <div key={`${width}-${index}`} className="cv-query-field-stats-loading__row">
          <span className="cv-query-skeleton" style={{ width }} />
          <span className="cv-query-skeleton" />
          <span className="cv-query-skeleton" />
        </div>
      ))}
    </div>
  );
}

function HistogramIconAction({
  label,
  icon,
  disabled,
  muted,
  ariaExpanded,
  showLabel,
  onClick
}: {
  label: string;
  icon: string;
  disabled?: boolean;
  muted?: boolean;
  ariaExpanded?: boolean;
  showLabel?: boolean;
  onClick: () => void;
}) {
  return (
    <EuiToolTip content={label} delay="long">
      <button
        type="button"
        className={[
          "cv-query-histogram-action",
          showLabel ? "cv-query-histogram-action--text" : "cv-query-histogram-action--icon",
          muted ? "cv-query-histogram-action--muted" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-expanded={ariaExpanded}
        title={label}
      >
        <EuiIcon type={icon} size="s" aria-hidden="true" />
        {showLabel ? <span className="cv-query-histogram-action__label">{label}</span> : null}
      </button>
    </EuiToolTip>
  );
}

function ResultToolbarIconAction({
  label,
  icon,
  disabled,
  loading,
  ariaPressed,
  ariaExpanded,
  title,
  showIcon = true,
  showLabel = true,
  onClick
}: {
  label: string;
  icon: string;
  disabled?: boolean;
  loading?: boolean;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  title?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  onClick: () => void;
}) {
  const tooltip = title ?? label;
  return (
    <EuiToolTip content={tooltip} delay="long">
      <button
        type="button"
        className={
          showLabel
            ? "cv-query-result-action cv-query-result-action--text"
            : "cv-query-result-action cv-query-result-action--icon"
        }
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-busy={loading || undefined}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        title={tooltip}
      >
        {loading !== undefined ? (
          <span
            className={
              loading
                ? "cv-query-result-action__spinner cv-query-result-action__spinner--active"
                : "cv-query-result-action__spinner"
            }
            aria-hidden="true"
          />
        ) : showIcon ? (
          <EuiIcon type={icon} size="s" aria-hidden="true" />
        ) : null}
        {showLabel ? <span className="cv-query-result-action__label">{label}</span> : null}
      </button>
    </EuiToolTip>
  );
}

function isGlobalMatchField(field: string) {
  const normalized = field.trim();
  return normalized === GLOBAL_MATCH_FIELD || normalized === LEGACY_GLOBAL_MATCH_FIELD;
}

function formatConditionFieldLabel(field: string) {
  const normalized = field.trim();
  if (!normalized) {
    return "Field";
  }
  return isGlobalMatchField(normalized) ? GLOBAL_MATCH_DISPLAY_LABEL : normalized;
}

function formatConditionFieldInputValue(field: string) {
  return isGlobalMatchField(field) ? GLOBAL_MATCH_DISPLAY_LABEL : field;
}

function parseConditionFieldInput(value: string) {
  const normalized = value.trim();
  return normalized.toLowerCase() === GLOBAL_MATCH_DISPLAY_LABEL.toLowerCase() ||
    normalized === LEGACY_GLOBAL_MATCH_FIELD
    ? GLOBAL_MATCH_FIELD
    : value;
}

function normalizeFieldPickerKey(field: string) {
  return parseConditionFieldInput(field).trim().toLowerCase();
}

function getStorageAnalysisFieldName(field: QueryStorageAnalysisField) {
  return String(field.orderField || (field.rootName ? `${field.rootName}.${field.field}` : field.field)).trim();
}

function getStorageAnalysisValueType(field: QueryStorageAnalysisField): QueryFilterValueType {
  return field.typ === 1 || field.typ === 2 ? "number" : "string";
}

function normalizeFieldCatalogKey(field: string) {
  return normalizeResultColumnOptionField(field).trim().toLowerCase();
}

type FieldPickerChoice = {
  key: string;
  field: string;
  label: string;
};

function buildFieldPickerChoices(value: string, options: QueryFieldPickerOption[]): FieldPickerChoice[] {
  const normalizedValueKey = normalizeFieldPickerKey(value);
  const seenOptions = new Set<string>();
  const uniqueOptions = options
    .map((item) => {
      const key = normalizeFieldPickerKey(item.field);
      if (!key || seenOptions.has(key)) {
        return null;
      }
      seenOptions.add(key);
      return {
        key: `field-${item.source}-${item.field}`,
        field: item.field,
        label: formatConditionFieldLabel(item.field)
      };
    })
    .filter(Boolean) as FieldPickerChoice[];
  const hasCustomValue = Boolean(value.trim() && !seenOptions.has(normalizedValueKey));
  return hasCustomValue
    ? [
        {
          key: `custom-${normalizedValueKey}`,
          field: value,
          label: formatConditionFieldLabel(value)
        },
        ...uniqueOptions
      ]
    : uniqueOptions;
}

function FieldPickerDropdown({
  value,
  options,
  onSelect,
  onClose,
  activeIndex
}: {
  value: string;
  options: QueryFieldPickerOption[];
  onSelect: (field: string) => void;
  onClose: () => void;
  activeIndex?: number;
}) {
  const normalizedValueKey = normalizeFieldPickerKey(value);
  const choices = buildFieldPickerChoices(value, options);
  const clampedActiveIndex =
    typeof activeIndex === "number" && activeIndex >= 0 && activeIndex < choices.length ? activeIndex : -1;

  return (
    <div className="cv-query-field-picker" role="listbox" aria-label="Field suggestions">
      {choices.map((item, index) => {
        const selected = index === clampedActiveIndex || (clampedActiveIndex < 0 && normalizeFieldPickerKey(item.field) === normalizedValueKey);
        return (
          <button
            key={item.key}
            type="button"
            role="option"
            aria-selected={selected}
            className={
              selected
                ? "cv-query-field-picker__option cv-query-field-picker__option--active"
                : "cv-query-field-picker__option"
            }
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onSelect(item.field);
              onClose();
            }}
          >
            <span className="cv-query-field-picker__name">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function QueryCompactSelect<TValue extends string>({
  value,
  options,
  ariaLabel,
  className = "",
  onChange
}: {
  value: TValue;
  options: readonly { label: string; value: TValue }[];
  ariaLabel: string;
  className?: string;
  onChange: (value: TValue) => void;
}) {
  const selectedLabel = options.find((item) => item.value === value)?.label ?? value;
  return (
    <EuiSuperSelect<TValue>
      compressed
      fullWidth
      aria-label={`${ariaLabel}: ${selectedLabel}`}
      title={selectedLabel}
      className={["cv-query-compact-select", className].filter(Boolean).join(" ")}
      itemClassName="cv-query-compact-select__item"
      popoverProps={{
        panelClassName: "cv-query-compact-select__panel",
        repositionOnScroll: true
      }}
      valueOfSelected={value}
      options={options.map((item) => ({
        value: item.value,
        inputDisplay: <span className="cv-query-compact-select__value">{item.label}</span>,
        dropdownDisplay: <span className="cv-query-compact-select__option">{item.label}</span>
      }))}
      onChange={onChange}
    />
  );
}

function formatAbsolutePickerValue(date: Date) {
  return moment(date).format("YYYY-MM-DDTHH:mm:ss.SSSZ");
}

function formatAbsoluteTimeInput(date: Date) {
  return moment(date).locale("en").format(ABSOLUTE_TIME_FORMAT);
}

function parseAbsoluteTimeInput(value: string) {
  const parsed = moment(value.trim(), ABSOLUTE_TIME_FORMAT, true);
  return parsed.isValid() ? parsed.toDate() : null;
}

function buildAbsolutePickerRange(range: [Date, Date]): QueryAbsolutePickerRange {
  return {
    start: formatAbsolutePickerValue(range[0]),
    end: formatAbsolutePickerValue(range[1])
  };
}

function buildInitialAbsolutePickerRange(
  searchParams: URLSearchParams,
  range: [Date, Date]
): QueryAbsolutePickerRange {
  const hasURLRange = Boolean(
    (searchParams.get("start") && searchParams.get("end")) ||
      (searchParams.get("st") && searchParams.get("et")) ||
      (searchParams.get("startTime") && searchParams.get("endTime"))
  );
  return hasURLRange ? buildAbsolutePickerRange(range) : buildDefaultAbsolutePickerRange();
}

function isWholeDayDateRange(range: [Date, Date]) {
  const start = moment(range[0]);
  const end = moment(range[1]);
  return (
    start.isSame(end, "day") &&
    start.hours() === 0 &&
    start.minutes() === 0 &&
    start.seconds() === 0 &&
    end.hours() === 23 &&
    end.minutes() === 59 &&
    end.seconds() === 59
  );
}

function getWholeDaySpanDays(range: [Date, Date]) {
  const start = moment(range[0]);
  const end = moment(range[1]);
  if (
    start.hours() !== 0 ||
    start.minutes() !== 0 ||
    start.seconds() !== 0 ||
    end.hours() !== 23 ||
    end.minutes() !== 59 ||
    end.seconds() !== 59 ||
    end.isBefore(start)
  ) {
    return null;
  }
  return end.clone().startOf("day").diff(start.clone().startOf("day"), "days") + 1;
}

function parseAbsolutePickerRange(range: QueryAbsolutePickerRange) {
  const start = moment.parseZone(range.start);
  const end = moment.parseZone(range.end);
  if (!start.isValid() || !end.isValid() || start.valueOf() >= end.valueOf()) {
    return null;
  }
  return [start.toDate(), end.toDate()] as [Date, Date];
}

function getTimeRangeButtonLabel(parsedRange: QueryDateRange) {
  if (parsedRange) {
    const start = moment(parsedRange[0]).locale("en");
    const end = moment(parsedRange[1]).locale("en");
    if (isWholeDayDateRange(parsedRange)) {
      return start.isSame(moment(), "day") ? "Today" : start.format("MMM D, YYYY");
    }
    const hasSeconds = start.seconds() !== 0 || end.seconds() !== 0;
    const startFormat = hasSeconds ? "MM/DD HH:mm:ss" : "MM/DD HH:mm";
    const endFormat = start.isSame(end, "day")
      ? hasSeconds ? "HH:mm:ss" : "HH:mm"
      : hasSeconds ? "MM/DD HH:mm:ss" : "MM/DD HH:mm";
    return `${start.format(startFormat)} - ${end.format(endFormat)}`;
  }
  return "Select time range";
}

function formatDurationSecondsLabel(durationSeconds: number) {
  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  }
  if (durationSeconds < 60 * 60) {
    return `${Math.round(durationSeconds / 60)}m`;
  }
  if (durationSeconds < 24 * 60 * 60) {
    return `${Math.round(durationSeconds / 60 / 60)}h`;
  }
  return `${Math.round(durationSeconds / 60 / 60 / 24)}d`;
}

function getTimeRangeDurationLabel(range: QueryDateRange) {
  if (!range) {
    return "Invalid time range";
  }
  return formatDurationSecondsLabel(Math.max(1, Math.round((range[1].getTime() - range[0].getTime()) / 1000)));
}

function cloneDateRange(range: QueryDateRange): [Date, Date] | null {
  if (!range) {
    return null;
  }
  return [new Date(range[0]), new Date(range[1])];
}

function isSameSecondDateRange(left: QueryDateRange, right: QueryDateRange) {
  if (!left || !right) {
    return false;
  }
  return (
    Math.floor(left[0].getTime() / 1000) === Math.floor(right[0].getTime() / 1000) &&
    Math.floor(left[1].getTime() / 1000) === Math.floor(right[1].getTime() / 1000)
  );
}

function TimeRangeAbsolutePicker({
  value,
  onChange,
  isLoading
}: {
  value: QueryAbsolutePickerRange;
  onChange: (pickerRange: QueryAbsolutePickerRange, dateRange: QueryDateRange) => void;
  isLoading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rangeError, setRangeError] = useState("");
  const [absoluteDraft, setAbsoluteDraft] = useState(() => {
    const initialRange = parseAbsolutePickerRange(value) ?? buildDefaultTimeRange();
    return {
      start: initialRange[0],
      end: initialRange[1]
    };
  });
  const [absoluteInputDraft, setAbsoluteInputDraft] = useState(() => {
    const initialRange = parseAbsolutePickerRange(value) ?? buildDefaultTimeRange();
    return {
      start: formatAbsoluteTimeInput(initialRange[0]),
      end: formatAbsoluteTimeInput(initialRange[1])
    };
  });
  const [activeAbsoluteField, setActiveAbsoluteField] = useState<TimeRangeAbsoluteField | null>(null);
  const parsedRange = useMemo(() => parseAbsolutePickerRange(value), [value.start, value.end]);
  const buttonLabel = useMemo(() => getTimeRangeButtonLabel(parsedRange), [parsedRange]);
  const draftDurationLabel = useMemo(() => {
    const nextStart = parseAbsoluteTimeInput(absoluteInputDraft.start);
    const nextEnd = parseAbsoluteTimeInput(absoluteInputDraft.end);
    if (!nextStart || !nextEnd || nextEnd.getTime() <= nextStart.getTime()) {
      return "Invalid time range";
    }
    return getTimeRangeDurationLabel([nextStart, nextEnd]);
  }, [absoluteInputDraft.end, absoluteInputDraft.start]);
  function syncDraftsFromValue() {
    const nextParsedRange = parseAbsolutePickerRange(value) ?? buildDefaultTimeRange();
    setAbsoluteDraft({
      start: nextParsedRange[0],
      end: nextParsedRange[1]
    });
    setAbsoluteInputDraft({
      start: formatAbsoluteTimeInput(nextParsedRange[0]),
      end: formatAbsoluteTimeInput(nextParsedRange[1])
    });
    setActiveAbsoluteField(null);
    setRangeError("");
  }

  function openPicker() {
    syncDraftsFromValue();
    setIsOpen(true);
  }

  function closePicker() {
    syncDraftsFromValue();
    setIsOpen(false);
  }

  function applyDateRange(nextDateRange: [Date, Date], closeAfterApply = true) {
    const nextPickerRange = buildAbsolutePickerRange(nextDateRange);
    setRangeError("");
    onChange(nextPickerRange, nextDateRange);
    setAbsoluteDraft({
      start: nextDateRange[0],
      end: nextDateRange[1]
    });
    setAbsoluteInputDraft({
      start: formatAbsoluteTimeInput(nextDateRange[0]),
      end: formatAbsoluteTimeInput(nextDateRange[1])
    });
    if (closeAfterApply) {
      setIsOpen(false);
    }
  }

  function applyAbsoluteRange() {
    const nextStart = parseAbsoluteTimeInput(absoluteInputDraft.start);
    const nextEnd = parseAbsoluteTimeInput(absoluteInputDraft.end);
    if (!nextStart || !nextEnd) {
      setRangeError("Enter a valid absolute time");
      return;
    }
    if (nextEnd.getTime() <= nextStart.getTime()) {
      setRangeError("End time must be after start time");
      return;
    }
    setAbsoluteDraft({ start: nextStart, end: nextEnd });
    setAbsoluteInputDraft({
      start: formatAbsoluteTimeInput(nextStart),
      end: formatAbsoluteTimeInput(nextEnd)
    });
    applyDateRange([nextStart, nextEnd]);
  }

  function updateAbsoluteField(field: TimeRangeAbsoluteField, date: Date) {
    setActiveAbsoluteField(field);
    setRangeError("");
    setAbsoluteDraft((current) => ({
      ...current,
      [field]: date
    }));
    setAbsoluteInputDraft((current) => ({
      ...current,
      [field]: formatAbsoluteTimeInput(date)
    }));
  }

  function activateAbsoluteField(field: TimeRangeAbsoluteField) {
    setActiveAbsoluteField(field);
    setRangeError("");
  }

  function updateAbsoluteFieldText(field: TimeRangeAbsoluteField, nextValue: string) {
    setActiveAbsoluteField(field);
    setAbsoluteInputDraft((current) => ({
      ...current,
      [field]: nextValue
    }));
    if (rangeError) {
      setRangeError("");
    }
  }

  function commitAbsoluteFieldText(field: TimeRangeAbsoluteField) {
    const nextDate = parseAbsoluteTimeInput(absoluteInputDraft[field]);
    if (!nextDate) {
      setRangeError(`Enter a valid ${field} time`);
      return;
    }
    updateAbsoluteField(field, nextDate);
  }

  function shiftTimeWindow(direction: -1 | 1) {
    if (!parsedRange) {
      setRangeError("Cannot shift an invalid time range");
      return;
    }
    const wholeDaySpanDays = getWholeDaySpanDays(parsedRange);
    if (wholeDaySpanDays) {
      const nextStart = moment(parsedRange[0]).add(direction * wholeDaySpanDays, "days").startOf("day");
      const nextEnd = nextStart.clone().add(wholeDaySpanDays - 1, "days").endOf("day");
      const nextRange = [nextStart.toDate(), nextEnd.toDate()] as [Date, Date];
      onChange(buildAbsolutePickerRange(nextRange), nextRange);
      return;
    }
    const duration = parsedRange[1].getTime() - parsedRange[0].getTime();
    const nextRange = [
      new Date(parsedRange[0].getTime() + direction * duration),
      new Date(parsedRange[1].getTime() + direction * duration)
    ] as [Date, Date];
    onChange(buildAbsolutePickerRange(nextRange), nextRange);
  }

  function isDayPresetSelected(dayOffset: number) {
    if (!parsedRange || !isWholeDayDateRange(parsedRange)) {
      return false;
    }
    return moment(parsedRange[0]).isSame(moment().subtract(dayOffset, "day"), "day");
  }

  function isAbsoluteSpanSelected(minutes: number) {
    if (!parsedRange) {
      return false;
    }
    const expectedMs = minutes * 60 * 1000;
    const durationMs = parsedRange[1].getTime() - parsedRange[0].getTime();
    const endDeltaMs = Math.abs(Date.now() - parsedRange[1].getTime());
    return Math.abs(durationMs - expectedMs) < 2000 && endDeltaMs < 2 * 60 * 1000;
  }

  function handleAbsoluteFieldClick(field: TimeRangeAbsoluteField, event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    activateAbsoluteField(field);
  }

  const absoluteControls = (
    <div className="cv-query-time-absolute-block">
      <div className="cv-query-time-preset-row" aria-label="Absolute time shortcuts">
        <div className="cv-query-time-absolute-presets" aria-label="Absolute day presets">
          {ABSOLUTE_DAY_PRESET_RANGES.map((item) => {
            const selected = isDayPresetSelected(item.dayOffset);
            return (
              <button
                key={item.dayOffset}
                type="button"
                className={
                  selected
                    ? "cv-query-time-absolute-preset cv-query-time-absolute-preset--active"
                    : "cv-query-time-absolute-preset"
                }
                onClick={() => applyDateRange(buildDayOffsetTimeRange(item.dayOffset))}
                aria-label={item.label}
                aria-pressed={selected}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <span className="cv-query-time-preset-row__separator" aria-hidden="true" />
        <div className="cv-query-time-quick-grid" aria-label="Absolute span presets">
          {ABSOLUTE_SPAN_PRESETS.map((item) => {
            const selected = isAbsoluteSpanSelected(item.minutes);
            return (
              <button
                key={item.minutes}
                type="button"
                className={selected ? "cv-query-time-quick cv-query-time-quick--active" : "cv-query-time-quick"}
                onClick={() => applyDateRange(buildEndingNowTimeRange(item.minutes))}
                aria-label={item.label}
                title={item.label}
                aria-pressed={selected}
              >
                {item.shortLabel ?? item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="cv-query-time-absolute-range" aria-label="Absolute time range">
        <div
          className={
            activeAbsoluteField === "start"
              ? "cv-query-time-absolute-field cv-query-time-absolute-field--active"
              : "cv-query-time-absolute-field"
          }
          role="group"
          aria-label="Absolute start time field"
          onClick={(event) => handleAbsoluteFieldClick("start", event)}
        >
          <span className="cv-query-time-absolute-label">
            <span>From</span>
          </span>
          <div className="cv-query-time-absolute-input-wrap">
            <EuiFieldText
              aria-label="Absolute start time"
              className="cv-query-time-absolute-input"
              value={absoluteInputDraft.start}
              onFocus={() => activateAbsoluteField("start")}
              onChange={(event) => updateAbsoluteFieldText("start", event.target.value)}
              onBlur={() => commitAbsoluteFieldText("start")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitAbsoluteFieldText("start");
                }
              }}
              placeholder={ABSOLUTE_TIME_FORMAT}
              compressed
              fullWidth
            />
          </div>
        </div>
        <div
          className={
            activeAbsoluteField === "end"
              ? "cv-query-time-absolute-field cv-query-time-absolute-field--active"
              : "cv-query-time-absolute-field"
          }
          role="group"
          aria-label="Absolute end time field"
          onClick={(event) => handleAbsoluteFieldClick("end", event)}
        >
          <span className="cv-query-time-absolute-label">
            <span>To</span>
          </span>
          <div className="cv-query-time-absolute-input-wrap">
            <EuiFieldText
              aria-label="Absolute end time"
              className="cv-query-time-absolute-input"
              value={absoluteInputDraft.end}
              onFocus={() => activateAbsoluteField("end")}
              onChange={(event) => updateAbsoluteFieldText("end", event.target.value)}
              onBlur={() => commitAbsoluteFieldText("end")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitAbsoluteFieldText("end");
                }
              }}
              placeholder={ABSOLUTE_TIME_FORMAT}
              compressed
              fullWidth
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="cv-query-time-picker">
      <button
        type="button"
        className="cv-query-time-step"
        onClick={() => shiftTimeWindow(-1)}
        disabled={!parsedRange || isLoading}
        aria-label="Previous time range"
        title="Previous time range"
      >
        <EuiIcon type="chevronSingleLeft" size="s" aria-hidden="true" />
      </button>
      <EuiPopover
        anchorPosition="downCenter"
        button={
          <button
            type="button"
            className={isLoading ? "cv-query-time-button cv-query-time-button--loading" : "cv-query-time-button"}
            onClick={() => (isOpen ? closePicker() : openPicker())}
            aria-label={`Time range: ${buttonLabel}`}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
          >
            <EuiIcon type="calendar" size="s" aria-hidden="true" className="cv-query-time-button__icon" />
            <span className="cv-query-time-button__label">{buttonLabel}</span>
          </button>
        }
        closePopover={closePicker}
        display="block"
        isOpen={isOpen}
        ownFocus={false}
        panelClassName={
          activeAbsoluteField ? "cv-query-time-popover-panel cv-query-time-popover-panel--wide" : "cv-query-time-popover-panel"
        }
        panelPaddingSize="none"
        repositionOnScroll
      >
        <div
          className={
            activeAbsoluteField ? "cv-query-time-popover cv-query-time-popover--calendar-open" : "cv-query-time-popover"
          }
          role="dialog"
          aria-label="Select time range"
        >
          <div className="cv-query-time-section cv-query-time-section--quick">
            <div className="cv-query-time-body">
              <div className="cv-query-time-body__controls cv-query-time-body__controls--absolute-first">
                {absoluteControls}
              </div>
              {activeAbsoluteField ? (
                <div className="cv-query-time-absolute-calendar">
                  <EuiDatePicker
                    {...LOCALIZED_EUI_DATE_PICKER_PROPS}
                    inline
                    shadow={false}
                    selected={moment(absoluteDraft[activeAbsoluteField]).locale("en")}
                    onChange={(date) => {
                      if (!date?.isValid()) {
                        setRangeError(`Select a valid ${activeAbsoluteField} time`);
                        return;
                      }
                      updateAbsoluteField(activeAbsoluteField, date.toDate());
                    }}
                    maxDate={activeAbsoluteField === "start" ? moment(absoluteDraft.end).locale("en") : undefined}
                    minDate={activeAbsoluteField === "end" ? moment(absoluteDraft.start).locale("en") : undefined}
                    dateFormat={ABSOLUTE_TIME_FORMAT}
                    timeFormat="HH:mm"
                    timeIntervals={1}
                    showTimeSelect
                    calendarClassName="cv-query-date-picker-calendar cv-query-date-picker-calendar--inline"
                    compressed
                    locale="en"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="cv-query-time-popover__footer">
            <div
              className="cv-query-time-popover__hint"
              role={rangeError ? "alert" : undefined}
              aria-label={rangeError ? undefined : `Duration ${draftDurationLabel}`}
            >
              {rangeError || (draftDurationLabel === "Invalid time range" ? "" : `Span ${draftDurationLabel}`)}
            </div>
            <button type="button" className="cv-secondary-button" onClick={closePicker}>
              Cancel
            </button>
            <button
              type="button"
              className="cv-action-button"
              onClick={applyAbsoluteRange}
            >
              Update
            </button>
          </div>
        </div>
      </EuiPopover>
      <button
        type="button"
        className="cv-query-time-step"
        onClick={() => shiftTimeWindow(1)}
        disabled={!parsedRange || isLoading}
        aria-label="Next time range"
        title="Next time range"
      >
        <EuiIcon type="chevronSingleRight" size="s" aria-hidden="true" />
      </button>
      {rangeError ? (
        <div className="cv-query-time-error" role="alert">
          {rangeError}
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

function dateFromTimestampMilliseconds(milliseconds: number) {
  if (!Number.isFinite(milliseconds)) {
    return null;
  }
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateFromNumericTimestamp(value: number) {
  const absoluteValue = Math.abs(value);
  if (absoluteValue < 100_000_000_000) {
    return dateFromTimestampMilliseconds(value * 1000);
  }
  if (absoluteValue < 100_000_000_000_000) {
    return dateFromTimestampMilliseconds(value);
  }
  if (absoluteValue < 100_000_000_000_000_000) {
    return dateFromTimestampMilliseconds(value / 1000);
  }
  return dateFromTimestampMilliseconds(value / 1_000_000);
}

function toDateFromIntegerTimestampText(value: string) {
  if (!/^-?\d+$/.test(value)) {
    return null;
  }
  const timestamp = BigInt(value);
  const absoluteTimestamp = timestamp < 0n ? -timestamp : timestamp;
  let milliseconds: bigint;
  if (absoluteTimestamp < 100_000_000_000n) {
    milliseconds = timestamp * 1000n;
  } else if (absoluteTimestamp < 100_000_000_000_000n) {
    milliseconds = timestamp;
  } else if (absoluteTimestamp < 100_000_000_000_000_000n) {
    milliseconds = timestamp / 1000n;
  } else {
    milliseconds = timestamp / 1_000_000n;
  }
  return dateFromTimestampMilliseconds(Number(milliseconds));
}

function toDateFromLogValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number") {
    return toDateFromNumericTimestamp(value);
  }
  if (typeof value === "string") {
    const text = value.trim();
    const integerTimestampDate = toDateFromIntegerTimestampText(text);
    if (integerTimestampDate) {
      return integerTimestampDate;
    }
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
  return moment(date).locale("en").format(ABSOLUTE_TIME_FORMAT);
}

function formatHistogramTickLabel(value: unknown, spanSeconds: number) {
  const date = toDateFromLogValue(value);
  if (!date) {
    return String(value ?? "-");
  }
  const normalizedDate = moment(date).locale("en");
  if (spanSeconds > 2 * 365 * 24 * 60 * 60) {
    return normalizedDate.format("YYYY");
  }
  if (spanSeconds > 90 * 24 * 60 * 60) {
    return normalizedDate.format("MMM YYYY");
  }
  if (spanSeconds > 7 * 24 * 60 * 60) {
    return normalizedDate.format("MMM D");
  }
  if (spanSeconds > 24 * 60 * 60) {
    return normalizedDate.format("MMM D HH:mm");
  }
  return normalizedDate.format("HH:mm");
}

function formatHistogramCountTickLabel(value: unknown) {
  const count = Number(value);
  if (!Number.isFinite(count) || count === 0) {
    return "";
  }
  return formatCount(count);
}

function formatHistogramTooltipDate(value: number) {
  return moment.unix(value).locale("en").format("MMM D, YYYY HH:mm:ss");
}

function formatHistogramTooltipRange(from: number, to: number) {
  return `${formatHistogramTooltipDate(from)} - ${formatHistogramTooltipDate(to)}`;
}

function HistogramTooltip({ values, header }: CustomTooltipProps<HistogramChartDatum>) {
  const datum = values.find((item) => item.datum)?.datum;
  const count = Number(datum?.count ?? values[0]?.markValue ?? 0);
  const title = datum
    ? formatHistogramTooltipRange(datum.from, datum.to)
    : header?.formattedValue ?? "-";

  return (
    <div className="cv-query-histogram-tooltip">
      <div className="cv-query-histogram-tooltip__range">{title}</div>
      <div className="cv-query-histogram-tooltip__metric">
        <span className="cv-query-histogram-tooltip__dot" aria-hidden="true" />
        <strong>{formatCount(count)}</strong>
        <span>{formatHitsLabel(count)}</span>
      </div>
    </div>
  );
}

function formatHistogramBucketSizeLabel(intervalMs: number) {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return "";
  }
  const seconds = Math.round(intervalMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 60 * 60) {
    return `${Math.round(seconds / 60)}m`;
  }
  if (seconds < 24 * 60 * 60) {
    return `${Math.round(seconds / (60 * 60))}h`;
  }
  return `${Math.round(seconds / (24 * 60 * 60))}d`;
}

function getHistogramBucketIntervalMs(data: HistogramChartDatum[]) {
  if (data.length <= 1) {
    const item = data[0];
    return item ? Math.max(0, item.to - item.from) * 1000 : 0;
  }
  const intervals = data
    .slice(1)
    .map((item, index) => Math.max(0, item.from - data[index].from) * 1000)
    .filter((interval) => interval > 0)
    .sort((left, right) => left - right);
  return intervals[Math.floor(intervals.length / 2)] ?? 0;
}

function getHistogramSpanMs(data: HistogramChartDatum[], fallbackRange?: QueryDateRange) {
  const first = data[0];
  const last = data[data.length - 1];
  if (first && last) {
    return Math.max(0, last.to * 1000 - first.from * 1000);
  }
  if (!fallbackRange) {
    return 0;
  }
  return Math.max(0, fallbackRange[1].getTime() - fallbackRange[0].getTime());
}

function getAutoHistogramIntervalMs(data: HistogramChartDatum[], rawIntervalMs: number, fallbackRange?: QueryDateRange) {
  const spanMs = fallbackRange
    ? Math.max(0, fallbackRange[1].getTime() - fallbackRange[0].getTime())
    : getHistogramSpanMs(data, fallbackRange);
  if (spanMs <= 0) {
    return rawIntervalMs;
  }
  const targetIntervalMs = Math.ceil(spanMs / HISTOGRAM_AUTO_TARGET_BARS);
  const minimumIntervalMs = Math.max(rawIntervalMs, targetIntervalMs);
  const preferredInterval = HISTOGRAM_INTERVAL_OPTIONS.find(
    (option) => option.milliseconds && option.milliseconds >= minimumIntervalMs
  );
  return preferredInterval?.milliseconds ?? minimumIntervalMs;
}

function aggregateHistogramData(data: HistogramChartDatum[], intervalMs: number, anchorMs?: number) {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0 || data.length <= 1) {
    return data;
  }
  const anchor = Number.isFinite(anchorMs) ? Number(anchorMs) : data[0].from * 1000;
  const buckets = new Map<number, HistogramChartDatum>();
  data.forEach((item) => {
    const itemStartMs = item.from * 1000;
    const bucketStartMs = anchor + Math.floor((itemStartMs - anchor) / intervalMs) * intervalMs;
    const bucketEndMs = bucketStartMs + intervalMs;
    const current = buckets.get(bucketStartMs);
    if (current) {
      current.count += item.count;
      current.from = Math.min(current.from, Math.floor(bucketStartMs / 1000));
      current.to = Math.max(current.to, Math.ceil(bucketEndMs / 1000), item.to);
      return;
    }
    buckets.set(bucketStartMs, {
      x: bucketStartMs,
      count: item.count,
      from: Math.floor(bucketStartMs / 1000),
      to: Math.max(Math.ceil(bucketEndMs / 1000), item.to)
    });
  });
  return Array.from(buckets.values()).sort((left, right) => left.from - right.from);
}

function buildLoadedLogsHistogramData(
  rows: NormalizedLogRow[],
  range: QueryDateRange,
  intervalMs: number
): HistogramChartDatum[] {
  if (!range || rows.length === 0 || !Number.isFinite(intervalMs) || intervalMs <= 0) {
    return [];
  }
  const startMs = range[0].getTime();
  const endMs = range[1].getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return [];
  }
  const bucketCount = Math.ceil((endMs - startMs) / intervalMs);
  if (bucketCount <= 0 || bucketCount > 160) {
    return [];
  }
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStartMs = startMs + index * intervalMs;
    const bucketEndMs = Math.min(endMs, bucketStartMs + intervalMs);
    return {
      x: bucketStartMs,
      count: 0,
      from: Math.floor(bucketStartMs / 1000),
      to: Math.ceil(bucketEndMs / 1000)
    };
  });
  rows.forEach((row) => {
    const timeMs = getLogRowTimeMs(row);
    if (timeMs === null || timeMs < startMs || timeMs > endMs) {
      return;
    }
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((timeMs - startMs) / intervalMs)));
    const bucket = buckets[index];
    if (bucket) {
      bucket.count += 1;
    }
  });
  return buckets.some((item) => item.count > 0) ? buckets : [];
}

function findHistogramSelectionFromExtent(data: HistogramChartDatum[], extent: [number, number] | undefined) {
  if (!extent || data.length === 0) {
    return null;
  }
  const fromMs = Math.min(extent[0], extent[1]);
  const toMs = Math.max(extent[0], extent[1]);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    return null;
  }
  const startIndex = data.findIndex((item) => item.to * 1000 > fromMs);
  if (startIndex === -1) {
    return null;
  }
  let endIndex = startIndex;
  for (let index = data.length - 1; index >= startIndex; index -= 1) {
    if (data[index].from * 1000 < toMs) {
      endIndex = index;
      break;
    }
  }
  return {
    anchorIndex: startIndex,
    hoverIndex: endIndex
  };
}

function clampHistogramSelectionPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

type HistogramSelectionOverlayProps = {
  range: HistogramSelectionRange;
  style?: CSSProperties;
  disabled?: boolean;
  onZoom: () => void;
  onCancel: () => void;
};

export const HistogramSelectionOverlay = forwardRef<HTMLDivElement, HistogramSelectionOverlayProps>(
  function HistogramSelectionOverlay({ range, style, disabled = false, onZoom, onCancel }, ref) {
    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) {
        onZoom();
      }
    }

    function handleClick(event: MouseEvent<HTMLDivElement>) {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) {
        onZoom();
      }
    }

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        className="cv-query-histogram__selection-overlay"
        style={style}
        aria-label={`Selected histogram range: ${formatCount(range.count)} ${formatHitsLabel(range.count)}, ${formatHistogramTooltipRange(range.from, range.to)}`}
        aria-disabled={disabled}
        title="Click or press Enter to zoom in. Press Escape to cancel."
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />
    );
  }
);

function isPresentLogValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    return text !== "" && text !== "[null]" && text !== "null" && text !== "nil";
  }
  return true;
}

function firstPresentValue(row: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = row[key];
    if (isPresentLogValue(value)) {
      return value;
    }
  }
  return undefined;
}

function firstPresentEntry(row: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = row[key];
    if (isPresentLogValue(value)) {
      return { key, value };
    }
  }
  return null;
}

function normalizeLogLevelText(value: unknown) {
  return stripAnsi(String(value ?? "")).trim().toLowerCase();
}

function buildLoadedFieldStatsItems(rows: NormalizedLogRow[], displayField: string, fieldRef: QueryFieldRef, limit = 10) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const value =
      row.parsed[fieldRef.fieldKey] ??
      row.parsed[fieldRef.path] ??
      row.parsed[displayField] ??
      (fieldRef.fieldKey === row.levelField || displayField === "level" ? row.levelText : undefined) ??
      (displayField === "msg" ? row.messageText : undefined);
    if (!isPresentLogValue(value) || (value && typeof value === "object")) {
      return;
    }
    const text = formatLogDetailValue(value).trim();
    if (!text || text === "—" || text.length > 256) {
      return;
    }
    counts.set(text, (counts.get(text) ?? 0) + 1);
  });
  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  const items = Array.from(counts.entries())
    .sort(([leftValue, leftCount], [rightValue, rightCount]) => rightCount - leftCount || leftValue.localeCompare(rightValue))
    .slice(0, limit)
    .map(([value, count]) => ({
      value,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  return { total, items };
}

function normalizeLogRow(row: Record<string, unknown>): NormalizedLogRow {
  const parsed = parseNestedJsonFields(row);
  const merged = { ...row, ...parsed };
  const timeValue = firstPresentValue(merged, LOG_TIME_FIELD_KEYS);
  const levelEntry = firstPresentEntry(merged, LOG_LEVEL_FIELD_KEYS);
  const levelValue = levelEntry?.value;
  const messageValue = firstPresentValue(merged, ["message", "msg", "content", "body", "_raw_log_"]);
  return {
    original: row,
    parsed: merged,
    timeText: formatClientDateTime(timeValue),
    levelField: levelEntry?.key,
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

function getLogLevelTone(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "—" || normalized === "-") {
    return "";
  }
  if (["fatal", "panic", "critical", "crit", "error", "err"].some((item) => normalized.includes(item))) {
    return "error";
  }
  if (["warning", "warn"].some((item) => normalized.includes(item))) {
    return "warning";
  }
  if (["info", "notice"].some((item) => normalized.includes(item))) {
    return "info";
  }
  if (["debug", "trace", "verbose"].some((item) => normalized.includes(item))) {
    return "debug";
  }
  return "default";
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

function isUniqueFieldStatsField(field: string) {
  const normalized = field.trim().toLowerCase();
  return FIELD_STATS_UNIQUE_FIELDS.includes(normalized as (typeof FIELD_STATS_UNIQUE_FIELDS)[number]);
}

function isTimeFieldStatsField(field: string) {
  const normalized = field
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
  if (!normalized) {
    return false;
  }
  if (LOG_TIME_FIELD_KEYS.includes(normalized as (typeof LOG_TIME_FIELD_KEYS)[number])) {
    return true;
  }
  const segments = normalized.split(/[.[\]/]+/).filter(Boolean);
  return segments.some((segment) => {
    const trimmed = segment.replace(/^_+|_+$/g, "");
    if (!trimmed) {
      return false;
    }
    return (
      trimmed === "date" ||
      /^time(_[a-z0-9]+)?$/.test(trimmed) ||
      /(^|_)(time|ts|timestamp|datetime|date)(_|$)/.test(trimmed) ||
      /^(created|updated|start|end|event|log|ingest|receive|received)_at$/.test(trimmed)
    );
  });
}

function canShowFieldStatsForField(field: string) {
  return Boolean(field) && !/^_?raw/i.test(field) && !isUniqueFieldStatsField(field) && !isTimeFieldStatsField(field);
}

function canOpenFieldStats(field: string, value: unknown) {
  return canShowFieldStatsForField(field) && !(value && typeof value === "object");
}

function canStartAIAnalysisFromField(field: string, value: unknown) {
  return canCreateConditionFromDetailValue(field, value);
}

function isUnsupportedLogContentQueryError(message: string) {
  return (
    (message.includes("未配置日志内容字段") &&
      (message.includes("全局匹配") || message.includes("日志内容字段查询"))) ||
    (message.includes("no log content field") && message.includes("All fields"))
  );
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

const RAW_LOG_DETAIL_KEYS = ["_raw_log_", "_raw_log", "_raw", "raw_log", "raw", "rawLogJson"];
const LOG_DETAIL_MESSAGE_FIELD_KEYS = ["message", "msg", "content", "body"] as const;

function isRawLogDetailParent(parentKey: string) {
  const normalized = parentKey.trim().toLowerCase();
  return RAW_LOG_DETAIL_KEYS.some((key) => key.toLowerCase() === normalized);
}

function getLogDetailMessageText(row: NormalizedLogRow) {
  const messageEntry = getLogDetailMessageEntry(row);
  const text = formatLogDetailValue(messageEntry.value);
  const normalized = text.trim();
  return normalized && normalized !== "—" ? normalized : row.messageText;
}

function getLogDetailMessageEntry(row: NormalizedLogRow) {
  return firstPresentEntry(row.parsed, LOG_DETAIL_MESSAGE_FIELD_KEYS) ?? { key: "message", value: row.messageText };
}

function getVisibleLogDetailEntries(row: NormalizedLogRow) {
  return Object.entries(row.parsed)
    .filter(([, value]) => isPresentLogValue(value))
    .sort(([left], [right]) => compareLogDetailFields(left, right));
}

function isPromotedLogDetailMessageField(key: string, value: unknown, detailMessageText: string) {
  if (!LOG_DETAIL_MESSAGE_FIELD_KEYS.includes(key as (typeof LOG_DETAIL_MESSAGE_FIELD_KEYS)[number])) {
    return false;
  }
  return formatLogDetailValue(value).trim() === detailMessageText.trim();
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
  const normalized = field.trim().toLowerCase();
  return /^_time(_[a-z]+)?_$/.test(normalized) || normalized === "time" || normalized === "timestamp" || normalized === "ts";
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
  const value = firstPresentValue(row.parsed, LOG_TIME_FIELD_KEYS);
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
      return normalizeLegacyResultColumnKeys(keys);
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as { version?: unknown; keys?: unknown };
      if (record.version === RESULT_COLUMN_STORAGE_VERSION && Array.isArray(record.keys)) {
        const keys = normalizeResultColumnKeys(record.keys.map((item) => String(item)).filter(Boolean));
        return keys.length > 0 ? keys : [...DEFAULT_RESULT_COLUMN_KEYS];
      }
      if (Array.isArray(record.keys)) {
        return normalizeLegacyResultColumnKeys(record.keys.map((item) => String(item)).filter(Boolean));
      }
    }
  } catch {
    return [...DEFAULT_RESULT_COLUMN_KEYS];
  }
  return [...DEFAULT_RESULT_COLUMN_KEYS];
}

function normalizeResultColumnKey(key: string) {
  return key === LEGACY_CONTAINER_NAME_RESULT_COLUMN_KEY ? CONTAINER_NAME_RESULT_COLUMN_KEY : key;
}

function normalizeResultColumnKeys(keys: string[]) {
  return Array.from(new Set(keys.map((key) => normalizeResultColumnKey(key)).filter(Boolean)));
}

function normalizeLegacyResultColumnKeys(keys: string[]) {
  const normalizedKeys = normalizeResultColumnKeys(keys);
  if (normalizedKeys.length === 0) {
    return [...DEFAULT_RESULT_COLUMN_KEYS];
  }
  if (
    normalizedKeys.length === LEGACY_DEFAULT_RESULT_COLUMN_KEYS.length &&
    normalizedKeys.every((key, index) => key === LEGACY_DEFAULT_RESULT_COLUMN_KEYS[index])
  ) {
    return [...DEFAULT_RESULT_COLUMN_KEYS];
  }
  const defaultSet = new Set<string>(DEFAULT_RESULT_COLUMN_KEYS);
  const customKeys = normalizedKeys.filter(
    (key) => !defaultSet.has(key) && !isBuiltinResultFieldAlias(key) && !isLowPriorityResultField(key)
  );
  return Array.from(new Set([...DEFAULT_RESULT_COLUMN_KEYS, ...customKeys]));
}

function getFieldPriorityIndex(field: string) {
  const index = RESULT_COLUMN_FIELD_PRIORITY.indexOf(field as (typeof RESULT_COLUMN_FIELD_PRIORITY)[number]);
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

function getMetaFieldPriorityIndex(field: string) {
  const index = RESULT_COLUMN_META_FIELD_PRIORITY.indexOf(field as (typeof RESULT_COLUMN_META_FIELD_PRIORITY)[number]);
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

function getLogDetailFieldPriorityIndex(field: string) {
  const index = LOG_DETAIL_FIELD_PRIORITY.indexOf(field as (typeof LOG_DETAIL_FIELD_PRIORITY)[number]);
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

function isLowPriorityResultField(field: string) {
  return getMetaFieldPriorityIndex(field) !== Number.POSITIVE_INFINITY;
}

function isBuiltinResultFieldAlias(field: string) {
  return RESULT_BUILTIN_FIELD_ALIASES.includes(field as (typeof RESULT_BUILTIN_FIELD_ALIASES)[number]);
}

function normalizeResultColumnOptionField(field: string) {
  return normalizeResultColumnKey(field);
}

function compareResultFieldColumns(left: string, right: string) {
  const leftIsMeta = isLowPriorityResultField(left);
  const rightIsMeta = isLowPriorityResultField(right);
  if (leftIsMeta !== rightIsMeta) {
    return leftIsMeta ? 1 : -1;
  }
  const leftPriority = leftIsMeta ? getMetaFieldPriorityIndex(left) : getFieldPriorityIndex(left);
  const rightPriority = rightIsMeta ? getMetaFieldPriorityIndex(right) : getFieldPriorityIndex(right);
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  return left.localeCompare(right);
}

function compareLogDetailFields(left: string, right: string) {
  const leftPriority = getLogDetailFieldPriorityIndex(left);
  const rightPriority = getLogDetailFieldPriorityIndex(right);
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  const leftIsMeta = isLowPriorityResultField(left);
  const rightIsMeta = isLowPriorityResultField(right);
  if (leftIsMeta !== rightIsMeta) {
    return leftIsMeta ? 1 : -1;
  }
  if (leftIsMeta && rightIsMeta) {
    return getMetaFieldPriorityIndex(left) - getMetaFieldPriorityIndex(right);
  }
  return left.localeCompare(right);
}

function getResultColumnLayoutClass(columnKey: string) {
  if (columnKey === "__time" || isLogTimeField(columnKey)) {
    return "cv-query-result-col--time";
  }
  if (columnKey === "__level" || ["level", "lv", "severity", "log_level"].includes(columnKey)) {
    return "cv-query-result-col--level";
  }
  if (["tid", "trace_id", "traceId", "span_id", "spanId"].includes(columnKey)) {
    return "cv-query-result-col--id";
  }
  if (
    columnKey === "__message" ||
    ["msg", "message", "content", "body"].includes(columnKey) ||
    columnKey.toLowerCase().includes("message")
  ) {
    return "cv-query-result-col--message";
  }
  if (["error", "exception", "stack", "stacktrace", "trace"].includes(columnKey.toLowerCase())) {
    return "cv-query-result-col--wide";
  }
  if (isLowPriorityResultField(columnKey)) {
    return "cv-query-result-col--meta";
  }
  return "cv-query-result-col--field";
}

function getResultColumnTextMaxLength(columnKey: string) {
  const layoutClass = getResultColumnLayoutClass(columnKey);
  if (layoutClass === "cv-query-result-col--message") {
    return 220;
  }
  if (layoutClass === "cv-query-result-col--wide") {
    return 180;
  }
  return 96;
}

function getResultColumnMinWidth(columnKey: string) {
  const layoutClass = getResultColumnLayoutClass(columnKey);
  if (layoutClass === "cv-query-result-col--time") {
    return 132;
  }
  if (layoutClass === "cv-query-result-col--level") {
    return 64;
  }
  if (layoutClass === "cv-query-result-col--id") {
    return 96;
  }
  if (layoutClass === "cv-query-result-col--message") {
    return 220;
  }
  if (layoutClass === "cv-query-result-col--wide") {
    return 160;
  }
  if (normalizeResultColumnKey(columnKey) === CONTAINER_NAME_RESULT_COLUMN_KEY) {
    return 176;
  }
  return 104;
}

function getResultColumnMaxWidth(columnKey: string) {
  const layoutClass = getResultColumnLayoutClass(columnKey);
  if (layoutClass === "cv-query-result-col--message" || layoutClass === "cv-query-result-col--wide") {
    return 720;
  }
  return 520;
}

function getDefaultResultColumnWidth(columnKey: string) {
  const layoutClass = getResultColumnLayoutClass(columnKey);
  if (layoutClass === "cv-query-result-col--time") {
    return 152;
  }
  if (layoutClass === "cv-query-result-col--level") {
    return 78;
  }
  if (layoutClass === "cv-query-result-col--id") {
    return 136;
  }
  if (layoutClass === "cv-query-result-col--message") {
    return 360;
  }
  if (normalizeResultColumnKey(columnKey) === CONTAINER_NAME_RESULT_COLUMN_KEY) {
    return 180;
  }
  if (columnKey === "error") {
    return 196;
  }
  if (layoutClass === "cv-query-result-col--wide") {
    return 220;
  }
  return 156;
}

function clampResultColumnWidth(columnKey: string, width: number) {
  if (!Number.isFinite(width)) {
    return getDefaultResultColumnWidth(columnKey);
  }
  return Math.round(Math.max(getResultColumnMinWidth(columnKey), Math.min(getResultColumnMaxWidth(columnKey), width)));
}

function getResultColumnWidth(columnKey: string, widths?: Record<string, number>) {
  const customWidth = widths?.[columnKey];
  if (customWidth !== undefined) {
    return clampResultColumnWidth(columnKey, customWidth);
  }
  return getDefaultResultColumnWidth(columnKey);
}

function writeResultColumnKeys(storageKey: string, columnKeys: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      version: RESULT_COLUMN_STORAGE_VERSION,
      keys: columnKeys
    })
  );
}

function readResultColumnWidths(storageKey: string) {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, number>>((result, [key, value]) => {
      const normalizedKey = normalizeResultColumnKey(key);
      const width = Number(value);
      if (normalizedKey && Number.isFinite(width)) {
        result[normalizedKey] = width;
      }
      return result;
    }, {});
  } catch {
    return {};
  }
}

function writeResultColumnWidths(storageKey: string, widths: Record<string, number>) {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = Object.entries(widths).reduce<Record<string, number>>((result, [key, value]) => {
    const normalizedKey = normalizeResultColumnKey(key);
    const width = Number(value);
    if (normalizedKey && Number.isFinite(width)) {
      result[normalizedKey] = width;
    }
    return result;
  }, {});
  if (Object.keys(normalized).length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(normalized));
}

function readOpenLogTabs(storageKey: string): Array<Pick<OpenLogTab, "databaseName" | "tableName">> {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const seen = new Set<string>();
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const row = item as Record<string, unknown>;
        const databaseName = String(row.databaseName ?? "").trim();
        const tableName = String(row.tableName ?? "").trim();
        const key = `${databaseName}.${tableName}`;
        if (!databaseName || !tableName || seen.has(key)) {
          return null;
        }
        seen.add(key);
        return { databaseName, tableName };
      })
      .filter((item): item is Pick<OpenLogTab, "databaseName" | "tableName"> => Boolean(item));
  } catch {
    return [];
  }
}

function writeOpenLogTabs(storageKey: string, tabs: OpenLogTab[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    storageKey,
    JSON.stringify(tabs.map((tab) => ({ databaseName: tab.databaseName, tableName: tab.tableName })))
  );
}

function createConditionDraft(): QueryFilterCondition {
  return {
    id: `cond_modal_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    field: GLOBAL_MATCH_FIELD,
    operator: "like",
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

const EMPTY_QUERY_PREVIEW = "No filters";
const INVALID_QUERY_PREVIEW_PREFIX = "Invalid filter";
const linkQueryWindowOptions = [
  { label: "±1 minute", value: "1" },
  { label: "±5 minutes", value: "5" },
  { label: "±15 minutes", value: "15" },
  { label: "±30 minutes", value: "30" }
] as const;

function getCompatibleOperatorOptions(field: string, valueType: QueryFilterValueType) {
  if (isGlobalMatchField(field)) {
    return queryOperatorOptions.filter((item) => item.value === "like" || item.value === "not like");
  }
  if (valueType === "string") {
    return queryOperatorOptions;
  }
  return queryOperatorOptions.filter((item) => item.value !== "like" && item.value !== "not like");
}

function normalizeConditionOperator(field: string, operator: QueryFilterCondition["operator"], valueType: QueryFilterValueType) {
  const operatorOptions = getCompatibleOperatorOptions(field, valueType);
  return operatorOptions.some((item) => item.value === operator) ? operator : operatorOptions[0].value;
}

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
            <strong>Start</strong>
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
    <section className="cv-query-trace-panel" aria-label="Trace links">
      <div className="cv-query-trace-panel__header">
        <div>
          <strong>Trace links</strong>
          <span>Grouped by `_key` / traceId and rendered from Jaeger JSON</span>
        </div>
        <span>{groups.length} {groups.length === 1 ? "trace" : "traces"}</span>
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

export default function QueryPage({ shareMode = false }: { shareMode?: boolean }) {
  const privateLite = isPrivateLiteEdition();
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
    if (!databaseName || !tableName) {
      return undefined;
    }
    return {
      instanceId: Number.isFinite(instanceId) && instanceId > 0 ? instanceId : undefined,
      databaseName,
      tableName
    };
  }, [initialSearchParams]);
  const defaultRange = useMemo(() => buildInitialTimeRangeFromSearchParams(initialSearchParams), [initialSearchParams]);
  const initialPage = useMemo(() => readPositiveIntSearchParam(initialSearchParams, "page"), [initialSearchParams]);
  const initialPageSize = useMemo(() => readPositiveIntSearchParam(initialSearchParams, "size"), [initialSearchParams]);
  const [timeRange, setTimeRange] = useState<QueryDateRange>(defaultRange);
  const [absolutePickerRange, setAbsolutePickerRange] = useState<QueryAbsolutePickerRange>(() =>
    buildInitialAbsolutePickerRange(initialSearchParams, defaultRange)
  );
  const [timeRangeHistory, setTimeRangeHistory] = useState<Array<[Date, Date]>>([]);
  const startTime = timeRange ? formatDateTimeLocalValue(timeRange[0]) : "";
  const endTime = timeRange ? formatDateTimeLocalValue(timeRange[1]) : "";
  const workspace = useQueryWorkspace(startTime, endTime, initialTreeTarget, {
    initialPage,
    initialPageSize
  });
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [fieldCatalogOpen, setFieldCatalogOpen] = useState(false);
  const [fieldCatalogSearch, setFieldCatalogSearch] = useState("");
  const [activeFieldCatalogGroupKey, setActiveFieldCatalogGroupKey] = useState<QueryFieldCatalogGroupKey>("log");
  const [resultColumnKeys, setResultColumnKeys] = useState<string[]>([...DEFAULT_RESULT_COLUMN_KEYS]);
  const [resultColumnWidths, setResultColumnWidths] = useState<Record<string, number>>({});
  const [resultColumnMenuKey, setResultColumnMenuKey] = useState<string | null>(null);
  const [draggedResultColumnKey, setDraggedResultColumnKey] = useState<string | null>(null);
  const [resultColumnDropTargetKey, setResultColumnDropTargetKey] = useState<string | null>(null);
  const [activeResultColumnResize, setActiveResultColumnResize] = useState<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [expandedLogIndexes, setExpandedLogIndexes] = useState<Set<number>>(() => new Set());
  const [expandedLogDisplayMode, setExpandedLogDisplayMode] = useState<"fields" | "json">("fields");
  const [expandedLogNestedKeys, setExpandedLogNestedKeys] = useState<Set<string>>(() => new Set());
  const [expandedLogMetadataIndexes, setExpandedLogMetadataIndexes] = useState<Set<number>>(() => new Set());
  const [resultBulkExpandLoading, setResultBulkExpandLoading] = useState(false);
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [conditionModalMode, setConditionModalMode] = useState<QueryConditionModalMode>("create");
  const [conditionDraft, setConditionDraft] = useState<QueryFilterCondition | null>(null);
  const [inlineConditionDraft, setInlineConditionDraft] = useState<QueryFilterCondition>(() => createConditionDraft());
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [saveQueryModalOpen, setSaveQueryModalOpen] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState("");
  const [savedQueryMenuOpen, setSavedQueryMenuOpen] = useState(false);
  const [savedQuerySearch, setSavedQuerySearch] = useState("");
  const [queryHistoryMenuOpen, setQueryHistoryMenuOpen] = useState(false);
  const [queryHistorySearch, setQueryHistorySearch] = useState("");
  const [queryPreviewOpen, setQueryPreviewOpen] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");
  const [queryInputFocused, setQueryInputFocused] = useState(false);
  const [filterComposerOpen, setFilterComposerOpen] = useState(false);
  const [inlineFieldPickerOpen, setInlineFieldPickerOpen] = useState(false);
  const [inlineFieldPickerActiveIndex, setInlineFieldPickerActiveIndex] = useState(0);
  const [linkQueryAnchor, setLinkQueryAnchor] = useState<LinkQueryAnchor | null>(null);
  const [linkQueryWindowMinutes, setLinkQueryWindowMinutes] = useState(5);
  const [linkQuerySelectedTableIds, setLinkQuerySelectedTableIds] = useState<number[]>([]);
  const [tableAutoQueryRequest, setTableAutoQueryRequest] = useState<TableAutoQueryRequest | null>(null);
  const [openLogTabs, setOpenLogTabs] = useState<OpenLogTab[]>([]);
  const [conditionsByLogTab, setConditionsByLogTab] = useState<Record<number, QueryFilterCondition[]>>({});
  const [fieldStatsState, setFieldStatsState] = useState<QueryFieldStatsState | null>(null);
  const [inlineFieldStatsByKey, setInlineFieldStatsByKey] = useState<Record<string, QueryFieldStatsState>>({});
  const [expandedInlineFieldStatsKeys, setExpandedInlineFieldStatsKeys] = useState<Set<string>>(() => new Set());
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
    ariaLabel: "Node actions",
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
  const openLogTabsRestoredRef = useRef(false);
  const openLogTabsHydratingRef = useRef(false);
  const resultStackRef = useRef<HTMLDivElement | null>(null);
  const resultTableHeaderScrollRef = useRef<HTMLDivElement | null>(null);
  const resultTableScrollRef = useRef<HTMLDivElement | null>(null);
  const queryUtilityActionsRef = useRef<HTMLDivElement | null>(null);
  const fieldCatalogRef = useRef<HTMLDivElement | null>(null);
  const fieldStatsPanelRef = useRef<HTMLElement | null>(null);
  const fieldStatsAbortControllerRef = useRef<AbortController | null>(null);
  const inlineFieldStatsAbortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const resultBulkExpandTimerRef = useRef<number | null>(null);
  const resultBulkExpandFinishTimerRef = useRef<number | null>(null);
  const linkQueryPanelRef = useRef<HTMLElement | null>(null);
  const fieldCatalogSearchInputRef = useRef<HTMLInputElement | null>(null);
  const inlineConditionValueInputRef = useRef<HTMLInputElement | null>(null);
  const conditionModalBackdropPressedRef = useRef(false);
  const filterComposerRef = useRef<HTMLDivElement | null>(null);
  const queryHistorySearchInputRef = useRef<HTMLInputElement | null>(null);
  const savedQuerySearchInputRef = useRef<HTMLInputElement | null>(null);
  const sourceSearchInputRef = useRef<HTMLInputElement | null>(null);
  const sourcePickerRef = useRef<HTMLDivElement | null>(null);
  const inlineFieldPickerRef = useRef<HTMLLabelElement | null>(null);
  const histogramSelectionOverlayRef = useRef<HTMLDivElement | null>(null);
  const histogramSelectionRef = useRef<HistogramSelection | null>(null);
  const [histogramSelection, setHistogramSelection] = useState<HistogramSelection | null>(null);
  const [histogramCollapsed, setHistogramCollapsed] = useState(false);
  const [histogramInterval, setHistogramInterval] = useState<HistogramIntervalValue>("auto");

  useEffect(() => {
    document.documentElement.classList.add(QUERY_OVERSCROLL_GUARD_CLASS);
    document.body.classList.add(QUERY_OVERSCROLL_GUARD_CLASS);

    function handleDocumentWheel(event: globalThis.WheelEvent) {
      if (shouldGuardHorizontalWheel(event)) {
        event.preventDefault();
      }
    }

    document.addEventListener("wheel", handleDocumentWheel, { capture: true, passive: false });
    return () => {
      document.removeEventListener("wheel", handleDocumentWheel, { capture: true });
      document.documentElement.classList.remove(QUERY_OVERSCROLL_GUARD_CLASS);
      document.body.classList.remove(QUERY_OVERSCROLL_GUARD_CLASS);
    };
  }, []);

  useEffect(() => {
    if (
      !queryHistoryMenuOpen &&
      !savedQueryMenuOpen &&
      !fieldCatalogOpen &&
      !sourcePickerOpen &&
      !filterComposerOpen &&
      !inlineFieldPickerOpen &&
      !fieldStatsState &&
      !linkQueryAnchor
    ) {
      return;
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (
        (queryHistoryMenuOpen || savedQueryMenuOpen) &&
        target instanceof Element &&
        !queryUtilityActionsRef.current?.contains(target) &&
        !target.closest(".cv-query-saved__popover-panel")
      ) {
        setQueryHistoryMenuOpen(false);
        setSavedQueryMenuOpen(false);
      }
      if (
        fieldCatalogOpen &&
        target instanceof Element &&
        !fieldCatalogRef.current?.contains(target) &&
        !target.closest(".cv-query-fields-panel__popover-panel")
      ) {
        closeFieldCatalogPanel();
      }
      if (
        sourcePickerOpen &&
        target instanceof Element &&
        !sourcePickerRef.current?.contains(target) &&
        !target.closest(".cv-query-source-popover-panel") &&
        !target.closest(".cv-context-menu")
      ) {
        setSourcePickerOpen(false);
        closeInstanceContextMenu();
      }
      if (inlineFieldPickerOpen && target instanceof Element && !inlineFieldPickerRef.current?.contains(target)) {
        setInlineFieldPickerOpen(false);
      }
      if (
        filterComposerOpen &&
        target instanceof Element &&
        !filterComposerRef.current?.contains(target) &&
        !target.closest(".cv-query-filter-composer-popover-panel") &&
        !target.closest(".cv-query-compact-select__panel")
      ) {
        cancelInlineCondition();
      }
      if (fieldStatsState && target instanceof Element && !fieldStatsPanelRef.current?.contains(target)) {
        closeFieldStatsModal();
      }
      if (linkQueryAnchor && target instanceof Element && !linkQueryPanelRef.current?.contains(target)) {
        closeLinkQueryModal();
      }
    }

    function handleDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setQueryHistoryMenuOpen(false);
      setSavedQueryMenuOpen(false);
      closeFieldCatalogPanel();
      setSourcePickerOpen(false);
      if (filterComposerOpen) {
        cancelInlineCondition();
      }
      closeFieldStatsModal();
      closeLinkQueryModal();
      closeInstanceContextMenu();
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [
    fieldStatsState,
    fieldCatalogOpen,
    filterComposerOpen,
    inlineFieldPickerOpen,
    linkQueryAnchor,
    queryHistoryMenuOpen,
    savedQueryMenuOpen,
    sourcePickerOpen
  ]);

  useEffect(() => {
    if (!filterComposerOpen) {
      return;
    }
    const focusTimer = window.setTimeout(() => {
      inlineConditionValueInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [filterComposerOpen]);

  const normalizedLogRows = useMemo(
    () => (workspace.logs?.logs ?? []).map((row) => normalizeLogRow(row)),
    [workspace.logs]
  );
  const rawHistogramChartData = useMemo<HistogramChartDatum[]>(
    () =>
      workspace.charts.map((item) => ({
        x: item.from * 1000,
        count: item.count,
        from: item.from,
        to: item.to
      })),
    [workspace.charts]
  );
  const rawHistogramBucketIntervalMs = useMemo(
    () => getHistogramBucketIntervalMs(rawHistogramChartData),
    [rawHistogramChartData]
  );
  const autoHistogramIntervalMs = useMemo(
    () => getAutoHistogramIntervalMs(rawHistogramChartData, rawHistogramBucketIntervalMs, timeRange),
    [rawHistogramBucketIntervalMs, rawHistogramChartData, timeRange]
  );
  const autoHistogramBucketSizeLabel = useMemo(
    () => formatHistogramBucketSizeLabel(autoHistogramIntervalMs),
    [autoHistogramIntervalMs]
  );
  const availableHistogramIntervalOptions = useMemo(() => {
    if (rawHistogramBucketIntervalMs <= 0) {
      return HISTOGRAM_INTERVAL_OPTIONS;
    }
    return HISTOGRAM_INTERVAL_OPTIONS.filter(
      (option) => !option.milliseconds || option.milliseconds >= rawHistogramBucketIntervalMs
    );
  }, [rawHistogramBucketIntervalMs]);
  useEffect(() => {
    if (availableHistogramIntervalOptions.some((option) => option.value === histogramInterval)) {
      return;
    }
    setHistogramInterval("auto");
    clearHistogramSelection();
  }, [availableHistogramIntervalOptions, histogramInterval]);
  const selectedHistogramIntervalOption = useMemo(
    () =>
      HISTOGRAM_INTERVAL_OPTIONS.find((option) => option.value === histogramInterval) ??
      HISTOGRAM_INTERVAL_OPTIONS[0],
    [histogramInterval]
  );
  const effectiveHistogramIntervalMs =
    histogramInterval === "auto"
      ? autoHistogramIntervalMs
      : selectedHistogramIntervalOption.milliseconds ?? rawHistogramBucketIntervalMs;
  const loadedLogsHistogramChartData = useMemo(
    () => buildLoadedLogsHistogramData(normalizedLogRows, timeRange, effectiveHistogramIntervalMs),
    [effectiveHistogramIntervalMs, normalizedLogRows, timeRange]
  );
  const shouldUseLoadedLogsHistogram =
    loadedLogsHistogramChartData.length > 0 &&
    (rawHistogramChartData.length <= 1 || !rawHistogramChartData.some((item) => item.count > 0));
  const baseHistogramChartData = shouldUseLoadedLogsHistogram
    ? loadedLogsHistogramChartData
    : rawHistogramChartData;
  const histogramChartData = useMemo<HistogramChartDatum[]>(() => {
    if (!effectiveHistogramIntervalMs || effectiveHistogramIntervalMs <= rawHistogramBucketIntervalMs) {
      return baseHistogramChartData;
    }
    return aggregateHistogramData(baseHistogramChartData, effectiveHistogramIntervalMs, timeRange?.[0].getTime());
  }, [baseHistogramChartData, effectiveHistogramIntervalMs, rawHistogramBucketIntervalMs, timeRange]);
  const histogramBucketIntervalMs = useMemo(
    () => getHistogramBucketIntervalMs(histogramChartData),
    [histogramChartData]
  );
  const histogramBucketSizeLabel = useMemo(
    () => formatHistogramBucketSizeLabel(histogramBucketIntervalMs),
    [histogramBucketIntervalMs]
  );
  const histogramXDomain = useMemo(() => {
    const first = histogramChartData[0];
    const last = histogramChartData[histogramChartData.length - 1];
    const rangeStartMs = timeRange?.[0].getTime();
    const rangeEndMs = timeRange?.[1].getTime();
    if (
      typeof rangeStartMs === "number" &&
      typeof rangeEndMs === "number" &&
      Number.isFinite(rangeStartMs) &&
      Number.isFinite(rangeEndMs) &&
      rangeEndMs > rangeStartMs
    ) {
      return {
        min: Number(rangeStartMs),
        max: Number(rangeEndMs),
        minInterval: histogramBucketIntervalMs || undefined
      };
    }
    if (!first || !last) {
      return undefined;
    }
    return {
      min: first.from * 1000,
      max: last.to * 1000,
      minInterval: histogramBucketIntervalMs || undefined
    };
  }, [histogramBucketIntervalMs, histogramChartData, timeRange]);
  const chartSpanSeconds = useMemo(() => {
    if (timeRange) {
      return Math.max(0, Math.round((timeRange[1].getTime() - timeRange[0].getTime()) / 1000));
    }
    const first = histogramChartData[0];
    const last = histogramChartData[histogramChartData.length - 1];
    return first && last ? Math.max(0, last.to - first.from) : 0;
  }, [histogramChartData, timeRange]);
  const chartTotalCount = useMemo(
    () => histogramChartData.reduce((total, item) => total + item.count, 0),
    [histogramChartData]
  );
  const histogramSelectionRange = useMemo(() => {
    if (!histogramSelection || histogramChartData.length === 0) {
      return null;
    }
    const startIndex = Math.max(0, Math.min(histogramSelection.anchorIndex, histogramSelection.hoverIndex));
    const endIndex = Math.min(
      histogramChartData.length - 1,
      Math.max(histogramSelection.anchorIndex, histogramSelection.hoverIndex)
    );
    const startBucket = histogramChartData[startIndex];
    const endBucket = histogramChartData[endIndex];
    if (!startBucket || !endBucket) {
      return null;
    }
    return {
      startIndex,
      endIndex,
      from: startBucket.from,
      to: endBucket.to,
      count: histogramChartData
        .slice(startIndex, endIndex + 1)
        .reduce((total, item) => total + item.count, 0)
    };
  }, [histogramChartData, histogramSelection]);
  const histogramSelectionOverlayStyle = useMemo(() => {
    if (!histogramSelectionRange || !histogramXDomain || histogramXDomain.max <= histogramXDomain.min) {
      return undefined;
    }
    const domainMin = histogramXDomain.min;
    const domainSpan = histogramXDomain.max - histogramXDomain.min;
    const startPercent = clampHistogramSelectionPercent(
      ((histogramSelectionRange.from * 1000 - domainMin) / domainSpan) * 100
    );
    const endPercent = clampHistogramSelectionPercent(
      ((histogramSelectionRange.to * 1000 - domainMin) / domainSpan) * 100
    );
    const left = Math.min(startPercent, endPercent);
    const right = Math.max(startPercent, endPercent);
    return {
      left: `${left}%`,
      width: `${Math.max(0.5, right - left)}%`
    };
  }, [histogramSelectionRange, histogramXDomain]);
  const histogramChartKey = histogramSelectionRange
    ? `selected:${histogramInterval}:${histogramSelectionRange.from}:${histogramSelectionRange.to}`
    : `idle:${histogramInterval}:${histogramXDomain?.min ?? "none"}:${histogramXDomain?.max ?? "none"}:${histogramChartData.length}`;

  useEffect(() => {
    if (!histogramSelectionRange) {
      return;
    }
    histogramSelectionOverlayRef.current?.focus({ preventScroll: true });
  }, [histogramSelectionRange]);

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
  const openLogTabsStorageKey = useMemo(() => {
    return `${OPEN_LOG_TABS_STORAGE_PREFIX}:${getCurrentBrowserUserKey()}`;
  }, []);

  useEffect(() => {
    setExpandedLogIndexes(new Set());
    setExpandedLogDisplayMode("fields");
    setExpandedLogNestedKeys(new Set());
    setExpandedLogMetadataIndexes(new Set());
    clearResultBulkExpandTimers();
    setResultBulkExpandLoading(false);
    clearInlineFieldStats();
  }, [workspace.logs]);

  useEffect(() => () => clearResultBulkExpandTimers(), []);
  useEffect(() => () => {
    abortFieldStatsRequest();
    abortAllInlineFieldStatsRequests();
  }, []);

  useEffect(() => {
    if (!workspace.logs) {
      return;
    }
    resetResultTableHorizontalScroll();
  }, [workspace.logs]);

  useEffect(() => {
    writeTimeRangeToURL(timeRange);
  }, [timeRange]);

  useEffect(() => {
    writeSelectedTableToURL({
      instanceId: workspace.selectedInstanceId,
      database: workspace.selectedDatabase,
      table: workspace.selectedTable,
      tableId: workspace.selectedTableId
    });
  }, [
    workspace.selectedDatabase,
    workspace.selectedInstanceId,
    workspace.selectedTable,
    workspace.selectedTableId
  ]);

  useEffect(() => {
    writeResultPaginationToURL(workspace.page, workspace.pageSize);
  }, [workspace.page, workspace.pageSize]);

  useEffect(() => {
    if (initialQueryStartedRef.current || tableAutoQueryRequest || !workspace.selectedTableId) {
      return;
    }
    initialQueryStartedRef.current = true;
    const hasURLRange = Boolean(
      (initialSearchParams.get("start") && initialSearchParams.get("end")) ||
        (initialSearchParams.get("st") && initialSearchParams.get("et")) ||
        (initialSearchParams.get("startTime") && initialSearchParams.get("endTime"))
    );
    const range = hasURLRange && timeRange ? timeRange : buildEndingNowTimeRange(DEFAULT_TIME_RANGE_MINUTES);
    applyTimeRange(range, buildAbsolutePickerRange(range));
    void workspace.runQuery(initialPage ?? 1, toSecondRange(range));
  }, [initialPage, initialSearchParams, tableAutoQueryRequest, timeRange, workspace.selectedTableId]);

  useEffect(() => {
    setLinkQueryAnchor(null);
  }, [workspace.selectedInstanceId]);

  useEffect(() => {
    setTimeRangeHistory([]);
    clearHistogramSelection();
  }, [workspace.selectedTableId]);

  useEffect(() => {
    setConditionsByLogTab({});
  }, [workspace.selectedInstanceId]);

  useEffect(() => {
    if (openLogTabsRestoredRef.current || linkQueryTableOptions.length === 0) {
      return;
    }
    openLogTabsRestoredRef.current = true;
    const restoredTabs = readOpenLogTabs(openLogTabsStorageKey)
      .map((savedTab) => {
        const table = linkQueryTableOptions.find(
          (item) => item.databaseName === savedTab.databaseName && item.tableName === savedTab.tableName
        );
        return table ? { id: table.id, databaseName: table.databaseName, tableName: table.tableName } : null;
      })
      .filter((item): item is OpenLogTab => Boolean(item));
    if (restoredTabs.length === 0) {
      return;
    }
    openLogTabsHydratingRef.current = true;
    setOpenLogTabs((current) => {
      const seen = new Set<number>();
      return [...restoredTabs, ...current].filter((tab) => {
        if (seen.has(tab.id)) {
          return false;
        }
        seen.add(tab.id);
        return true;
      });
    });
  }, [linkQueryTableOptions, openLogTabsStorageKey]);

  useEffect(() => {
    if (!openLogTabsRestoredRef.current) {
      return;
    }
    if (openLogTabsHydratingRef.current) {
      openLogTabsHydratingRef.current = false;
      return;
    }
    writeOpenLogTabs(openLogTabsStorageKey, validOpenLogTabs);
  }, [openLogTabsStorageKey, validOpenLogTabs]);

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
    if (!fieldCatalogOpen) {
      setFieldCatalogSearch("");
      return;
    }
    const focusTimer = window.setTimeout(() => {
      fieldCatalogSearchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [fieldCatalogOpen]);

  useEffect(() => {
    if (!queryHistoryMenuOpen) {
      setQueryHistorySearch("");
      return;
    }
    const focusTimer = window.setTimeout(() => {
      queryHistorySearchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [queryHistoryMenuOpen]);

  useEffect(() => {
    if (!savedQueryMenuOpen) {
      setSavedQuerySearch("");
      return;
    }
    const focusTimer = window.setTimeout(() => {
      savedQuerySearchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [savedQueryMenuOpen]);

  useEffect(() => {
    if (!sourcePickerOpen) {
      setSourceSearch("");
      return;
    }
    const focusTimer = window.setTimeout(() => {
      sourceSearchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [sourcePickerOpen]);

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
  const resultColumnWidthStorageKey = `${resultColumnStorageKey}:widths`;

  useEffect(() => {
    setResultColumnKeys(readResultColumnKeys(resultColumnStorageKey));
  }, [resultColumnStorageKey]);

  useEffect(() => {
    setResultColumnWidths(readResultColumnWidths(resultColumnWidthStorageKey));
  }, [resultColumnWidthStorageKey]);

  const resultColumnOptions = useMemo(() => {
    const fields = new Set<string>();
    DEFAULT_RESULT_COLUMN_KEYS.forEach((key) => {
      if (!key.startsWith("__")) {
        fields.add(key);
      }
    });
    workspace.suggestionFieldOptions.forEach((item) => {
      if (!isGlobalMatchField(item.field)) {
        fields.add(normalizeResultColumnOptionField(item.field));
      }
    });
    normalizedLogRows.forEach((row) => {
      Object.keys(row.parsed).forEach((key) => fields.add(normalizeResultColumnOptionField(key)));
    });
    const levelColumnLabel =
      LOG_LEVEL_FIELD_KEYS.find((field) => fields.has(normalizeResultColumnOptionField(field))) ??
      LOG_LEVEL_FIELD_KEYS.find((field) => normalizedLogRows.some((row) => isPresentLogValue(row.parsed[field]))) ??
      "level";
    const builtinColumns: QueryResultColumn[] = [
      { key: "__time", label: "time", kind: "builtin" },
      { key: "__level", label: levelColumnLabel, kind: "builtin" },
      { key: "__message", label: "msg", kind: "builtin" }
    ];
    const fieldColumns = Array.from(fields)
      .filter((field) => !isBuiltinResultFieldAlias(field))
      .sort(compareResultFieldColumns)
      .map((field) => ({ key: field, label: field, kind: "field" as const }));
    return [...builtinColumns, ...fieldColumns];
  }, [normalizedLogRows, workspace.suggestionFieldOptions]);

  const visibleResultColumns = useMemo(() => {
    const optionMap = new Map(resultColumnOptions.map((item) => [item.key, item]));
    const columns = resultColumnKeys.map((key) => optionMap.get(key)).filter(Boolean) as QueryResultColumn[];
    return columns.length > 0 ? columns : resultColumnOptions.slice(0, 3);
  }, [resultColumnKeys, resultColumnOptions]);
  const resultTableMinWidth = useMemo(
    () =>
      RESULT_TABLE_TOGGLE_COLUMN_WIDTH +
      visibleResultColumns.reduce((total, column) => total + getResultColumnWidth(column.key, resultColumnWidths), 0),
    [resultColumnWidths, visibleResultColumns]
  );

  useEffect(() => {
    const headerScroll = resultTableHeaderScrollRef.current;
    const bodyScroll = resultTableScrollRef.current;
    if (!headerScroll || !bodyScroll) {
      return;
    }
    headerScroll.scrollLeft = bodyScroll.scrollLeft;
  }, [resultTableMinWidth]);

  useEffect(() => {
    if (!activeResultColumnResize) {
      return;
    }

    function handleMouseMove(event: globalThis.MouseEvent) {
      event.preventDefault();
      if (!activeResultColumnResize) {
        return;
      }
      updateResultColumnWidth(
        activeResultColumnResize.key,
        activeResultColumnResize.startWidth + event.clientX - activeResultColumnResize.startX
      );
    }

    function handleMouseUp() {
      setActiveResultColumnResize(null);
    }

    document.body.classList.add("cv-query-resizing-column");
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.classList.remove("cv-query-resizing-column");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeResultColumnResize, resultColumnWidthStorageKey]);

  const fieldCatalogGroups = useMemo<QueryFieldCatalogGroup[]>(() => {
    const search = fieldCatalogSearch.trim().toLowerCase();
    const visibleColumnKeys = new Set(visibleResultColumns.map((item) => item.key));
    const columnOptionsByKey = new Map(resultColumnOptions.map((item) => [item.key, item]));
    const findSampleValue = (field: string) => {
      for (const row of normalizedLogRows) {
        const value = row.parsed[field];
        if (isPresentLogValue(value)) {
          return value;
        }
      }
      return "";
    };
    const buildItem = (
      field: string,
      group: QueryFieldCatalogGroupKey,
      valueType: QueryFilterValueType,
      sampleValue: unknown = "",
      seen: Set<string>
    ): QueryFieldCatalogItem | null => {
      const normalizedField = normalizeResultColumnOptionField(field);
      const key = normalizeFieldCatalogKey(normalizedField);
      if (!normalizedField || seen.has(key) || isGlobalMatchField(normalizedField)) {
        return null;
      }
      seen.add(key);
      const sample = isPresentLogValue(sampleValue) ? sampleValue : findSampleValue(normalizedField);
      const fieldRef = buildQueryFieldRef(
        {
          id: `field_catalog_${group}_${key}`,
          field: normalizedField,
          operator: "=",
          value: "",
          valueType
        },
        workspace.analysisFields
      );
      const columnOption = columnOptionsByKey.get(normalizedField);
      const label = columnOption?.label ?? normalizedField;
      return {
        key: `${group}:${normalizedField}`,
        field: normalizedField,
        label,
        group,
        columnKey: columnOption?.key ?? normalizedField,
        valueType,
        sampleValue: sample,
        fieldRef,
        canToggleColumn: Boolean(columnOption?.kind === "field"),
        isColumnVisible: visibleColumnKeys.has(columnOption?.key ?? normalizedField),
        canShowTopValues: canShowFieldStatsForField(normalizedField) && !(sample && typeof sample === "object")
      };
    };
    const buildStorageItems = (fields: QueryStorageAnalysisField[], group: QueryFieldCatalogGroupKey) => {
      const seen = new Set<string>();
      return fields
        .map((item) => buildItem(getStorageAnalysisFieldName(item), group, getStorageAnalysisValueType(item), "", seen))
        .filter((item): item is QueryFieldCatalogItem => Boolean(item));
    };
    const baseItems = buildStorageItems(workspace.analysisFields.baseFields, "base");
    const logItems = buildStorageItems(workspace.analysisFields.logFields, "log");
    const parsedFields = Array.from(
      normalizedLogRows.reduce<Set<string>>((acc, row) => {
        Object.entries(row.parsed).forEach(([field, value]) => {
          if (
            isPresentLogValue(value) &&
            !isLogTimeField(field) &&
            !isBuiltinResultFieldAlias(field) &&
            !field.startsWith("__")
          ) {
            acc.add(normalizeResultColumnOptionField(field));
          }
        });
        return acc;
      }, new Set<string>())
    ).sort(compareResultFieldColumns);
    const allFieldMetadata = new Map<string, { field: string; valueType: QueryFilterValueType; sampleValue: unknown }>();
    const addAllField = (field: string, valueType: QueryFilterValueType, sampleValue: unknown = "") => {
      const normalizedField = normalizeResultColumnOptionField(field);
      const key = normalizeFieldCatalogKey(normalizedField);
      if (!normalizedField || allFieldMetadata.has(key) || isGlobalMatchField(normalizedField)) {
        return;
      }
      allFieldMetadata.set(key, { field: normalizedField, valueType, sampleValue });
    };
    workspace.analysisFields.logFields.forEach((item) => {
      addAllField(getStorageAnalysisFieldName(item), getStorageAnalysisValueType(item));
    });
    workspace.analysisFields.baseFields.forEach((item) => {
      addAllField(getStorageAnalysisFieldName(item), getStorageAnalysisValueType(item));
    });
    parsedFields.forEach((field) => {
      const sample = findSampleValue(field);
      addAllField(field, createDetailConditionValue(sample).valueType, sample);
    });
    const allSeen = new Set<string>();
    const allItems = Array.from(allFieldMetadata.values())
      .sort((fieldA, fieldB) => compareResultFieldColumns(fieldA.field, fieldB.field))
      .map((metadata) => {
        const sample = isPresentLogValue(metadata.sampleValue) ? metadata.sampleValue : findSampleValue(metadata.field);
        return buildItem(metadata.field, "all", metadata.valueType, sample, allSeen);
      })
      .filter((item): item is QueryFieldCatalogItem => Boolean(item));
    const filterItems = (items: QueryFieldCatalogItem[]) =>
      search
        ? items.filter((item) =>
            `${item.label} ${item.field} ${item.group} ${item.valueType}`.toLowerCase().includes(search)
          )
        : items;
    return [
      { key: "log", title: "Log Fields", items: filterItems(logItems) },
      { key: "base", title: "Base Fields", items: filterItems(baseItems) },
      { key: "all", title: "All Fields", items: filterItems(allItems) }
    ];
  }, [
    fieldCatalogSearch,
    normalizedLogRows,
    resultColumnOptions,
    visibleResultColumns,
    workspace.analysisFields
  ]);
  const visibleFieldCatalogCount = useMemo(
    () => fieldCatalogGroups.find((group) => group.key === "all")?.items.length ?? 0,
    [fieldCatalogGroups]
  );
  const activeFieldCatalogGroup =
    fieldCatalogGroups.find((group) => group.key === activeFieldCatalogGroupKey) ?? fieldCatalogGroups[0];

  useEffect(() => {
    if (!fieldCatalogOpen) {
      return;
    }
    const activeGroup = fieldCatalogGroups.find((group) => group.key === activeFieldCatalogGroupKey);
    if ((activeGroup?.items.length ?? 0) > 0 || visibleFieldCatalogCount === 0) {
      return;
    }
    const firstGroupWithItems = fieldCatalogGroups.find((group) => group.items.length > 0);
    if (firstGroupWithItems) {
      setActiveFieldCatalogGroupKey(firstGroupWithItems.key);
    }
  }, [activeFieldCatalogGroupKey, fieldCatalogGroups, fieldCatalogOpen, visibleFieldCatalogCount]);

  useEffect(() => {
    if (resultColumnMenuKey && !visibleResultColumns.some((column) => column.key === resultColumnMenuKey)) {
      setResultColumnMenuKey(null);
    }
  }, [resultColumnMenuKey, visibleResultColumns]);

  const queryPreview = useMemo(() => {
    try {
      return workspace.buildQueryText().trim() || EMPTY_QUERY_PREVIEW;
    } catch (error) {
      return `${INVALID_QUERY_PREVIEW_PREFIX}: ${error instanceof Error ? error.message : "Check filters"}`;
    }
  }, [workspace.queryText, workspace.conditions, workspace.analysisFields]);
  const canShowQueryPreview = Boolean(workspace.queryText.trim() || workspace.conditions.length > 0);
  const canUseQueryPreview =
    queryPreview !== EMPTY_QUERY_PREVIEW && !queryPreview.startsWith(INVALID_QUERY_PREVIEW_PREFIX);

  useEffect(() => {
    if (!canShowQueryPreview && queryPreviewOpen) {
      setQueryPreviewOpen(false);
    }
  }, [canShowQueryPreview, queryPreviewOpen]);

  function applyTimeRange(range: [Date, Date], pickerRange?: QueryAbsolutePickerRange) {
    setTimeRange(range);
    setAbsolutePickerRange(pickerRange ?? buildAbsolutePickerRange(range));
  }

  function applyAbsolutePickerRange(pickerRange: QueryAbsolutePickerRange, dateRange: QueryDateRange) {
    setAbsolutePickerRange(pickerRange);
    setTimeRangeHistory([]);
    clearHistogramSelection();
    if (!dateRange) {
      return;
    }
    setTimeRange(dateRange);
    void workspace.runQuery(1, toSecondRange(dateRange));
  }

  function applyHistogramTimeRange(range: [Date, Date]) {
    const previousRange = cloneDateRange(timeRange);
    if (previousRange && !isSameSecondDateRange(previousRange, range)) {
      setTimeRangeHistory((current) => [...current, previousRange].slice(-8));
    }
    applyTimeRange(range);
    void workspace.runQuery(1, toSecondRange(range));
  }

  function restorePreviousHistogramTimeRange() {
    const previousRange = timeRangeHistory[timeRangeHistory.length - 1];
    if (!previousRange) {
      return;
    }
    const nextRange = cloneDateRange(previousRange);
    if (!nextRange) {
      return;
    }
    setTimeRangeHistory((current) => current.slice(0, -1));
    clearHistogramSelection();
    applyTimeRange(nextRange, buildAbsolutePickerRange(nextRange));
    void workspace.runQuery(1, toSecondRange(nextRange));
  }

  function setHistogramSelectionDraft(selection: HistogramSelection | null) {
    histogramSelectionRef.current = selection;
    setHistogramSelection(selection);
  }

  function clearHistogramSelection() {
    histogramSelectionRef.current = null;
    setHistogramSelection(null);
  }

  function changeHistogramInterval(value: HistogramIntervalValue) {
    setHistogramInterval(value);
    clearHistogramSelection();
  }

  function applyHistogramBucketRange(startIndex: number, endIndex: number) {
    const normalizedStart = Math.max(0, Math.min(startIndex, endIndex));
    const normalizedEnd = Math.min(histogramChartData.length - 1, Math.max(startIndex, endIndex));
    const startBucket = histogramChartData[normalizedStart];
    const endBucket = histogramChartData[normalizedEnd];
    if (!startBucket || !endBucket || endBucket.to <= startBucket.from) {
      return;
    }
    applyHistogramTimeRange([new Date(startBucket.from * 1000), new Date(endBucket.to * 1000)]);
  }

  function applyHistogramSelectionRange() {
    if (!histogramSelectionRange) {
      return;
    }
    const { startIndex, endIndex } = histogramSelectionRange;
    clearHistogramSelection();
    applyHistogramBucketRange(startIndex, endIndex);
  }

  function zoomOutHistogramTimeRange() {
    const currentRange = cloneDateRange(timeRange);
    if (!currentRange) {
      return;
    }
    const startMs = currentRange[0].getTime();
    const endMs = currentRange[1].getTime();
    const spanMs = Math.max(60_000, endMs - startMs);
    const nextRange: [Date, Date] = [
      new Date(startMs - spanMs / 2),
      new Date(endMs + spanMs / 2)
    ];
    clearHistogramSelection();
    applyHistogramTimeRange(nextRange);
  }

  function selectHistogramBucket(index: number) {
    if (!histogramChartData[index]) {
      return;
    }
    setHistogramSelectionDraft({ anchorIndex: index, hoverIndex: index });
  }

  function handleHistogramBrushEnd(brushArea: { x?: [number, number] }) {
    const nextSelection = findHistogramSelectionFromExtent(histogramChartData, brushArea.x);
    if (!nextSelection) {
      return;
    }
    setHistogramSelectionDraft(nextSelection);
  }

  function handleHistogramElementClick(elements: Array<[unknown]>) {
    const datum = (elements[0]?.[0] as { datum?: HistogramChartDatum } | undefined)?.datum;
    if (!datum) {
      return;
    }
    const index = histogramChartData.findIndex((item) => item.from === datum.from && item.to === datum.to);
    selectHistogramBucket(index);
  }

  function parseProfileTime(value: string) {
    const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function openSaveQueryModal() {
    setSaveQueryName(queryPreview && queryPreview !== EMPTY_QUERY_PREVIEW ? truncate(queryPreview, 32) : "");
    setSaveQueryModalOpen(true);
  }

  async function handleSaveQuery() {
    try {
      await workspace.saveCurrentQuery(saveQueryName, {
        startTime,
        endTime
      });
      setFeedbackMessage("Query saved");
      setSaveQueryModalOpen(false);
      setSavedQueryMenuOpen(true);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Save query failed");
    }
  }

  function applySavedFilterProfile(profile: (typeof workspace.savedFilterProfiles)[number]) {
    const start = parseProfileTime(profile.timeRange.startTime);
    const end = parseProfileTime(profile.timeRange.endTime);
    const nextRange = start && end ? ([start, end] as [Date, Date]) : timeRange;
    if (nextRange) {
      applyTimeRange(nextRange);
    }
    workspace.applyFilterProfile(profile);
    setSavedQueryMenuOpen(false);
    void workspace.runQuery(1, nextRange ? toSecondRange(nextRange) : undefined, profile.conditions);
  }

  function convertConditionsToManualSql() {
    const nextQuery = queryPreview.trim();
    if (!nextQuery || !canUseQueryPreview) {
      return;
    }
    workspace.setQueryText(nextQuery);
    workspace.setConditions([]);
    workspace.setActiveConditionId(null);
    setFilterComposerOpen(false);
    setInlineFieldPickerOpen(false);
    setFeedbackMessage("");
  }

  async function copyQueryPreview() {
    if (!canUseQueryPreview) {
      return;
    }
    const copied = await copyTextToClipboard(queryPreview);
    setFeedbackMessage(copied ? "SQL copied" : "Copy SQL failed");
  }

  async function copyExpandedLog(row: NormalizedLogRow) {
    const copied = await copyTextToClipboard(formatLogJsonPreview(row));
    setFeedbackMessage(copied ? "Log copied" : "Copy log failed");
  }

  async function copyLogDetailValue(field: string, value: unknown) {
    const text = formatLogDetailValue(value).trim();
    if (!text || text === "—") {
      return;
    }
    const copied = await copyTextToClipboard(text);
    setFeedbackMessage(copied ? `${field} copied` : `Copy ${field} failed`);
  }

  async function deleteSavedFilterProfile(id: number, name: string) {
    try {
      await workspace.deleteSavedFilterProfile(id);
      setFeedbackMessage(`Deleted saved query ${name}`);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Delete saved query failed");
    }
  }

  async function handleShareQuery() {
    if (shareLoading) {
      return;
    }
    try {
      setShareLoading(true);
      const shareUrl = new URL(window.location.href);
      shareUrl.pathname = buildShareRouteHref(undefined, window.location.pathname);
      shareUrl.hash = "";
      if (queryPreview && queryPreview !== EMPTY_QUERY_PREVIEW && !queryPreview.startsWith(INVALID_QUERY_PREVIEW_PREFIX)) {
        shareUrl.searchParams.set("query", queryPreview);
        shareUrl.searchParams.set("kw", queryPreview);
      } else {
        shareUrl.searchParams.delete("query");
        shareUrl.searchParams.delete("kw");
      }
      if (timeRange) {
        const { st, et } = toSecondRange(timeRange);
        shareUrl.searchParams.set("start", String(st));
        shareUrl.searchParams.set("end", String(et));
      }
      shareUrl.searchParams.delete("startTime");
      shareUrl.searchParams.delete("endTime");
      if (workspace.selectedTableId) {
        shareUrl.searchParams.set("tid", String(workspace.selectedTableId));
      }
      shareUrl.searchParams.delete("instanceId");
      shareUrl.searchParams.delete("tableId");
      if (workspace.selectedDatabase) {
        shareUrl.searchParams.set("database", workspace.selectedDatabase);
      }
      if (workspace.selectedTable) {
        shareUrl.searchParams.set("table", workspace.selectedTable);
      }
      const shortUrl = await createQueryShareShortUrl({ originUrl: shareUrl.toString() });
      const copied = await copyTextToClipboard(shortUrl);
      setFeedbackMessage(copied ? "Share link copied" : `Share link created: ${shortUrl}`);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Share failed");
    } finally {
      setShareLoading(false);
    }
  }

  function updateResultColumnKeys(nextKeys: string[]) {
    const uniqueKeys = normalizeResultColumnKeys(nextKeys);
    const normalizedKeys = uniqueKeys.length > 0 ? uniqueKeys : [...DEFAULT_RESULT_COLUMN_KEYS];
    setResultColumnKeys(normalizedKeys);
    writeResultColumnKeys(resultColumnStorageKey, normalizedKeys);
  }

  function toggleLogDetailColumn(columnKey: string, label = columnKey) {
    const visibleKeys = visibleResultColumns.map((column) => column.key);
    if (visibleKeys.includes(columnKey)) {
      if (visibleKeys.length <= 1) {
        setFeedbackMessage("Keep at least one column");
        return;
      }
      updateResultColumnKeys(visibleKeys.filter((key) => key !== columnKey));
      setFeedbackMessage("");
      return;
    }
    updateResultColumnKeys([...visibleKeys, columnKey]);
    setFeedbackMessage("");
  }

  function resetResultTableHorizontalScroll() {
    resultTableScrollRef.current?.scrollTo?.({ left: 0 });
    resultTableHeaderScrollRef.current?.scrollTo?.({ left: 0 });
    if (resultTableScrollRef.current) {
      resultTableScrollRef.current.scrollLeft = 0;
    }
    if (resultTableHeaderScrollRef.current) {
      resultTableHeaderScrollRef.current.scrollLeft = 0;
    }
  }

  function resetResultColumns() {
    updateResultColumnKeys([...DEFAULT_RESULT_COLUMN_KEYS]);
    setResultColumnWidths({});
    writeResultColumnWidths(resultColumnWidthStorageKey, {});
  }

  function hideResultColumn(columnKey: string) {
    const currentKeys = visibleResultColumns.map((column) => column.key);
    if (currentKeys.length <= 1) {
      setFeedbackMessage("Keep at least one column");
      return;
    }
    updateResultColumnKeys(currentKeys.filter((key) => key !== columnKey));
  }

  function moveResultColumn(sourceKey: string, targetKey: string) {
    if (!sourceKey || sourceKey === targetKey) {
      return;
    }
    const currentKeys = visibleResultColumns.map((column) => column.key);
    const sourceIndex = currentKeys.indexOf(sourceKey);
    const targetIndex = currentKeys.indexOf(targetKey);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }
    const nextKeys = [...currentKeys];
    const [movedKey] = nextKeys.splice(sourceIndex, 1);
    nextKeys.splice(targetIndex, 0, movedKey);
    updateResultColumnKeys(nextKeys);
  }

  function moveResultColumnByOffset(columnKey: string, offset: -1 | 1) {
    const currentKeys = visibleResultColumns.map((column) => column.key);
    const currentIndex = currentKeys.indexOf(columnKey);
    const targetKey = currentKeys[currentIndex + offset];
    if (currentIndex < 0 || !targetKey) {
      return;
    }
    moveResultColumn(columnKey, targetKey);
    setResultColumnMenuKey(null);
  }

  function handleResultColumnDragStart(event: DragEvent<HTMLTableCellElement>, columnKey: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", columnKey);
    setDraggedResultColumnKey(columnKey);
  }

  function handleResultColumnDragOver(event: DragEvent<HTMLTableCellElement>, columnKey: string) {
    if (draggedResultColumnKey === columnKey) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggedResultColumnKey) {
      setResultColumnDropTargetKey(columnKey);
    }
  }

  function handleResultColumnDrop(event: DragEvent<HTMLTableCellElement>, columnKey: string) {
    event.preventDefault();
    const sourceKey = event.dataTransfer.getData("text/plain") || draggedResultColumnKey;
    if (sourceKey) {
      moveResultColumn(sourceKey, columnKey);
    }
    setDraggedResultColumnKey(null);
    setResultColumnDropTargetKey(null);
  }

  function finishResultColumnDrag() {
    setDraggedResultColumnKey(null);
    setResultColumnDropTargetKey(null);
  }

  function updateResultColumnWidth(columnKey: string, width: number) {
    const nextWidth = clampResultColumnWidth(columnKey, width);
    setResultColumnWidths((current) => {
      if (current[columnKey] === nextWidth) {
        return current;
      }
      const next = {
        ...current,
        [columnKey]: nextWidth
      };
      writeResultColumnWidths(resultColumnWidthStorageKey, next);
      return next;
    });
  }

  function startResultColumnResize(event: MouseEvent<HTMLButtonElement>, columnKey: string) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setResultColumnMenuKey(null);
    finishResultColumnDrag();
    setActiveResultColumnResize({
      key: columnKey,
      startX: event.clientX,
      startWidth: getResultColumnWidth(columnKey, resultColumnWidths)
    });
  }

  function handleResultColumnPointerDown(event: MouseEvent<HTMLTableCellElement>, columnKey: string) {
    if (event.button !== 0) {
      return;
    }
    setDraggedResultColumnKey(columnKey);
    setResultColumnDropTargetKey(null);
  }

  function handleResultColumnPointerEnter(columnKey: string) {
    if (!draggedResultColumnKey || draggedResultColumnKey === columnKey) {
      return;
    }
    setResultColumnDropTargetKey(columnKey);
  }

  function handleResultColumnPointerUp(columnKey: string) {
    if (draggedResultColumnKey && draggedResultColumnKey !== columnKey) {
      moveResultColumn(draggedResultColumnKey, columnKey);
    }
    finishResultColumnDrag();
  }

  function changeResultPageSize(nextPageSize: number) {
    if (nextPageSize === workspace.pageSize || workspace.loading) {
      return;
    }
    workspace.setPageSize(nextPageSize);
    void workspace.runQuery(1, timeRange ? toSecondRange(timeRange) : undefined, undefined, undefined, nextPageSize);
  }

  function goToResultPage(nextPage: number) {
    if (workspace.loading || nextPage < 1 || nextPage === workspace.page) {
      return;
    }
    void workspace.runQuery(nextPage, timeRange ? toSecondRange(timeRange) : undefined);
  }

  function handleResultTableBodyScroll(event: UIEvent<HTMLDivElement>) {
    if (resultTableHeaderScrollRef.current) {
      resultTableHeaderScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  }

  function handleResultTableHeaderWheel(event: WheelEvent<HTMLDivElement>) {
    const delta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
    if (!resultTableScrollRef.current || !delta) {
      return;
    }
    event.preventDefault();
    resultTableScrollRef.current.scrollLeft += delta;
    if (resultTableHeaderScrollRef.current) {
      resultTableHeaderScrollRef.current.scrollLeft = resultTableScrollRef.current.scrollLeft;
    }
  }

  function renderResultTableColGroup() {
    return (
      <colgroup>
        <col className="cv-query-result-col--toggle" style={{ width: RESULT_TABLE_TOGGLE_COLUMN_WIDTH }} />
        {visibleResultColumns.map((column) => (
          <col
            key={column.key}
            className={`cv-query-result-col ${getResultColumnLayoutClass(column.key)}`}
            style={{ width: getResultColumnWidth(column.key, resultColumnWidths) }}
          />
        ))}
      </colgroup>
    );
  }

  function renderResultTableHeader() {
    return (
      <thead>
        <tr>
          <th scope="col" className="cv-query-result-table__toggle-header" aria-label="Log detail toggle" />
          {visibleResultColumns.map((column, columnIndex) => {
            const isDragging = draggedResultColumnKey === column.key;
            const isDropTarget =
              Boolean(draggedResultColumnKey) &&
              draggedResultColumnKey !== column.key &&
              resultColumnDropTargetKey === column.key;
            const columnConditionField = getResultColumnConditionField(column);
            const canShowColumnTopValues =
              column.key !== "__time" && canShowFieldStatsForField(columnConditionField);
            const columnMenuOpen = resultColumnMenuKey === column.key;
            const canMoveColumnLeft = columnIndex > 0;
            const canMoveColumnRight = columnIndex < visibleResultColumns.length - 1;
            return (
              <th
                key={column.key}
                scope="col"
                draggable
                className={
                  [
                    "cv-query-result-table__header",
                    getResultColumnLayoutClass(column.key),
                    isDragging ? "cv-query-result-table__header--dragging" : "",
                    isDropTarget ? "cv-query-result-table__header--drop-target" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                onDragStart={(event) => handleResultColumnDragStart(event, column.key)}
                onDragOver={(event) => handleResultColumnDragOver(event, column.key)}
                onMouseDown={(event) => handleResultColumnPointerDown(event, column.key)}
                onMouseEnter={() => handleResultColumnPointerEnter(column.key)}
                onMouseUp={() => handleResultColumnPointerUp(column.key)}
                onDragLeave={() => {
                  if (resultColumnDropTargetKey === column.key) {
                    setResultColumnDropTargetKey(null);
                  }
                }}
                onDrop={(event) => handleResultColumnDrop(event, column.key)}
                onDragEnd={finishResultColumnDrag}
              >
                <div className="cv-query-result-header-cell">
                  <span className="cv-query-result-header-cell__grab" aria-hidden="true" />
                  <span className="cv-query-result-header-cell__label-menu">
                    <EuiPopover
                      anchorPosition="downLeft"
                      button={
                        <button
                          type="button"
                          className="cv-query-result-header-cell__label-button"
                          aria-expanded={columnMenuOpen}
                          aria-haspopup="menu"
                          title={column.label}
                          draggable={false}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            setResultColumnMenuKey((current) => (current === column.key ? null : column.key));
                          }}
                        >
                          <span>{column.label}</span>
                          <EuiIcon type="arrowDown" size="s" aria-hidden="true" />
                        </button>
                      }
                      closePopover={() => setResultColumnMenuKey(null)}
                      isOpen={columnMenuOpen}
                      ownFocus={false}
                      panelClassName="cv-query-result-column-menu-panel"
                      panelPaddingSize="none"
                      repositionOnScroll
                    >
                      <div
                        className="cv-query-result-column-menu"
                        role="menu"
                        aria-label={`${column.label} column actions`}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="cv-query-result-column-menu__title" title={column.label}>
                          {column.label}
                        </div>
                        {columnConditionField ? (
                          <button
                            type="button"
                            role="menuitem"
                            className="cv-query-result-column-menu__item"
                            onClick={() => startResultColumnFilter(column)}
                          >
                            <EuiIcon type="filterInclude" size="s" aria-hidden="true" />
                            <span>Add condition</span>
                          </button>
                        ) : null}
                        {canShowColumnTopValues ? (
                          <button
                            type="button"
                            role="menuitem"
                            className="cv-query-result-column-menu__item"
                            onClick={() => showResultColumnTopValues(column)}
                          >
                            <EuiIcon type="stats" size="s" aria-hidden="true" />
                            <span>Top values</span>
                          </button>
                        ) : null}
                        {columnConditionField || canShowColumnTopValues ? (
                          <div className="cv-query-result-column-menu__separator" role="separator" />
                        ) : null}
                        <button
                          type="button"
                          role="menuitem"
                          className="cv-query-result-column-menu__item"
                          disabled={!canMoveColumnLeft}
                          onClick={() => {
                            setResultColumnMenuKey(null);
                            moveResultColumnByOffset(column.key, -1);
                          }}
                        >
                          <EuiIcon type="arrowLeft" size="s" aria-hidden="true" />
                          <span>Move left</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="cv-query-result-column-menu__item"
                          disabled={!canMoveColumnRight}
                          onClick={() => {
                            setResultColumnMenuKey(null);
                            moveResultColumnByOffset(column.key, 1);
                          }}
                        >
                          <EuiIcon type="arrowRight" size="s" aria-hidden="true" />
                          <span>Move right</span>
                        </button>
                        <div className="cv-query-result-column-menu__separator" role="separator" />
                        <button
                          type="button"
                          role="menuitem"
                          className="cv-query-result-column-menu__item"
                          onClick={() => {
                            setResultColumnMenuKey(null);
                            hideResultColumn(column.key);
                          }}
                        >
                          <EuiIcon type="minusInCircle" size="s" aria-hidden="true" />
                          <span>Hide column</span>
                        </button>
                      </div>
                    </EuiPopover>
                  </span>
                  <button
                    type="button"
                    className="cv-query-result-header-cell__resize"
                    aria-label={`Resize ${column.label} column`}
                    title={`Resize ${column.label} column`}
                    draggable={false}
                    onMouseDown={(event) => startResultColumnResize(event, column.key)}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    <span aria-hidden="true" />
                  </button>
                </div>
              </th>
            );
          })}
        </tr>
      </thead>
    );
  }

  function abortFieldStatsRequest() {
    fieldStatsAbortControllerRef.current?.abort();
    fieldStatsAbortControllerRef.current = null;
  }

  function abortInlineFieldStatsRequest(itemKey: string) {
    const abortController = inlineFieldStatsAbortControllersRef.current.get(itemKey);
    abortController?.abort();
    inlineFieldStatsAbortControllersRef.current.delete(itemKey);
  }

  function abortAllInlineFieldStatsRequests() {
    inlineFieldStatsAbortControllersRef.current.forEach((abortController) => abortController.abort());
    inlineFieldStatsAbortControllersRef.current.clear();
  }

  function closeFieldStatsModal() {
    abortFieldStatsRequest();
    setFieldStatsState(null);
  }

  function clearInlineFieldStats() {
    abortAllInlineFieldStatsRequests();
    setInlineFieldStatsByKey({});
    setExpandedInlineFieldStatsKeys(new Set());
  }

  function closeAllFieldStats() {
    closeFieldStatsModal();
    clearInlineFieldStats();
  }

  function collapseInlineFieldStats(itemKey: string) {
    const statsState = inlineFieldStatsByKey[itemKey];
    if (statsState?.loading) {
      abortInlineFieldStatsRequest(itemKey);
      setInlineFieldStatsByKey((current) => {
        const next = { ...current };
        delete next[itemKey];
        return next;
      });
    }
    setExpandedInlineFieldStatsKeys((current) => {
      const next = new Set(current);
      next.delete(itemKey);
      return next;
    });
  }

  function closeFieldCatalogPanel() {
    setFieldCatalogOpen(false);
    abortAllInlineFieldStatsRequests();
    setInlineFieldStatsByKey((current) =>
      Object.fromEntries(Object.entries(current).filter(([, statsState]) => !statsState.loading))
    );
    setExpandedInlineFieldStatsKeys((current) => {
      const next = new Set(current);
      Object.entries(inlineFieldStatsByKey).forEach(([itemKey, statsState]) => {
        if (statsState.loading) {
          next.delete(itemKey);
        }
      });
      return next;
    });
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

  function buildFieldStatsRequestContext(
    field: string,
    sampleValue: unknown,
    preferRawLog = false,
    explicitFieldRef?: QueryFieldRef
  ) {
    const fieldStatsRange = workspace.lastRunSnapshot?.range ?? (timeRange ? toSecondRange(timeRange) : null);
    if (!workspace.selectedTableId || !fieldStatsRange) {
      setFeedbackMessage("Select a log table and time range first");
      return null;
    }
    const explicitFieldKey = explicitFieldRef?.fieldKey ?? "";
    if (!canShowFieldStatsForField(field) || (explicitFieldKey && !canShowFieldStatsForField(explicitFieldKey))) {
      const feedbackField = explicitFieldKey || field;
      setFeedbackMessage(
        isUniqueFieldStatsField(field) || isUniqueFieldStatsField(explicitFieldKey)
          ? `${feedbackField} is unique and cannot show top values`
          : isTimeFieldStatsField(field) || isTimeFieldStatsField(explicitFieldKey)
          ? `${feedbackField} is time-related and cannot show top values`
          : "Raw log fields cannot show top values"
      );
      return null;
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
    return {
      field,
      fieldRef,
      request: {
        tid: workspace.selectedTableId,
        st: fieldStatsRange.st,
        et: fieldStatsRange.et,
        page: 1,
        pageSize: workspace.pageSize,
        conditions:
          workspace.lastRunSnapshot?.conditions ??
          buildStructuredConditions(workspace.conditions, workspace.analysisFields),
        sorts: [],
        displayFields: [],
        field: fieldRef,
        limit: 10
      }
    };
  }

  async function openFieldStatsModal(
    field: string,
    sampleValue: unknown,
    preferRawLog = false,
    explicitFieldRef?: QueryFieldRef
  ) {
    const context = buildFieldStatsRequestContext(field, sampleValue, preferRawLog, explicitFieldRef);
    if (!context) {
      return;
    }
    abortFieldStatsRequest();
    const abortController = new AbortController();
    fieldStatsAbortControllerRef.current = abortController;
    setFieldStatsState({
      field: context.field,
      fieldRef: context.fieldRef,
      loading: true,
      data: null,
      error: ""
    });
    try {
      const data = await getQueryFieldStats(
        context.request,
        { signal: abortController.signal }
      );
      if (fieldStatsAbortControllerRef.current !== abortController) {
        return;
      }
      fieldStatsAbortControllerRef.current = null;
      setFieldStatsState({
        field: context.field,
        fieldRef: context.fieldRef,
        loading: false,
        data,
        error: ""
      });
    } catch (error) {
      if (fieldStatsAbortControllerRef.current !== abortController) {
        return;
      }
      fieldStatsAbortControllerRef.current = null;
      if (abortController.signal.aborted || isAbortRequestError(error)) {
        setFieldStatsState(null);
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load field stats";
      setFieldStatsState({
        field: context.field,
        fieldRef: context.fieldRef,
        loading: false,
        data: null,
        error: message
      });
    }
  }

  async function openInlineFieldStats(item: QueryFieldCatalogItem) {
    const context = buildFieldStatsRequestContext(item.label, item.sampleValue, false, item.fieldRef);
    if (!context) {
      return;
    }
    abortInlineFieldStatsRequest(item.key);
    const abortController = new AbortController();
    inlineFieldStatsAbortControllersRef.current.set(item.key, abortController);
    setExpandedInlineFieldStatsKeys((current) => {
      const next = new Set(current);
      next.add(item.key);
      return next;
    });
    setInlineFieldStatsByKey((current) => ({
      ...current,
      [item.key]: {
        field: context.field,
        fieldRef: context.fieldRef,
        loading: true,
        data: null,
        error: ""
      }
    }));
    try {
      const data = await getQueryFieldStats(context.request, { signal: abortController.signal });
      if (inlineFieldStatsAbortControllersRef.current.get(item.key) !== abortController) {
        return;
      }
      inlineFieldStatsAbortControllersRef.current.delete(item.key);
      setInlineFieldStatsByKey((current) => ({
        ...current,
        [item.key]: {
          field: context.field,
          fieldRef: context.fieldRef,
          loading: false,
          data,
          error: ""
        }
      }));
    } catch (error) {
      if (inlineFieldStatsAbortControllersRef.current.get(item.key) !== abortController) {
        return;
      }
      inlineFieldStatsAbortControllersRef.current.delete(item.key);
      if (abortController.signal.aborted || isAbortRequestError(error)) {
        setInlineFieldStatsByKey((current) => {
          const next = { ...current };
          delete next[item.key];
          return next;
        });
        setExpandedInlineFieldStatsKeys((current) => {
          const next = new Set(current);
          next.delete(item.key);
          return next;
        });
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load field stats";
      setInlineFieldStatsByKey((current) => ({
        ...current,
        [item.key]: {
          field: context.field,
          fieldRef: context.fieldRef,
          loading: false,
          data: null,
          error: message
        }
      }));
    }
  }

  function toggleExpandedLog(index: number) {
    setExpandedLogIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        resetResultTableHorizontalScroll();
        next.add(index);
      }
      return next;
    });
  }

  function toggleExpandedLogNestedField(rowIndex: number, fieldKey: string) {
    const nestedKey = `${rowIndex}:${fieldKey}`;
    setExpandedLogNestedKeys((current) => {
      const next = new Set(current);
      if (next.has(nestedKey)) {
        next.delete(nestedKey);
      } else {
        next.add(nestedKey);
      }
      return next;
    });
  }

  function toggleExpandedLogMetadata(index: number) {
    setExpandedLogMetadataIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
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
    } else if (normalizeResultColumnKey(column.key) === CONTAINER_NAME_RESULT_COLUMN_KEY) {
      rawValue = firstPresentValue(row.parsed, [
        CONTAINER_NAME_RESULT_COLUMN_KEY,
        LEGACY_CONTAINER_NAME_RESULT_COLUMN_KEY,
        "container_name"
      ]);
    } else {
      rawValue = row.parsed[column.key];
    }
    const empty = !isPresentLogValue(rawValue) || rawValue === "-";
    return {
      empty,
      text: empty ? "—" : formatLogDetailValue(rawValue)
    };
  }

  function applyConditionsAndRun(nextConditions: QueryFilterCondition[], activeConditionId: string | null) {
    workspace.setConditions(nextConditions);
    workspace.setActiveConditionId(activeConditionId);
    void workspace.runQuery(1, timeRange ? toSecondRange(timeRange) : undefined, nextConditions);
  }

  function addConditionFromLogDetail(field: string, value: unknown, operator: "=" | "!=" = "=") {
    if (!canCreateConditionFromDetailValue(field, value)) {
      return;
    }
    const fieldRef = buildDetailFieldRef(field, value);
    if (operator === "=" && fieldRef.valueType === "datetime" && isLogTimeField(fieldRef.fieldKey)) {
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
          setFeedbackMessage(`Time range already exists for ${field}`);
          return;
        }
        applyConditionsAndRun([...workspace.conditions, ...timeConditions], timeConditions[0].id);
        setFeedbackMessage("");
        return;
      }
    }
    const conditionValue = createTypedDetailConditionValue(
      value,
      fieldRef.valueType === "number" || fieldRef.valueType === "datetime" ? fieldRef.valueType : "string"
    );
    if (!conditionValue) {
      setFeedbackMessage(`${field} cannot be added as a numeric condition`);
      return;
    }
    const existingCondition = workspace.conditions.find(
      (condition) =>
        condition.field === field &&
        condition.operator === operator &&
        condition.valueType === conditionValue.valueType &&
        String(condition.value) === String(conditionValue.value)
    );
    if (existingCondition) {
      workspace.setActiveConditionId(existingCondition.id);
      setFeedbackMessage(`Condition already exists: ${field} ${operator} ${conditionValue.value}`);
      return;
    }
    const nextCondition: QueryFilterCondition = {
      id: `cond_detail_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      field,
      operator,
      value: conditionValue.value,
      valueType: conditionValue.valueType
    };
    applyConditionsAndRun([...workspace.conditions, nextCondition], nextCondition.id);
    setFeedbackMessage("");
  }

  function addGlobalMatchFromLogDetailValue(value: string) {
    const text = stripAnsi(value).trim();
    if (!text || text.length > 256) {
      return;
    }
    const existingCondition = workspace.conditions.find(
      (condition) => isGlobalMatchField(condition.field) && String(condition.value) === text
    );
    if (existingCondition) {
      workspace.setActiveConditionId(existingCondition.id);
      setFeedbackMessage(`${GLOBAL_MATCH_DISPLAY_LABEL} already exists: ${text}`);
      return;
    }
    const nextCondition: QueryFilterCondition = {
      id: `cond_detail_global_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      field: GLOBAL_MATCH_FIELD,
      operator: "like",
      value: text,
      valueType: "string"
    };
    applyConditionsAndRun([...workspace.conditions, nextCondition], nextCondition.id);
    setFeedbackMessage("");
  }

  function addConditionFromFieldStatsValue(
    fieldRef: QueryFieldRef,
    value: string,
    operator: "=" | "!=" = "=",
    conditionField?: string
  ) {
    const directConditionField =
      conditionField ??
      (fieldRef.source === "tag_path" || (fieldRef.source === "column" && fieldRef.isAccelerated)
        ? fieldRef.fieldKey
        : "");
    if (directConditionField) {
      addConditionFromLogDetail(directConditionField, value, operator);
      closeAllFieldStats();
      return;
    }
    addGlobalMatchFromLogDetailValue(value);
    closeAllFieldStats();
  }

  function openLinkQueryModal(row: NormalizedLogRow, field: string, value: unknown) {
    const text = formatLogDetailValue(value).trim();
    const timeMs = getLogRowTimeMs(row);
    if (!text || text === "—") {
      setFeedbackMessage("Correlation requires a valid field value");
      return;
    }
    if (!timeMs) {
      setFeedbackMessage("Current log has no recognizable time for correlation");
      return;
    }
    setLinkQueryAnchor({ field, value: text, timeMs });
    setLinkQueryWindowMinutes(5);
    setLinkQuerySelectedTableIds(workspace.selectedTableId ? [workspace.selectedTableId] : []);
  }

  function closeLinkQueryModal() {
    setLinkQueryAnchor(null);
  }

  function renderLogDetailFieldActions(
    row: NormalizedLogRow,
    displayField: string,
    value: unknown,
    options: {
      conditionField?: string;
      statsPreferRawLog?: boolean;
      statsFieldRef?: QueryFieldRef;
    } = {}
  ) {
    const conditionField = options.conditionField ?? displayField;
    const displayValue = formatLogDetailValue(value);
    const canCopyValue = isPresentLogValue(value) && displayValue.trim() !== "—";
    const canUseCondition = canCreateConditionFromDetailValue(conditionField, value);
    const canUseStats = canOpenFieldStats(displayField, value);
    const canUseAnalysis = canStartAIAnalysisFromField(conditionField, value);
    const detailColumnOption =
      resultColumnOptions.find((item) => item.key === conditionField) ??
      resultColumnOptions.find((item) => item.key === displayField);
    const canToggleColumn = Boolean(detailColumnOption && detailColumnOption.kind === "field");
    const detailColumnVisible = detailColumnOption
      ? visibleResultColumns.some((column) => column.key === detailColumnOption.key)
      : false;
    const hasActions = canCopyValue || canUseCondition || canUseStats || canUseAnalysis || canToggleColumn;

    if (!hasActions) {
      return null;
    }

    return (
      <span className="cv-query-detail__row-actions" aria-label={`${displayField} field actions`}>
        {canUseCondition ? (
          <>
            <EuiToolTip content={`Filter for ${conditionField} = ${displayValue}`}>
              <button
                type="button"
                className="cv-query-detail__icon-button cv-query-detail__icon-button--quick"
                aria-label={`Filter for ${conditionField} = ${displayValue}`}
                onClick={(event) => {
                  event.stopPropagation();
                  addConditionFromLogDetail(conditionField, value);
                }}
              >
                <EuiIcon type="filterInclude" size="s" aria-hidden="true" />
              </button>
            </EuiToolTip>
            <EuiToolTip content={`Filter out ${conditionField} = ${displayValue}`}>
              <button
                type="button"
                className="cv-query-detail__icon-button cv-query-detail__icon-button--quick"
                aria-label={`Filter out ${conditionField} = ${displayValue}`}
                onClick={(event) => {
                  event.stopPropagation();
                  addConditionFromLogDetail(conditionField, value, "!=");
                }}
              >
                <EuiIcon type="filterExclude" size="s" aria-hidden="true" />
              </button>
            </EuiToolTip>
          </>
        ) : null}
        {canCopyValue ? (
          <EuiToolTip content={`Copy ${displayField} value`}>
            <button
              type="button"
              className="cv-query-detail__icon-button cv-query-detail__icon-button--secondary"
              aria-label={`Copy ${displayField} value`}
              onClick={(event) => {
                event.stopPropagation();
                void copyLogDetailValue(displayField, value);
              }}
            >
              <EuiIcon type="copyClipboard" size="s" aria-hidden="true" />
            </button>
          </EuiToolTip>
        ) : null}
        {canToggleColumn && detailColumnOption ? (
          <EuiToolTip content={detailColumnVisible ? `Remove ${detailColumnOption.label} column` : `Add ${detailColumnOption.label} column`}>
            <button
              type="button"
              className="cv-query-detail__icon-button cv-query-detail__icon-button--secondary"
              aria-label={detailColumnVisible ? `Remove ${detailColumnOption.label} column` : `Add ${detailColumnOption.label} column`}
              onClick={(event) => {
                event.stopPropagation();
                toggleLogDetailColumn(detailColumnOption.key, detailColumnOption.label);
              }}
            >
              <EuiIcon type={detailColumnVisible ? "minusInCircle" : "listAdd"} size="s" aria-hidden="true" />
            </button>
          </EuiToolTip>
        ) : null}
        {canUseStats ? (
          <EuiToolTip content={`View top values for ${displayField}`}>
            <button
              type="button"
              className="cv-query-detail__icon-button cv-query-detail__icon-button--secondary"
              aria-label={`View top values for ${displayField}`}
              onClick={(event) => {
                event.stopPropagation();
                void openFieldStatsModal(displayField, value, options.statsPreferRawLog, options.statsFieldRef);
              }}
            >
              <EuiIcon type="stats" size="s" aria-hidden="true" />
            </button>
          </EuiToolTip>
        ) : null}
        {canUseAnalysis ? (
          <EuiToolTip content={`Correlate logs by ${conditionField}`}>
            <button
              type="button"
              className="cv-query-detail__icon-button cv-query-detail__icon-button--secondary"
              aria-label={`Correlate logs by ${conditionField}`}
              onClick={(event) => {
                event.stopPropagation();
                openLinkQueryModal(row, conditionField, value);
              }}
            >
              <EuiIcon type="timelineWithArrow" size="s" aria-hidden="true" />
            </button>
          </EuiToolTip>
        ) : null}
      </span>
    );
  }

  function renderLogDetailFieldCell(
    row: NormalizedLogRow,
    displayField: string,
    value: unknown,
    options: {
      title?: string;
      conditionField?: string;
      statsPreferRawLog?: boolean;
      statsFieldRef?: QueryFieldRef;
    } = {}
  ) {
    return (
      <strong className="cv-query-detail__field-cell" title={options.title ?? displayField}>
        <span className="cv-query-detail__key-text">{displayField}</span>
        {renderLogDetailFieldActions(row, displayField, value, options)}
      </strong>
    );
  }

  function renderLogDetailValueCell(value: unknown) {
    const displayValue = formatLogDetailValue(value);
    return (
      <span className="cv-query-detail__value-text" title={displayValue}>
        {displayValue}
      </span>
    );
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
      setFeedbackMessage("Select at least one log table");
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
    const range = buildEndingNowTimeRange(DEFAULT_TIME_RANGE_MINUTES);
    applyTimeRange(range, buildAbsolutePickerRange(range));
    workspace.setSelectedInstanceId(instance.id);
    workspace.setSelectedDatabase(database.name);
    workspace.setSelectedTable(table.name);
    setSourcePickerOpen(false);
    setSourceSearch("");
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
      setFeedbackMessage("Log table is missing or was removed");
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
      setFeedbackMessage(`Added ${target.databaseName}.${target.tableName}`);
      return;
    }
    if (target.databaseName) {
      setFeedbackMessage(`Focused ${target.databaseName}`);
    }
  }

  function closeInstanceContextMenu() {
    setTreeContextMenu((current) =>
      current.items.length > 0 ? { ariaLabel: "Node actions", items: [], x: 0, y: 0 } : current
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
      title: "Delete database",
      content: `Delete database ${database.name}? This action cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteQueryDatabase(database.id);
        await workspace.refreshSourceTree({ instanceId: instance.id });
        setFeedbackMessage(`Deleted ${database.name}`);
      }
    });
  }

  function requestDeleteTable(
    instance: QuerySourceInstance,
    database: QuerySourceDatabase,
    table: QuerySourceTable
  ) {
    setConfirmState({
      title: "Delete table",
      content: `Delete table ${table.name}? This action cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteQueryTable(table.id);
        await workspace.refreshSourceTree({
          instanceId: instance.id,
          databaseName: database.name
        });
        setFeedbackMessage(`Deleted ${table.name}`);
      }
    });
  }

  function openEditConditionModal(conditionId: string) {
    const condition = workspace.conditions.find((item) => item.id === conditionId);
    if (!condition) {
      return;
    }
    workspace.setActiveConditionId(conditionId);
    setConditionDraft({ ...condition });
    setConditionModalMode("edit");
    setInlineFieldPickerOpen(false);
    setFieldPickerOpen(false);
    setConditionModalOpen(true);
  }

  function closeConditionModal() {
    setFieldPickerOpen(false);
    setConditionModalOpen(false);
    setConditionDraft(null);
  }

  function handleConditionModalBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    conditionModalBackdropPressedRef.current = event.target === event.currentTarget;
  }

  function handleConditionModalBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && conditionModalBackdropPressedRef.current) {
      closeConditionModal();
    }
    conditionModalBackdropPressedRef.current = false;
  }

  function saveConditionModal() {
    if (!conditionDraft) {
      return;
    }
    if (isGlobalMatchField(conditionDraft.field) && workspace.analysisFields.supportsGlobalMatch === false) {
      setFeedbackMessage(`Current log table has no log content field, cannot use ${GLOBAL_MATCH_DISPLAY_LABEL}`);
      return;
    }
    const normalizedDraft = {
      ...conditionDraft,
      valueType: isGlobalMatchField(conditionDraft.field) ? "string" as const : conditionDraft.valueType,
      operator: normalizeConditionOperator(
        conditionDraft.field,
        conditionDraft.operator,
        isGlobalMatchField(conditionDraft.field) ? "string" : conditionDraft.valueType
      )
    };
    const nextConditions =
      conditionModalMode === "create"
        ? [...workspace.conditions, normalizedDraft]
        : workspace.conditions.map((item) => (item.id === normalizedDraft.id ? normalizedDraft : item));
    workspace.setConditions(nextConditions);
    workspace.setActiveConditionId(null);
    closeConditionModal();
    void workspace.runQuery(1, timeRange ? toSecondRange(timeRange) : undefined, nextConditions);
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
    setFeedbackMessage("");
    void workspace.runQuery(1, timeRange ? toSecondRange(timeRange) : undefined, nextConditions);
  }

  const activeCondition = useMemo(
    () => workspace.conditions.find((item) => item.id === workspace.activeConditionId) ?? null,
    [workspace.activeConditionId, workspace.conditions]
  );

  const conditionFieldOptions = useMemo(
    () =>
      ([...(workspace.suggestionFieldOptions as QueryFieldPickerOption[])]).sort((left, right) => {
        const leftIsGlobal = isGlobalMatchField(left.field);
        const rightIsGlobal = isGlobalMatchField(right.field);
        if (leftIsGlobal !== rightIsGlobal) {
          return leftIsGlobal ? -1 : 1;
        }
        return compareResultFieldColumns(left.field, right.field);
      }),
    [workspace.suggestionFieldOptions]
  );
  const inlineFieldPickerOptions = useMemo(() => {
    const search = formatConditionFieldInputValue(inlineConditionDraft.field).trim().toLowerCase();
    if (!search || isGlobalMatchField(inlineConditionDraft.field)) {
      return conditionFieldOptions;
    }
    return conditionFieldOptions.filter((item) =>
      formatConditionFieldLabel(item.field).toLowerCase().includes(search)
    );
  }, [conditionFieldOptions, inlineConditionDraft.field]);
  const inlineFieldPickerChoices = useMemo(
    () => buildFieldPickerChoices(formatConditionFieldInputValue(inlineConditionDraft.field), inlineFieldPickerOptions),
    [inlineConditionDraft.field, inlineFieldPickerOptions]
  );

  useEffect(() => {
    if (!inlineFieldPickerOpen) {
      return;
    }
    setInlineFieldPickerActiveIndex((current) => {
      if (inlineFieldPickerChoices.length === 0) {
        return 0;
      }
      return Math.min(Math.max(current, 0), inlineFieldPickerChoices.length - 1);
    });
  }, [inlineFieldPickerChoices.length, inlineFieldPickerOpen]);

  useEffect(() => {
    if (inlineFieldPickerOpen) {
      setInlineFieldPickerActiveIndex(0);
    }
  }, [inlineConditionDraft.field, inlineFieldPickerOpen]);

  const inlineOperatorOptions = useMemo(() => {
    return getCompatibleOperatorOptions(inlineConditionDraft.field, inlineConditionDraft.valueType);
  }, [inlineConditionDraft.field, inlineConditionDraft.valueType]);

  const isGlobalMatchDraft = Boolean(conditionDraft && isGlobalMatchField(conditionDraft.field));
  const isGlobalMatchUnsupported =
    isGlobalMatchDraft && workspace.analysisFields.supportsGlobalMatch === false;
  const conditionOperatorOptions = useMemo(
    () =>
      conditionDraft
        ? getCompatibleOperatorOptions(conditionDraft.field, conditionDraft.valueType)
        : queryOperatorOptions,
    [conditionDraft?.field, conditionDraft?.valueType]
  );

  function applyConditionFieldDefaults(
    condition: QueryFilterCondition,
    field: string
  ): QueryFilterCondition {
    const normalizedField = parseConditionFieldInput(field);
    const matched = conditionFieldOptions.find((item) => item.field === normalizedField);
    const nextValueType = isGlobalMatchField(normalizedField) ? "string" : matched?.valueType ?? condition.valueType;
    let nextOperator = condition.operator;

    if (isGlobalMatchField(normalizedField)) {
      nextOperator = nextOperator === "not like" ? "not like" : "like";
    } else if (isGlobalMatchField(condition.field) && condition.operator === "like") {
      nextOperator = "=";
    }

    nextOperator = normalizeConditionOperator(normalizedField, nextOperator, nextValueType);

    return {
      ...condition,
      field: normalizedField,
      operator: nextOperator,
      valueType: nextValueType
    };
  }

  function handleConditionDraftFieldChange(field: string) {
    setConditionDraft((current) => (current ? applyConditionFieldDefaults(current, field) : current));
  }

  function handleInlineConditionFieldChange(field: string) {
    setInlineFieldPickerActiveIndex(0);
    setInlineConditionDraft((current) => {
      const next = applyConditionFieldDefaults(current, field);
      const normalizedField = parseConditionFieldInput(field);
      const matched = conditionFieldOptions.find((item) => item.field === normalizedField);
      return matched || isGlobalMatchField(normalizedField) ? next : { ...next, valueType: "string" };
    });
  }

  function selectInlineFieldPickerChoice(index: number) {
    const choice = inlineFieldPickerChoices[index];
    if (!choice) {
      return;
    }
    handleInlineConditionFieldChange(choice.field);
    setInlineFieldPickerOpen(false);
    window.setTimeout(() => {
      inlineConditionValueInputRef.current?.focus();
    }, 0);
  }

  function handleInlineFieldPickerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) {
      return;
    }

    if (event.key === "Escape") {
      if (!inlineFieldPickerOpen) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setInlineFieldPickerOpen(false);
      return;
    }

    if (event.key === "Enter") {
      if (!inlineFieldPickerOpen || inlineFieldPickerChoices.length === 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      selectInlineFieldPickerChoice(inlineFieldPickerActiveIndex);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setInlineFieldPickerOpen(true);
    setInlineFieldPickerActiveIndex((current) => {
      const lastIndex = inlineFieldPickerChoices.length - 1;
      if (lastIndex < 0) {
        return 0;
      }
      if (!inlineFieldPickerOpen) {
        return event.key === "ArrowUp" ? lastIndex : 0;
      }
      return event.key === "ArrowDown" ? Math.min(current + 1, lastIndex) : Math.max(current - 1, 0);
    });
  }

  function findPreferredResultField(candidates: readonly string[]) {
    const catalogMatch = candidates.find((field) => conditionFieldOptions.some((item) => item.field === field));
    if (catalogMatch) {
      return catalogMatch;
    }
    return candidates.find((field) => normalizedLogRows.some((row) => isPresentLogValue(row.parsed[field]))) ?? "";
  }

  function getResultColumnConditionField(column: QueryResultColumn) {
    if (column.kind === "field") {
      return column.key;
    }
    if (column.key === "__level") {
      return findPreferredResultField(LOG_LEVEL_FIELD_KEYS) || normalizedLogRows.find((row) => row.levelField)?.levelField || "";
    }
    if (column.key === "__message") {
      return findPreferredResultField(["msg", "message", "content", "body", "_raw_log_"]);
    }
    if (column.key === "__time") {
      return findPreferredResultField(LOG_TIME_FIELD_KEYS);
    }
    return "";
  }

  function getResultColumnSampleValue(column: QueryResultColumn, field: string) {
    for (const row of normalizedLogRows) {
      if (column.key === "__time") {
        const value = firstPresentValue(row.parsed, LOG_TIME_FIELD_KEYS);
        if (isPresentLogValue(value)) {
          return value;
        }
      } else if (column.key === "__level") {
        if (isPresentLogValue(row.levelText) && row.levelText !== "-") {
          return row.levelText;
        }
      } else if (column.key === "__message") {
        const value = firstPresentValue(row.parsed, ["msg", "message", "content", "body", "_raw_log_"]);
        if (isPresentLogValue(value)) {
          return value;
        }
      } else if (isPresentLogValue(row.parsed[field])) {
        return row.parsed[field];
      }
    }
    return "";
  }

  function startResultColumnFilter(column: QueryResultColumn) {
    const field = getResultColumnConditionField(column);
    if (!field) {
      setFeedbackMessage(`${column.label} cannot be used as a condition`);
      return;
    }
    setInlineConditionDraft(applyConditionFieldDefaults(createConditionDraft(), field));
    setQueryPreviewOpen(false);
    setQueryHistoryMenuOpen(false);
    setSavedQueryMenuOpen(false);
    setFilterComposerOpen(true);
    setInlineFieldPickerOpen(false);
    setResultColumnMenuKey(null);
  }

  function showResultColumnTopValues(column: QueryResultColumn) {
    const field = getResultColumnConditionField(column);
    if (!canShowFieldStatsForField(field)) {
      setFeedbackMessage(`${column.label} cannot show top values`);
      return;
    }
    const sampleValue = getResultColumnSampleValue(column, field);
    setResultColumnMenuKey(null);
    void openFieldStatsModal(column.label, sampleValue, false, buildDetailFieldRef(field, sampleValue));
  }

  function buildFieldStatsView(statsState: QueryFieldStatsState): QueryFieldStatsView {
    const unsupportedError = isUnsupportedLogContentQueryError(statsState.error);
    const loadedStats = buildLoadedFieldStatsItems(normalizedLogRows, statsState.field, statsState.fieldRef);
    const shouldUseLoaded =
      !statsState.loading &&
      (unsupportedError || (!statsState.error && statsState.data?.items.length === 0));
    const items = statsState.data?.items.length
      ? statsState.data.items
      : shouldUseLoaded
      ? loadedStats.items
      : [];
    const total = statsState.data?.items.length
      ? statsState.data.total
      : shouldUseLoaded
      ? loadedStats.total
      : 0;
    const source = statsState.data?.items.length
      ? "Full range"
      : shouldUseLoaded && loadedStats.items.length > 0
      ? "Current page"
      : "";
    return {
      unsupportedError,
      shouldUseLoaded,
      items,
      total,
      source
    };
  }

  function renderFieldStatsContent(statsState: QueryFieldStatsState, statsView = buildFieldStatsView(statsState)) {
    return (
      <div className="cv-query-field-stats">
        {statsState.loading ? <QueryFieldStatsLoadingState /> : null}
        {statsState.error && !statsView.unsupportedError ? (
          <div className="cv-query-alert" role="alert">{statsState.error}</div>
        ) : null}
        {!statsState.loading &&
        statsView.items.length === 0 &&
        (statsView.unsupportedError || (!statsState.error && statsState.data?.items.length === 0)) ? (
          <div className="cv-query-empty-text">No data</div>
        ) : null}
        {statsView.items.map((item) => {
          const conditionField = statsView.shouldUseLoaded
            ? statsState.fieldRef.fieldKey
            : statsState.fieldRef.source === "tag_path" ||
              (statsState.fieldRef.source === "column" && statsState.fieldRef.isAccelerated)
            ? statsState.fieldRef.fieldKey
            : "";
          const targetLabel = conditionField || GLOBAL_MATCH_DISPLAY_LABEL;
          return (
            <div key={`${item.value}-${item.count}`} className="cv-query-field-stats__item">
              <EuiToolTip
                anchorClassName="cv-query-field-stats__value-anchor"
                content={item.value}
                display="block"
                position="top"
              >
                <span className="cv-query-field-stats__value">{item.value}</span>
              </EuiToolTip>
              <span className="cv-query-field-stats__bar" aria-hidden="true">
                <span style={{ width: `${Math.max(item.percentage, 1)}%` }} />
              </span>
              <span className="cv-query-field-stats__meta">
                <strong>{formatPercentage(item.percentage)}</strong>
                <span>{formatCount(item.count)}</span>
              </span>
              <span className="cv-query-field-stats__actions">
                <EuiToolTip content={`Filter for ${targetLabel} = ${item.value}`}>
                  <button
                    type="button"
                    className="cv-query-field-stats__action"
                    aria-label={`Filter for ${targetLabel} = ${item.value}`}
                    onClick={() => addConditionFromFieldStatsValue(
                      statsState.fieldRef,
                      item.value,
                      "=",
                      conditionField || undefined
                    )}
                  >
                    <EuiIcon type="filterInclude" size="s" aria-hidden="true" />
                  </button>
                </EuiToolTip>
                {conditionField ? (
                  <EuiToolTip content={`Filter out ${conditionField} = ${item.value}`}>
                    <button
                      type="button"
                      className="cv-query-field-stats__action"
                      aria-label={`Filter out ${conditionField} = ${item.value}`}
                      onClick={() => addConditionFromFieldStatsValue(
                        statsState.fieldRef,
                        item.value,
                        "!=",
                        conditionField
                      )}
                    >
                      <EuiIcon type="filterExclude" size="s" aria-hidden="true" />
                    </button>
                  </EuiToolTip>
                ) : null}
                <EuiToolTip content={`Copy ${statsState.field} value`}>
                  <button
                    type="button"
                    className="cv-query-field-stats__action"
                    aria-label={`Copy ${statsState.field} value ${item.value}`}
                    onClick={() => {
                      void copyLogDetailValue(statsState.field, item.value);
                    }}
                  >
                    <EuiIcon type="copyClipboard" size="s" aria-hidden="true" />
                  </button>
                </EuiToolTip>
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  function openFieldCatalogTopValues(item: QueryFieldCatalogItem) {
    if (!item.canShowTopValues) {
      return;
    }
    if (expandedInlineFieldStatsKeys.has(item.key)) {
      collapseInlineFieldStats(item.key);
      return;
    }
    if (inlineFieldStatsByKey[item.key]) {
      setExpandedInlineFieldStatsKeys((current) => {
        const next = new Set(current);
        next.add(item.key);
        return next;
      });
      return;
    }
    void openInlineFieldStats(item);
  }

  function toggleFieldCatalogColumn(item: QueryFieldCatalogItem) {
    if (!item.canToggleColumn) {
      return;
    }
    toggleLogDetailColumn(item.columnKey, item.label);
  }

  function renderFieldCatalogItem(item: QueryFieldCatalogItem) {
    const columnActionLabel = item.isColumnVisible ? `Remove ${item.label} column` : `Add ${item.label} column`;
    const inlineStatsState = inlineFieldStatsByKey[item.key];
    const inlineStatsView = inlineStatsState ? buildFieldStatsView(inlineStatsState) : null;
    const isTopValuesOpen = expandedInlineFieldStatsKeys.has(item.key);
    return (
      <div
        key={item.key}
        className={
          isTopValuesOpen
            ? "cv-query-fields-panel__item cv-query-fields-panel__item--expanded"
            : "cv-query-fields-panel__item"
        }
      >
        <div className="cv-query-fields-panel__item-row">
          <button
            type="button"
            className={
              item.canShowTopValues
                ? "cv-query-fields-panel__field"
                : "cv-query-fields-panel__field cv-query-fields-panel__field--disabled"
            }
            aria-label={item.canShowTopValues ? `Top values for ${item.label}` : item.label}
            aria-disabled={!item.canShowTopValues}
            aria-expanded={item.canShowTopValues ? isTopValuesOpen : undefined}
            disabled={!item.canShowTopValues}
            title={item.label}
            onClick={() => openFieldCatalogTopValues(item)}
          >
            {item.canShowTopValues ? (
              <EuiIcon
                className="cv-query-fields-panel__field-toggle"
                type={isTopValuesOpen ? "arrowDown" : "arrowRight"}
                size="s"
                aria-hidden="true"
              />
            ) : (
              <span
                className="cv-query-fields-panel__field-toggle cv-query-fields-panel__field-toggle--empty"
                aria-hidden="true"
              />
            )}
            <span className="cv-query-fields-panel__field-name">{item.label}</span>
          </button>
          <span className="cv-query-fields-panel__actions" aria-label={`${item.label} actions`}>
            {item.canToggleColumn ? (
              <EuiButtonIcon
                aria-label={columnActionLabel}
                className="cv-query-fields-panel__icon-button"
                color="text"
                iconSize="s"
                iconType={item.isColumnVisible ? "minusInCircle" : "plusInCircle"}
                size="xs"
                title={columnActionLabel}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFieldCatalogColumn(item);
                }}
              />
            ) : null}
          </span>
        </div>
        {isTopValuesOpen ? (
          <div
            className="cv-query-fields-panel__stats"
            role="region"
            aria-label={`${inlineStatsState?.field ?? item.label} top values`}
          >
            <div className="cv-query-fields-panel__stats-header">
              <span>Top values</span>
              {inlineStatsState?.loading ? (
                <button
                  type="button"
                  className="cv-query-fields-panel__stats-cancel"
                  onClick={() => collapseInlineFieldStats(item.key)}
                  aria-label={`Cancel ${inlineStatsState.field} top values query`}
                >
                  Cancel
                </button>
              ) : null}
            </div>
            {inlineStatsState ? renderFieldStatsContent(inlineStatsState, inlineStatsView ?? undefined) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderFieldCatalogTabs() {
    return (
      <EuiTabs className="cv-query-fields-panel__tabs" size="s" expand={false} aria-label="Field groups">
        {fieldCatalogGroups.map((group) => (
          <EuiTab
            key={group.key}
            className="cv-query-fields-panel__tab"
            isSelected={group.key === activeFieldCatalogGroupKey}
            onClick={() => setActiveFieldCatalogGroupKey(group.key)}
            aria-label={`${group.title} ${group.items.length}`}
          >
            <span>{group.title}</span>
            <strong>{formatCount(group.items.length)}</strong>
          </EuiTab>
        ))}
      </EuiTabs>
    );
  }

  function renderFieldCatalogPanel() {
    return (
      <div className="cv-query-fields-panel" role="dialog" aria-label="Fields">
        <div className="cv-query-fields-panel__header">
          <strong>Fields</strong>
          <span>{formatCount(visibleFieldCatalogCount)}</span>
          <EuiButtonIcon
            aria-label="Close fields"
            className="cv-query-fields-panel__close"
            color="text"
            iconSize="s"
            iconType="cross"
            size="xs"
            title="Close fields"
            onClick={closeFieldCatalogPanel}
          />
        </div>
        <div className="cv-query-fields-panel__search">
          <EuiFieldSearch
            compressed
            fullWidth
            inputRef={(node) => {
              fieldCatalogSearchInputRef.current = node;
            }}
            value={fieldCatalogSearch}
            onChange={(event) => setFieldCatalogSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                if (event.currentTarget.value) {
                  event.preventDefault();
                  event.stopPropagation();
                  setFieldCatalogSearch("");
                } else {
                  closeFieldCatalogPanel();
                }
              }
            }}
            placeholder="Search fields"
            aria-label="Search fields"
          />
        </div>
        {renderFieldCatalogTabs()}
        <div className="cv-query-fields-panel__body">
          {activeFieldCatalogGroup.items.length > 0 ? (
            <div className="cv-query-fields-panel__group-list">
              {activeFieldCatalogGroup.items.map(renderFieldCatalogItem)}
            </div>
          ) : (
            <div className="cv-query-fields-panel__empty">No data</div>
          )}
        </div>
        <div className="cv-query-fields-panel__footer">
          <button type="button" className="cv-query-fields-panel__reset" onClick={resetResultColumns}>
            Reset defaults
          </button>
        </div>
      </div>
    );
  }

  function addInlineCondition() {
    const field = parseConditionFieldInput(inlineConditionDraft.field).trim();
    const value = String(inlineConditionDraft.value ?? "").trim();
    const effectiveValueType = isGlobalMatchField(field) ? "string" : inlineConditionDraft.valueType;
    const effectiveOperator = normalizeConditionOperator(field, inlineConditionDraft.operator, effectiveValueType);
    if (!field || !value) {
      setFilterComposerOpen(true);
      setFeedbackMessage("Enter a field and value");
      return;
    }
    if (isGlobalMatchField(field) && workspace.analysisFields.supportsGlobalMatch === false) {
      setFilterComposerOpen(true);
      setFeedbackMessage(`Current log table has no log content field, cannot use ${GLOBAL_MATCH_DISPLAY_LABEL}`);
      return;
    }
    if (
      effectiveValueType !== "string" &&
      (effectiveOperator === "like" || effectiveOperator === "not like")
    ) {
      setFilterComposerOpen(true);
      setFeedbackMessage("like only supports string fields");
      return;
    }
    if (effectiveValueType === "number" && !Number.isFinite(Number(value))) {
      setFilterComposerOpen(true);
      setFeedbackMessage(`${field} requires a numeric value`);
      return;
    }
    const nextCondition: QueryFilterCondition = {
      ...inlineConditionDraft,
      id: `cond_inline_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      field,
      operator: effectiveOperator,
      valueType: effectiveValueType,
      value
    };
    const nextConditions = [...workspace.conditions, nextCondition];
    workspace.setConditions(nextConditions);
    workspace.setActiveConditionId(null);
    setInlineConditionDraft(createConditionDraft());
    setFilterComposerOpen(false);
    setInlineFieldPickerOpen(false);
    void workspace.runQuery(1, timeRange ? toSecondRange(timeRange) : undefined, nextConditions);
  }

  function cancelInlineCondition() {
    setInlineConditionDraft(createConditionDraft());
    setInlineFieldPickerOpen(false);
    setFilterComposerOpen(false);
  }

  function openInlineConditionComposer() {
    setQueryPreviewOpen(false);
    setQueryHistoryMenuOpen(false);
    setSavedQueryMenuOpen(false);
    setFieldPickerOpen(false);
    setInlineFieldPickerActiveIndex(0);
    setFilterComposerOpen(true);
  }

  function handleInlineConditionComposerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest(".cv-query-filter-composer__operator")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (inlineFieldPickerOpen) {
      setInlineFieldPickerOpen(false);
      return;
    }
    cancelInlineCondition();
  }

  function removeConditionAndRun(conditionId: string) {
    const nextConditions = workspace.conditions.filter((item) => item.id !== conditionId);
    workspace.setConditions(nextConditions);
    workspace.setActiveConditionId(nextConditions[0]?.id ?? null);
    void workspace.runQuery(1, timeRange ? toSecondRange(timeRange) : undefined, nextConditions);
  }

  function applyQueryHistoryItem(query: string) {
    workspace.applySuggestion(query);
    setQueryHistoryMenuOpen(false);
    setFeedbackMessage("");
  }

  function applyAutocompleteItem(query: string) {
    workspace.setQueryText(query);
    setQueryInputFocused(false);
  }

  function renderHistogramEmptyState() {
    if (workspace.chartLoading) {
      return <QueryHistogramLoadingState />;
    }

    if (!workspace.selectedTableId) {
      return (
        <QueryEmptyState
          variant="histogram"
          icon={<EuiIcon type="table" size="m" />}
          title="No data"
        />
      );
    }

    if (!workspace.logs) {
      return (
        <QueryEmptyState
          variant="histogram"
          icon={<EuiIcon type="clock" size="m" />}
          title="No data"
        />
      );
    }

    if (workspace.logs.logs.length > 0) {
      return (
        <QueryEmptyState
          variant="histogram"
          tone="empty"
          icon={<EuiIcon type="visBarVertical" size="m" />}
          title="No data"
        />
      );
    }

    return (
      <QueryEmptyState
        variant="histogram"
        tone="empty"
        icon={<EuiIcon type="search" size="m" />}
        title="No data"
      />
    );
  }

  function renderResultEmptyState() {
    if (workspace.loading && (!workspace.logs || workspace.logs.logs.length === 0)) {
      return <QueryResultLoadingState onCancel={workspace.cancelQuery} />;
    }

    if (!workspace.selectedTableId) {
      return (
        <QueryEmptyState
          icon={<EuiIcon type="table" size="m" />}
          title="No data"
        />
      );
    }

    if (!workspace.logs) {
      return (
        <QueryEmptyState
          icon={<EuiIcon type="discoverApp" size="m" />}
          title="No data"
        />
      );
    }

    return (
      <QueryEmptyState
        tone="empty"
        icon={<EuiIcon type="search" size="m" />}
        title="No data"
      />
    );
  }

  const resultLoadedCount = workspace.logs?.logs.length ?? 0;
  const currentResultPage = Math.max(1, workspace.page);
  const resultRangeStart = resultLoadedCount > 0 ? (currentResultPage - 1) * workspace.pageSize + 1 : 0;
  const resultRangeEnd =
    resultLoadedCount > 0
      ? (currentResultPage - 1) * workspace.pageSize + resultLoadedCount
      : 0;
  const resultKnownTotalCount = workspace.logs ? Math.max(workspace.logs.count, chartTotalCount) : 0;
  const hasResultKnownTotal = resultKnownTotalCount > 0;
  const resultTotalCount =
    workspace.logs && hasResultKnownTotal
      ? Math.max(resultKnownTotalCount, resultRangeEnd)
      : resultLoadedCount;
  const resultTotalPages =
    workspace.logs && hasResultKnownTotal
      ? Math.max(1, Math.ceil(resultTotalCount / workspace.pageSize))
      : null;
  const resultHasPreviousPage = workspace.logs !== null && currentResultPage > 1;
  const resultHasNextPage =
    workspace.logs !== null &&
    (hasResultKnownTotal
      ? currentResultPage * workspace.pageSize < resultTotalCount
      : resultLoadedCount >= workspace.pageSize);
  const resultMinimumPageSize = QUERY_PAGE_SIZE_OPTIONS[0];
  const shouldShowResultPageSize =
    workspace.logs !== null &&
    resultLoadedCount > 0 &&
    (resultTotalCount > resultMinimumPageSize ||
      resultLoadedCount >= resultMinimumPageSize ||
      currentResultPage > 1);
  const shouldShowResultPager =
    workspace.logs !== null &&
    resultLoadedCount > 0 &&
    (resultHasPreviousPage || resultHasNextPage || (resultTotalPages ?? 1) > 1);
  const shouldShowResultRangeSummary =
    resultLoadedCount > 0 &&
    (shouldShowResultPager || currentResultPage > 1);
  const resultBarSummaryText =
    resultLoadedCount > 0
      ? shouldShowResultRangeSummary
        ? `${formatCount(resultRangeStart)} - ${formatCount(resultRangeEnd)}`
        : formatRowsLabel(resultLoadedCount)
      : "No data";
  const isUnsupportedLogContentQuery = isUnsupportedLogContentQueryError(workspace.errorMessage);
  const resultBlockingErrorMessage = isUnsupportedLogContentQuery ? "" : workspace.errorMessage;
  const modalFieldStatsView = fieldStatsState ? buildFieldStatsView(fieldStatsState) : null;
  const hasResultRows = Boolean(workspace.logs && workspace.logs.logs.length > 0);
  const currentResultBatchCount = resultLoadedCount;
  const currentResultBatchIndexes = Array.from(
    { length: currentResultBatchCount },
    (_, index) => index
  );
  const allCurrentBatchLogsExpanded =
    currentResultBatchIndexes.length > 0 &&
    currentResultBatchIndexes.every((index) =>
      expandedLogIndexes.has(index)
    );
  const resultBulkExpandControl = currentResultBatchCount > 1 ? (
    <ResultToolbarIconAction
      label={allCurrentBatchLogsExpanded ? "Collapse all" : "Expand all"}
      icon={allCurrentBatchLogsExpanded ? "fold" : "unfold"}
      onClick={toggleAllLoadedLogDetails}
      disabled={resultBulkExpandLoading}
      loading={resultBulkExpandLoading}
      ariaPressed={allCurrentBatchLogsExpanded}
      showIcon={false}
      showLabel
      title={`${allCurrentBatchLogsExpanded ? "Collapse" : "Expand"} current page (${formatCount(currentResultBatchCount)} rows)`}
    />
  ) : null;
  const resultLoadingControl = workspace.loading ? (
    <span className="cv-query-result-bar__loading">
      <span className="cv-query-result-bar__loading-status" role="status" aria-live="polite">
        <span className="cv-query-result-action__spinner cv-query-result-action__spinner--active" aria-hidden="true" />
        <span>Loading</span>
      </span>
      <button
        type="button"
        className="cv-query-result-bar__cancel"
        aria-label="Cancel query"
        onClick={workspace.cancelQuery}
      >
        Cancel
      </button>
    </span>
  ) : null;
  const resultBodyLoadingOverlay = workspace.loading && hasResultRows ? (
    <div className="cv-query-result-body-refresh" aria-live="polite">
      <span className="cv-query-result-body-refresh__pill" role="status" aria-label="Refreshing query results">
        <span className="cv-query-result-action__spinner cv-query-result-action__spinner--active" aria-hidden="true" />
        <span>Refreshing</span>
        <button
          type="button"
          className="cv-query-result-body-refresh__cancel"
          aria-label="Cancel result refresh"
          onClick={workspace.cancelQuery}
        >
          Cancel
        </button>
      </span>
    </div>
  ) : null;
  function renderResultPageSizeControl(placement: "toolbar" | "footer") {
    if (!shouldShowResultPageSize) {
      return null;
    }
    const radioGroupName = `query-result-page-size-${placement}`;
    return (
      <div
        className={`cv-query-page-size cv-query-page-size--${placement}`}
        role="radiogroup"
        aria-label={placement === "toolbar" ? "Rows per page" : "Rows per page footer"}
      >
        <span className="cv-query-page-size__label">Rows</span>
        {QUERY_PAGE_SIZE_OPTIONS.map((size) => (
          <label
            key={size}
            className={
              size === workspace.pageSize
                ? "cv-query-page-size__option cv-query-page-size__option--active"
                : "cv-query-page-size__option"
            }
          >
            <input
              type="radio"
              name={radioGroupName}
              value={size}
              checked={size === workspace.pageSize}
              disabled={workspace.loading}
              onChange={() => changeResultPageSize(size)}
            />
            <span>{size}</span>
          </label>
        ))}
      </div>
    );
  }

  function renderResultPagerControls(placement: "toolbar" | "footer") {
    if (!shouldShowResultPager) {
      return null;
    }
    return (
      <div
        className={`cv-query-pagination__pager cv-query-pagination__pager--${placement}`}
        aria-label={placement === "toolbar" ? "Result page controls" : "Result page controls footer"}
      >
        <button
          type="button"
          className="cv-query-pagination__button"
          aria-label="Previous page"
          disabled={workspace.loading || !resultHasPreviousPage}
          onClick={() => goToResultPage(currentResultPage - 1)}
        >
          <EuiIcon type="arrowLeft" size="s" aria-hidden="true" />
          <span>Previous</span>
        </button>
        <span className="cv-query-pagination__page">
          {resultTotalPages
            ? `${formatCount(currentResultPage)} / ${formatCount(resultTotalPages)}`
            : formatCount(currentResultPage)}
        </span>
        <button
          type="button"
          className="cv-query-pagination__button"
          aria-label="Next page"
          disabled={workspace.loading || !resultHasNextPage}
          onClick={() => goToResultPage(currentResultPage + 1)}
        >
          <span>Next</span>
          <EuiIcon type="arrowRight" size="s" aria-hidden="true" />
        </button>
      </div>
    );
  }
  const resultToolbarPageSizeControl = renderResultPageSizeControl("toolbar");
  const resultToolbarPagerControls = renderResultPagerControls("toolbar");
  const resultFooterPageSizeControl = renderResultPageSizeControl("footer");
  const resultFooterPagerControls = renderResultPagerControls("footer");
  const histogramIntervalSelectOptions = availableHistogramIntervalOptions.map((option) => {
    const label = option.value === "auto" && autoHistogramBucketSizeLabel ? `Auto (${autoHistogramBucketSizeLabel})` : option.label;
    return {
      value: option.value,
      inputDisplay: <span className="cv-query-histogram-interval__value">{label}</span>,
      dropdownDisplay: <span className="cv-query-histogram-interval__option">{label}</span>
    };
  });
  const hasHistogramChartData = histogramChartData.length > 0;
  const canShowHistogramChart = hasHistogramChartData && !histogramCollapsed;
  const hasHistogramSummary = Boolean(histogramSelectionRange);
  const canToggleHistogram = histogramCollapsed || hasHistogramChartData || Boolean(histogramSelectionRange);
  const hasHistogramControls = canToggleHistogram || timeRangeHistory.length > 0;
  const hasHistogramToolbar = hasHistogramSummary || hasHistogramControls;
  const isHistogramEmptyPanel = !histogramCollapsed && !hasHistogramToolbar && !canShowHistogramChart;
  const isResultEmptyPanel = !hasResultRows && !resultBlockingErrorMessage;

  function clearResultBulkExpandTimers() {
    if (resultBulkExpandTimerRef.current !== null) {
      window.clearTimeout(resultBulkExpandTimerRef.current);
      resultBulkExpandTimerRef.current = null;
    }
    if (resultBulkExpandFinishTimerRef.current !== null) {
      window.clearTimeout(resultBulkExpandFinishTimerRef.current);
      resultBulkExpandFinishTimerRef.current = null;
    }
  }

  function toggleAllLoadedLogDetails() {
    if (currentResultBatchIndexes.length === 0 || resultBulkExpandLoading) {
      return;
    }
    clearResultBulkExpandTimers();
    const nextExpanded = !allCurrentBatchLogsExpanded;
    const targetIndexes = [...currentResultBatchIndexes];
    setResultBulkExpandLoading(true);
    resultBulkExpandTimerRef.current = window.setTimeout(() => {
      setExpandedLogIndexes((current) => {
        const next = new Set(current);
        targetIndexes.forEach((index) => {
          if (nextExpanded) {
            next.add(index);
          } else {
            next.delete(index);
          }
        });
        return next;
      });
      resultBulkExpandTimerRef.current = null;
      resultBulkExpandFinishTimerRef.current = window.setTimeout(() => {
        resultBulkExpandFinishTimerRef.current = null;
        setResultBulkExpandLoading(false);
      }, 0);
    }, 0);
  }

  function clearQueryHistory() {
    workspace.clearQueryHistory();
    setQueryHistoryMenuOpen(false);
    setFeedbackMessage("");
  }

  function renderSourcePickerContent() {
    const sourceSearchKeyword = sourceSearch.trim().toLowerCase();
    const hasSourceSearch = sourceSearchKeyword.length > 0;
    const matchesSourceSearch = (...values: Array<string | undefined>) =>
      hasSourceSearch &&
      values.some((value) => String(value ?? "").toLowerCase().includes(sourceSearchKeyword));
    const sourceGroups = workspace.instances
      .map((item) => {
        const isActiveInstance = workspace.selectedInstanceId === item.id;
        const instanceMatches = matchesSourceSearch(item.name, item.desc);
        const databaseGroups = (item.databases ?? [])
          .map((database) => {
            const isActiveDatabase = isActiveInstance && workspace.selectedDatabase === database.name;
            const databaseMatches = matchesSourceSearch(database.name, database.desc, database.cluster);
            const allDatabaseTables = database.tables ?? [];
            const databaseTables =
              !hasSourceSearch || instanceMatches || databaseMatches
                ? allDatabaseTables
                : allDatabaseTables.filter((table) => matchesSourceSearch(table.name, table.desc));
            if (hasSourceSearch && !instanceMatches && !databaseMatches && databaseTables.length === 0) {
              return null;
            }
            return {
              database,
              databaseTables,
              isActiveDatabase,
              isExpandedDatabase: hasSourceSearch || isActiveDatabase
            };
          })
          .filter(Boolean) as Array<{
          database: QuerySourceDatabase;
          databaseTables: QuerySourceTable[];
          isActiveDatabase: boolean;
          isExpandedDatabase: boolean;
        }>;
        if (hasSourceSearch && !instanceMatches && databaseGroups.length === 0) {
          return null;
        }
        return {
          item,
          isActiveInstance,
          isExpandedInstance: hasSourceSearch || isActiveInstance,
          databaseGroups
        };
      })
      .filter(Boolean) as Array<{
      item: QuerySourceInstance;
      isActiveInstance: boolean;
      isExpandedInstance: boolean;
      databaseGroups: Array<{
        database: QuerySourceDatabase;
        databaseTables: QuerySourceTable[];
        isActiveDatabase: boolean;
        isExpandedDatabase: boolean;
      }>;
    }>;

    return (
      <div className="cv-query-source-popover" role="dialog" aria-label="Select data source">
        <div className="cv-query-source-popover__header">
          <div>
            <strong>Sources</strong>
            {workspace.contextLoading ? <span>Loading</span> : null}
          </div>
          {privateLite ? null : (
            <a className="cv-secondary-button" href={buildV2RouteHref("query/ingestion")}>
              Create log library
            </a>
          )}
        </div>
        <div className="cv-query-source-popover__search">
          <EuiFieldSearch
            compressed
            fullWidth
            inputRef={(node) => {
              sourceSearchInputRef.current = node;
            }}
            aria-label="Search sources"
            placeholder="Search sources"
            value={sourceSearch}
            onChange={(event) => setSourceSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && sourceSearch) {
                event.preventDefault();
                event.stopPropagation();
                setSourceSearch("");
              }
            }}
          />
        </div>
        <div className="cv-query-source-popover__body">
          <section role="tree" aria-label="Instances, databases, and log tables" className="cv-query-tree">
            {sourceGroups.map(({ item, isActiveInstance, isExpandedInstance, databaseGroups }) => {
              return (
                <div
                  key={item.id}
                  role="treeitem"
                  aria-label={item.name}
                  aria-expanded={isExpandedInstance}
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
                        openContextMenu(event.clientX, event.clientY, "Instance actions", [
                          {
                            key: "create-database",
                            label: "New database",
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
                  {isExpandedInstance ? (
                    <div role="group" aria-label={`${item.name} databases`} className="cv-query-tree__children">
                      {databaseGroups.map(({ database, databaseTables, isActiveDatabase, isExpandedDatabase }) => {
                        return (
                          <div key={database.name} className="cv-query-tree__database-group">
                            <button
                              type="button"
                              aria-pressed={isActiveDatabase}
                              aria-label={`Database ${database.name}`}
                              className={`cv-query-tree__database${isActiveDatabase ? " cv-query-tree__database--active" : ""}`}
                              onClick={() => {
                                workspace.setSelectedInstanceId(item.id);
                                workspace.setSelectedDatabase(database.name);
                              }}
                              onContextMenu={(event) => {
                                event.preventDefault();
                                workspace.setSelectedInstanceId(item.id);
                                workspace.setSelectedDatabase(database.name);
                                openContextMenu(event.clientX, event.clientY, "Database actions", [
                                  {
                                    key: "edit-database",
                                    label: "Edit database",
                                    onSelect: () => openEditDatabase(item, database)
                                  },
                                  {
                                    key: "access-log-library",
                                    label: "Add existing table",
                                    onSelect: () => openAccessLogLibrary(item, database.name)
                                  },
                                  {
                                    key: "delete-database",
                                    label: "Delete database",
                                    onSelect: () => requestDeleteDatabase(item, database)
                                  }
                                ]);
                              }}
                            >
                              <span className="cv-query-tree__database-rail" aria-hidden="true" />
                              <span className="cv-query-tree__database-dot" aria-hidden="true" />
                              {database.name}
                            </button>
                            {isExpandedDatabase ? (
                              <div role="group" aria-label={`${database.name} log tables`} className="cv-query-tree__tables">
                                {databaseTables.map((table) => {
                                  const isActiveTable = workspace.selectedTable === table.name;
                                  return (
                                    <button
                                      key={table.name}
                                      type="button"
                                      aria-pressed={isActiveTable}
                                      aria-label={`Table ${table.name}`}
                                      className={`cv-query-tree__table${isActiveTable ? " cv-query-tree__table--active" : ""}`}
                                      onClick={() => selectTableAndQueryRecentLogs(item, database, table)}
                                      onContextMenu={(event) => {
                                        event.preventDefault();
                                        workspace.setSelectedInstanceId(item.id);
                                        workspace.setSelectedDatabase(database.name);
                                        workspace.setSelectedTable(table.name);
                                        openContextMenu(event.clientX, event.clientY, "Table actions", [
                                          {
                                            key: "delete-table",
                                            label: "Delete table",
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
                                  <span className="cv-query-tree__empty">No tables</span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {databaseGroups.length === 0 ? (
                        <span className="cv-query-tree__empty">No databases</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {sourceGroups.length === 0 ? (
              <span className="cv-query-tree__empty">{hasSourceSearch ? "No data" : "No data sources"}</span>
            ) : null}
          </section>
        </div>
      </div>
    );
  }

  const queryHistorySearchKeyword = queryHistorySearch.trim().toLowerCase();
  const visibleQueryHistory = queryHistorySearchKeyword
    ? workspace.queryHistory.filter((query) => query.toLowerCase().includes(queryHistorySearchKeyword))
    : workspace.queryHistory;
  const savedQuerySearchKeyword = savedQuerySearch.trim().toLowerCase();
  const visibleSavedFilterProfiles = savedQuerySearchKeyword
    ? workspace.savedFilterProfiles.filter((profile) => {
        const searchableText = [
          profile.name,
          profile.creator,
          profile.updater,
          profile.database,
          profile.table,
          ...profile.conditions.flatMap((condition) => [
            condition.field,
            condition.operator,
            String(condition.value ?? "")
          ])
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(savedQuerySearchKeyword);
      })
    : workspace.savedFilterProfiles;

  const queryUtilityActions = (
    <div className="cv-query-command-tools" ref={queryUtilityActionsRef}>
      <div className="cv-query-action-row cv-query-action-row--utility">
        <EuiPopover
          anchorPosition="downRight"
          button={
            <button
              type="button"
              className="cv-query-text-action"
              onClick={() => {
                setSavedQueryMenuOpen(false);
                setQueryHistoryMenuOpen((current) => !current);
              }}
              aria-expanded={queryHistoryMenuOpen}
              aria-haspopup="dialog"
              title="Recent queries"
            >
              Recent
            </button>
          }
          closePopover={() => setQueryHistoryMenuOpen(false)}
          display="inlineBlock"
          isOpen={queryHistoryMenuOpen}
          ownFocus={false}
          panelClassName="cv-query-saved__popover-panel"
          panelPaddingSize="none"
          repositionOnScroll
        >
          <div
            className="cv-query-saved__menu cv-query-saved__menu--popover cv-query-saved__menu--history"
            role="dialog"
            aria-label="Recent queries"
          >
            {workspace.queryHistory.length > 0 ? (
              <>
                <div className="cv-query-saved__search">
                  <EuiFieldSearch
                    compressed
                    fullWidth
                    inputRef={(node) => {
                      queryHistorySearchInputRef.current = node;
                    }}
                    aria-label="Search recent queries"
                    placeholder="Search recent queries"
                    value={queryHistorySearch}
                    onChange={(event) => setQueryHistorySearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && queryHistorySearch) {
                        event.preventDefault();
                        event.stopPropagation();
                        setQueryHistorySearch("");
                      }
                    }}
                  />
                </div>
                <div className="cv-query-saved__list">
                  {visibleQueryHistory.map((query, index) => (
                    <article key={`${query}-${index}`} className="cv-query-saved__item cv-query-saved__item--single">
                      <button type="button" onClick={() => applyQueryHistoryItem(query)}>
                        <strong title={query}>{query}</strong>
                      </button>
                    </article>
                  ))}
                  {visibleQueryHistory.length === 0 ? (
                    <div className="cv-query-saved__empty cv-query-saved__empty--inline">No data</div>
                  ) : null}
                </div>
                <div className="cv-query-saved__footer">
                  <button type="button" className="cv-query-saved__footer-action" onClick={clearQueryHistory}>
                    Clear history
                  </button>
                </div>
              </>
            ) : (
              <div className="cv-query-saved__empty">No data</div>
            )}
          </div>
        </EuiPopover>
        <EuiPopover
          anchorPosition="downRight"
          button={
            <button
              type="button"
              className="cv-query-text-action"
              onClick={() => {
                setQueryHistoryMenuOpen(false);
                setSavedQueryMenuOpen((current) => !current);
              }}
              aria-expanded={savedQueryMenuOpen}
              aria-haspopup="dialog"
              title="Saved queries"
            >
              Saved
            </button>
          }
          closePopover={() => setSavedQueryMenuOpen(false)}
          display="inlineBlock"
          isOpen={savedQueryMenuOpen}
          ownFocus={false}
          panelClassName="cv-query-saved__popover-panel"
          panelPaddingSize="none"
          repositionOnScroll
        >
          <div className="cv-query-saved__menu cv-query-saved__menu--popover" role="dialog" aria-label="Saved queries">
            {workspace.savedFilterLoading ? <div className="cv-query-saved__status">Loading</div> : null}
            {workspace.savedFilterProfiles.length > 0 ? (
              <>
                <div className="cv-query-saved__search">
                  <EuiFieldSearch
                    compressed
                    fullWidth
                    inputRef={(node) => {
                      savedQuerySearchInputRef.current = node;
                    }}
                    aria-label="Search saved queries"
                    placeholder="Search saved queries"
                    value={savedQuerySearch}
                    onChange={(event) => setSavedQuerySearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && savedQuerySearch) {
                        event.preventDefault();
                        event.stopPropagation();
                        setSavedQuerySearch("");
                      }
                    }}
                  />
                </div>
                <div className="cv-query-saved__list">
                  {visibleSavedFilterProfiles.map((profile) => (
                    <article key={profile.id} className="cv-query-saved__item">
                      <button type="button" onClick={() => applySavedFilterProfile(profile)}>
                        <strong>{profile.name}</strong>
                        <span>{formatConditionCountLabel(profile.conditions.length)} · {profile.creator || "system"}</span>
                      </button>
                      <button
                        type="button"
                        className="cv-query-saved__delete"
                        aria-label={`Delete saved query ${profile.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteSavedFilterProfile(profile.id, profile.name);
                        }}
                      >
                        <EuiIcon type="trash" size="s" aria-hidden="true" />
                      </button>
                    </article>
                  ))}
                  {visibleSavedFilterProfiles.length === 0 ? (
                    <div className="cv-query-saved__empty cv-query-saved__empty--inline">No data</div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="cv-query-saved__empty">No data</div>
            )}
            <div className="cv-query-saved__footer">
              <button
                type="button"
                className="cv-query-saved__footer-action cv-query-saved__footer-action--primary"
                onClick={() => {
                  setSavedQueryMenuOpen(false);
                  openSaveQueryModal();
                }}
              >
                Save current query
              </button>
            </div>
          </div>
        </EuiPopover>
        <button
          type="button"
          className="cv-query-text-action cv-query-text-action--share"
          onClick={() => void handleShareQuery()}
          aria-busy={shareLoading}
          disabled={shareLoading}
          title={shareLoading ? "Creating share link" : "Share query"}
        >
          Share
        </button>
      </div>
    </div>
  );

  return (
    <section className={shareMode ? "cv-section-stack cv-query-page cv-query-page--share" : "cv-section-stack cv-query-page"}>
      <h1 className="cv-page-title cv-sr-only">{shareMode ? "Shared results" : "Log query"}</h1>

      <div className="cv-query-shell">
        <div className="cv-query-main">
          {!shareMode ? (
            <div className="cv-query-log-tabs" aria-label="Log table workspace">
              <div className="cv-query-source-anchor" ref={sourcePickerRef}>
                <EuiPopover
                  anchorPosition="downLeft"
                  button={
                    <button
                      type="button"
                      className={sourcePickerOpen ? "cv-query-source-trigger cv-query-source-trigger--open" : "cv-query-source-trigger"}
                      onClick={() =>
                        setSourcePickerOpen((current) => {
                          if (current) {
                            closeInstanceContextMenu();
                          }
                          return !current;
                        })
                      }
                      aria-expanded={sourcePickerOpen}
                      aria-haspopup="dialog"
                      aria-label="Sources"
                      title="Select data source"
                    >
                      <EuiIcon type="table" size="s" aria-hidden="true" />
                      <span>Sources</span>
                      <EuiIcon
                        type={sourcePickerOpen ? "arrowUp" : "arrowDown"}
                        size="s"
                        aria-hidden="true"
                        className="cv-query-source-trigger__chevron"
                      />
                    </button>
                  }
                  closePopover={() => {
                    setSourcePickerOpen(false);
                    closeInstanceContextMenu();
                  }}
                  display="inlineBlock"
                  isOpen={sourcePickerOpen}
                  ownFocus={false}
                  panelClassName="cv-query-source-popover-panel"
                  panelPaddingSize="none"
                  repositionToCrossAxis={false}
                  repositionOnScroll
                >
                  {renderSourcePickerContent()}
                </EuiPopover>
              </div>
              <div className="cv-query-log-tab-list" role="tablist" aria-label="Log table tabs">
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
                        aria-label={`${tab.databaseName}.${tab.tableName}`}
                        title={`${tab.databaseName}.${tab.tableName}`}
                        className="cv-query-log-tab__main"
                        onClick={() => switchLogTab(tab)}
                      >
                        <EuiIcon type="table" size="s" aria-hidden="true" className="cv-query-log-tab__icon" />
                        <strong>{tab.tableName}</strong>
                      </button>
                      <button
                        type="button"
                        className="cv-query-log-tab__close"
                        aria-label={`Close table ${tab.tableName}`}
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
            </div>
          ) : null}
          <section
            aria-label="Query input"
            className={[
              "cv-panel cv-query-panel cv-query-panel--command",
              inlineFieldPickerOpen || fieldPickerOpen || queryHistoryMenuOpen || savedQueryMenuOpen
                ? "cv-query-panel--dropdown-open"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="cv-query-command-row">
              <div className="cv-query-sql" onBlur={() => window.setTimeout(() => setQueryInputFocused(false), 120)}>
                <span className="cv-query-sql__badge">
                  SQL
                  <EuiToolTip content="ClickHouse SQL syntax" position="top">
                    <button type="button" className="cv-query-sql__tip" aria-label="SQL syntax tip">
                      <EuiIcon type="info" size="s" aria-hidden="true" />
                    </button>
                  </EuiToolTip>
                </span>
                <input
                  value={workspace.queryText}
                  onFocus={() => setQueryInputFocused(true)}
                  onChange={(event) => workspace.setQueryText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void workspace.runQuery(1);
                    }
                  }}
                  placeholder="Search"
                  spellCheck={false}
                  aria-label="SQL query"
                />
                {workspace.queryText.trim() ? (
                  <button
                    type="button"
                    className="cv-query-sql__clear"
                    aria-label="Clear SQL query"
                    onClick={() => workspace.setQueryText("")}
                  >
                    ×
                  </button>
                ) : null}
                {queryInputFocused && workspace.autocompleteItems.length > 0 ? (
                  <div className="cv-query-sql__suggestions" role="listbox" aria-label="Query suggestions">
                    {workspace.autocompleteItems.map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="option"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyAutocompleteItem(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <TimeRangeAbsolutePicker
                value={absolutePickerRange}
                onChange={applyAbsolutePickerRange}
                isLoading={workspace.loading || workspace.chartLoading}
              />
              <div className="cv-query-command-row__actions">
                <button
                  type="button"
                  className="cv-action-button cv-query-run-button"
                  onClick={() => void workspace.runQuery(1)}
                  disabled={workspace.loading}
                  aria-busy={workspace.loading}
                >
                  <EuiIcon type="search" size="s" aria-hidden="true" />
                  <span>Run</span>
                </button>
              </div>
              {queryUtilityActions}
            </div>

            <div className="cv-query-kibana">
              <div className="cv-query-filter-bar" aria-label="Filter conditions">
                <div className="cv-query-add-filter-anchor" ref={filterComposerRef}>
                  <EuiPopover
                    anchorPosition="downLeft"
                    button={
                      <button
                        type="button"
                        className={filterComposerOpen ? "cv-query-add-filter cv-query-add-filter--active" : "cv-query-add-filter"}
                        onClick={() => {
                          if (filterComposerOpen) {
                            cancelInlineCondition();
                            return;
                          }
                          openInlineConditionComposer();
                        }}
                        aria-expanded={filterComposerOpen}
                        aria-haspopup="dialog"
                      >
                        <EuiIcon type="plus" size="s" aria-hidden="true" />
                        Add condition
                      </button>
                    }
                    closePopover={cancelInlineCondition}
                    display="inlineBlock"
                    isOpen={filterComposerOpen}
                    ownFocus={false}
                    panelClassName="cv-query-filter-composer-popover-panel"
                    panelPaddingSize="none"
                    repositionOnScroll
                  >
                    <div
                      className="cv-query-filter-composer"
                      aria-label="Filter condition editor"
                      onKeyDown={handleInlineConditionComposerKeyDown}
                      role="group"
                    >
                      <div className="cv-query-filter-composer__inputs">
                        <label
                          ref={inlineFieldPickerRef}
                          className="cv-query-filter-composer__field cv-query-filter-composer__field--picker"
                          onBlur={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                              setInlineFieldPickerOpen(false);
                            }
                          }}
                        >
                          <EuiFieldText
                            compressed
                            fullWidth
                            value={formatConditionFieldInputValue(inlineConditionDraft.field)}
                            onChange={(event) => handleInlineConditionFieldChange(event.target.value)}
                            onKeyDown={handleInlineFieldPickerKeyDown}
                            onFocus={(event) => {
                              event.currentTarget.select();
                              setFieldPickerOpen(false);
                              setInlineFieldPickerActiveIndex(0);
                              setInlineFieldPickerOpen(true);
                            }}
                            onClick={() => {
                              setFieldPickerOpen(false);
                              setInlineFieldPickerActiveIndex(0);
                              setInlineFieldPickerOpen(true);
                            }}
                            placeholder="Field"
                            aria-label="Field"
                            aria-expanded={inlineFieldPickerOpen}
                            aria-haspopup="listbox"
                            role="combobox"
                          />
                          {inlineFieldPickerOpen && (inlineFieldPickerOptions.length > 0 || inlineConditionDraft.field.trim()) ? (
                            <FieldPickerDropdown
                              value={inlineConditionDraft.field.trim()}
                              options={inlineFieldPickerOptions}
                              onSelect={(field) => {
                                handleInlineConditionFieldChange(field);
                                setInlineFieldPickerOpen(false);
                                window.setTimeout(() => {
                                  inlineConditionValueInputRef.current?.focus();
                                }, 0);
                              }}
                              onClose={() => setInlineFieldPickerOpen(false)}
                              activeIndex={inlineFieldPickerActiveIndex}
                            />
                          ) : null}
                        </label>
                        <div className="cv-query-filter-composer__clause">
                          <label className="cv-query-filter-composer__operator">
                            <QueryCompactSelect
                              value={inlineConditionDraft.operator}
                              onChange={(operator) =>
                                setInlineConditionDraft((current) => ({
                                  ...current,
                                  operator
                                }))
                              }
                              ariaLabel="Operator"
                              options={inlineOperatorOptions}
                            />
                          </label>
                          <label className="cv-query-filter-composer__value">
                            <EuiFieldText
                              compressed
                              fullWidth
                              inputRef={inlineConditionValueInputRef}
                              value={String(inlineConditionDraft.value ?? "")}
                              onChange={(event) =>
                                setInlineConditionDraft((current) => ({
                                  ...current,
                                  value: event.target.value
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  addInlineCondition();
                                }
                              }}
                              placeholder={inlineConditionDraft.valueType === "number" ? "number" : "Value"}
                              aria-label="Value"
                            />
                          </label>
                        </div>
                      </div>
                      <div className="cv-query-filter-composer__actions">
                        <button
                          type="button"
                          className="cv-query-filter-composer__text-action cv-query-filter-composer__text-action--primary"
                          onClick={addInlineCondition}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          className="cv-query-filter-composer__text-action"
                          onClick={cancelInlineCondition}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </EuiPopover>
                </div>
                {workspace.conditions.length > 0 ? (
                  <div className="cv-query-filter-pills" role="list" aria-label="Applied conditions">
                    {workspace.conditions.map((condition) => {
                      const conditionFieldLabel = formatConditionFieldLabel(condition.field);
                      return (
                        <span
                          key={condition.id}
                          role="listitem"
                          className={
                            [
                              "cv-query-filter-pill",
                              condition.id === activeCondition?.id ? "cv-query-filter-pill--active" : "",
                              condition.disabled ? "cv-query-filter-pill--disabled" : ""
                            ]
                              .filter(Boolean)
                              .join(" ")
                          }
                        >
                          <button
                            type="button"
                            className="cv-query-filter-pill__main"
                            onClick={() => openEditConditionModal(condition.id)}
                            title={`${conditionFieldLabel} ${condition.operator} ${formatConditionSummaryValue(condition.value)}`}
                          >
                            <strong>{conditionFieldLabel}</strong>
                            <em>{condition.operator}</em>
                            <span>{formatConditionSummaryValue(condition.value)}</span>
                          </button>
                          <EuiToolTip content={condition.disabled ? "Enable condition" : "Disable condition"}>
                            <button
                              type="button"
                              className="cv-query-filter-pill__toggle"
                              aria-label={`${condition.disabled ? "Enable" : "Disable"} condition ${conditionFieldLabel}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleConditionDisabled(condition);
                              }}
                            >
                              <EuiIcon type={condition.disabled ? "eye" : "eyeClosed"} size="s" aria-hidden="true" />
                            </button>
                          </EuiToolTip>
                          <button
                            type="button"
                            className="cv-query-filter-pill__remove"
                            aria-label={`Remove condition ${conditionFieldLabel}`}
                            title="Remove condition"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeConditionAndRun(condition.id);
                            }}
                          >
                            <EuiIcon type="cross" size="s" aria-hidden="true" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : null}
                {canShowQueryPreview ? (
                  <div className="cv-query-builder__preview-wrap">
                    <EuiPopover
                      anchorPosition="downLeft"
                      button={
                        <button
                          type="button"
                          className="cv-query-builder__preview-trigger"
                          onClick={() => setQueryPreviewOpen((current) => !current)}
                          aria-expanded={queryPreviewOpen}
                          aria-haspopup="dialog"
                        >
                          <EuiIcon type="inspect" size="s" aria-hidden="true" />
                          <span>Inspect SQL</span>
                        </button>
                      }
                      closePopover={() => setQueryPreviewOpen(false)}
                      isOpen={queryPreviewOpen}
                      ownFocus={false}
                      panelClassName="cv-query-preview-popover-panel"
                      panelPaddingSize="none"
                      repositionOnScroll
                    >
                      <div className="cv-query-builder__preview" role="dialog" aria-label="SQL preview">
                        <code>{queryPreview}</code>
                        {canUseQueryPreview ? (
                          <div className="cv-query-builder__preview-actions">
                            <button
                              type="button"
                              className="cv-query-builder__preview-action"
                              onClick={() => void copyQueryPreview()}
                            >
                              Copy
                            </button>
                            {workspace.conditions.length > 0 ? (
                              <button
                                type="button"
                                className="cv-query-builder__preview-action cv-query-builder__preview-action--primary"
                                onClick={convertConditionsToManualSql}
                              >
                                Use as SQL
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </EuiPopover>
                  </div>
                ) : null}
              </div>

            </div>

            {feedbackMessage ? (
              <div className="cv-query-feedback" role="status" aria-live="polite">
                {feedbackMessage}
              </div>
            ) : null}
          </section>

          <div className="cv-query-workspace">
            <section
              aria-label="Histogram"
              className={
                [
                  "cv-panel cv-query-panel cv-query-panel--histogram",
                  histogramCollapsed ? "cv-query-panel--histogram-collapsed" : "",
                  isHistogramEmptyPanel ? "cv-query-panel--workspace-empty" : ""
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {hasHistogramToolbar ? (
                <div
                  className={
                    histogramSelectionRange
                      ? "cv-query-histogram-toolbar cv-query-histogram-toolbar--selection"
                      : "cv-query-histogram-toolbar"
                  }
                >
                  <div className="cv-query-histogram-toolbar__primary">
                    <div className="cv-query-histogram-summary" aria-live="polite">
                      {histogramSelectionRange ? (
                        <span className="cv-query-histogram-selection-summary">
                          <strong>
                            {formatCount(histogramSelectionRange.count)} {formatHitsLabel(histogramSelectionRange.count)}
                          </strong>
                          <span>{formatHistogramTooltipRange(histogramSelectionRange.from, histogramSelectionRange.to)}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="cv-query-histogram-actions" aria-label="Chart controls">
                    {histogramSelectionRange ? (
                      <div
                        className="cv-query-histogram-selection-actions"
                        aria-label="Selected range controls"
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.stopPropagation();
                            clearHistogramSelection();
                          }
                        }}
                      >
                        <button
                          type="button"
                          className="cv-query-histogram-action cv-query-histogram-action--primary"
                          onClick={applyHistogramSelectionRange}
                          disabled={workspace.loading || workspace.chartLoading}
                        >
                          <EuiIcon type="magnifyWithPlus" size="s" aria-hidden="true" />
                          Zoom in
                        </button>
                        <button
                          type="button"
                          className="cv-query-histogram-action cv-query-histogram-action--muted"
                          onClick={clearHistogramSelection}
                          disabled={workspace.loading || workspace.chartLoading}
                        >
                          <EuiIcon type="cross" size="s" aria-hidden="true" />
                          Cancel
                        </button>
                      </div>
                    ) : null}
                    {!histogramSelectionRange && hasHistogramChartData ? (
                      <label className="cv-query-histogram-interval">
                        <span className="cv-sr-only">Interval</span>
                        <EuiSuperSelect<HistogramIntervalValue>
                          compressed
                          aria-label="Histogram interval"
                          className="cv-query-histogram-interval__select"
                          valueOfSelected={histogramInterval}
                          options={histogramIntervalSelectOptions}
                          onChange={changeHistogramInterval}
                          disabled={workspace.chartLoading}
                          itemClassName="cv-query-histogram-interval__item"
                          popoverProps={{
                            panelClassName: "cv-query-histogram-interval__panel",
                            repositionOnScroll: true
                          }}
                        />
                      </label>
                    ) : null}
                    {timeRangeHistory.length > 0 ? (
                      <HistogramIconAction
                        label="Back"
                        icon="editorUndo"
                        onClick={restorePreviousHistogramTimeRange}
                        disabled={workspace.loading || workspace.chartLoading}
                        showLabel
                      />
                    ) : null}
                    {!histogramSelectionRange && timeRange && hasHistogramChartData ? (
                      <HistogramIconAction
                        label="Zoom out"
                        icon="magnifyWithMinus"
                        onClick={zoomOutHistogramTimeRange}
                        disabled={workspace.loading || workspace.chartLoading}
                        showLabel
                      />
                    ) : null}
                    {canToggleHistogram && !histogramSelectionRange ? (
                      <HistogramIconAction
                        label={histogramCollapsed ? "Show chart" : "Hide chart"}
                        icon={histogramCollapsed ? "visBarVerticalStacked" : "eyeClosed"}
                        onClick={() => {
                          setHistogramCollapsed((current) => !current);
                          clearHistogramSelection();
                        }}
                        muted
                        ariaExpanded={!histogramCollapsed}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
              {canShowHistogramChart ? (
                <div className="cv-query-histogram">
                  <Chart
                    key={histogramChartKey}
                    renderer="svg"
                    size={{ height: HISTOGRAM_HEIGHT, width: "100%" }}
                    className="cv-query-histogram__chart"
                  >
                    <Settings
                      ariaLabel="Log time distribution"
                      brushAxis={BrushAxis.X}
                      minBrushDelta={2}
                      roundHistogramBrushValues
                      allowBrushingLastHistogramBin
                      showLegend={false}
                      theme={HISTOGRAM_CHART_THEME}
                      xDomain={histogramXDomain}
                      onBrushEnd={handleHistogramBrushEnd}
                      onElementClick={handleHistogramElementClick}
                    />
                    <Tooltip
                      type={TooltipType.VerticalCursor}
                      customTooltip={HistogramTooltip}
                      headerFormatter={({ value }) => {
                        const valueMs = Number(value);
                        const datum = histogramChartData.find(
                          (item) => valueMs >= item.from * 1000 && valueMs < item.to * 1000
                        );
                        return datum
                          ? formatHistogramTooltipRange(datum.from, datum.to)
                          : formatHistogramTooltipDate(Math.floor(valueMs / 1000));
                      }}
                    />
                    <Axis
                      id="bottom"
                      position={Position.Bottom}
                      tickFormat={(value) => formatHistogramTickLabel(Math.floor(Number(value) / 1000), chartSpanSeconds)}
                      ticks={8}
                      timeAxisLayerCount={0}
                      style={HISTOGRAM_BOTTOM_AXIS_STYLE}
                    />
                    <Axis
                      id="left"
                      position={Position.Left}
                      tickFormat={formatHistogramCountTickLabel}
                      ticks={3}
                      maximumFractionDigits={0}
                      style={HISTOGRAM_LEFT_AXIS_STYLE}
                    />
                    {histogramSelectionRange ? (
                      <RectAnnotation
                        id="selected-time-range"
                        dataValues={[
                          {
                            coordinates: {
                              x0: histogramSelectionRange.from * 1000,
                              x1: histogramSelectionRange.to * 1000
                            },
                            details: formatHistogramTooltipRange(histogramSelectionRange.from, histogramSelectionRange.to)
                          }
                        ]}
                        hideTooltips
                      />
                    ) : null}
                    <HistogramBarSeries
                      id="records"
                      name="records"
                      data={histogramChartData}
                      xAccessor="x"
                      yAccessors={["count"]}
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      color={HISTOGRAM_BAR_COLOR}
                      minBarHeight={2}
                    />
                  </Chart>
                  {histogramSelectionRange && histogramSelectionOverlayStyle ? (
                    <HistogramSelectionOverlay
                      ref={histogramSelectionOverlayRef}
                      range={histogramSelectionRange}
                      style={histogramSelectionOverlayStyle}
                      disabled={workspace.loading || workspace.chartLoading}
                      onZoom={applyHistogramSelectionRange}
                      onCancel={clearHistogramSelection}
                    />
                  ) : null}
                </div>
              ) : histogramCollapsed ? null : renderHistogramEmptyState()}
            </section>

            <section
              aria-label="Query results"
              className={
                [
                  "cv-panel cv-query-panel cv-query-panel--results",
                  isResultEmptyPanel ? "cv-query-panel--workspace-empty" : ""
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {resultBlockingErrorMessage ? (
                <div role="alert" className="cv-query-alert">
                  {resultBlockingErrorMessage}
                </div>
              ) : null}

              {!resultBlockingErrorMessage && hasResultRows ? (
                <div
                  ref={resultStackRef}
                  className="cv-query-result-stack"
                  aria-busy={workspace.loading}
                >
                  <TraceTimeline groups={traceGroups} />
                  <div
                    className={
                      workspace.loading
                        ? "cv-query-result-table-shell cv-query-result-table-shell--refreshing"
                        : "cv-query-result-table-shell"
                    }
                  >
                    <div className="cv-query-result-bar">
                      <div className="cv-query-result-bar__page">
                        <span className="cv-query-result-bar__summary">
                          {resultBarSummaryText}
                          {shouldShowResultRangeSummary && hasResultKnownTotal ? <> <em>of {formatCount(resultTotalCount)}</em></> : null}
                        </span>
                        {resultLoadingControl}
                        {resultToolbarPageSizeControl ? (
                          <span className="cv-query-result-bar__page-size">
                            {resultToolbarPageSizeControl}
                          </span>
                        ) : null}
                        {resultBulkExpandControl ? (
                          <span className="cv-query-result-bar__inline-action">
                            {resultBulkExpandControl}
                          </span>
                        ) : null}
                      </div>
                      <div className="cv-query-result-actions" aria-label="Result actions">
                        {resultToolbarPagerControls ? (
                          <div className="cv-query-result-actions__group cv-query-result-actions__group--pagination">
                            {resultToolbarPagerControls}
                          </div>
                        ) : null}
                        <div className="cv-query-result-actions__group cv-query-result-actions__group--view">
                          <div
                            className={
                              fieldCatalogOpen
                                ? "cv-query-fields-panel-anchor cv-query-fields-panel-anchor--open"
                                : "cv-query-fields-panel-anchor"
                            }
                            ref={fieldCatalogRef}
                          >
                            <EuiPopover
                              anchorPosition="downRight"
                              button={
                                <EuiToolTip content="Fields" delay="long">
                                  <button
                                    type="button"
                                    className="cv-query-result-action cv-query-result-action--text"
                                    onClick={() => {
                                      if (fieldCatalogOpen) {
                                        closeFieldCatalogPanel();
                                      } else {
                                        setFieldCatalogOpen(true);
                                      }
                                    }}
                                    aria-label="Fields"
                                    aria-expanded={fieldCatalogOpen}
                                    aria-haspopup="dialog"
                                    title="Fields"
                                  >
                                    <span className="cv-query-result-action__label">Fields</span>
                                  </button>
                                </EuiToolTip>
                              }
                              closePopover={closeFieldCatalogPanel}
                              display="inlineBlock"
                              isOpen={fieldCatalogOpen}
                              ownFocus={false}
                              panelClassName="cv-query-fields-panel__popover-panel"
                              panelPaddingSize="none"
                              repositionOnScroll
                            >
                              {renderFieldCatalogPanel()}
                            </EuiPopover>
                          </div>
                        </div>
                      </div>
                    </div>
              <div
                className="cv-query-result-table-header"
                ref={resultTableHeaderScrollRef}
                onWheel={handleResultTableHeaderWheel}
              >
                <table className="cv-query-result-table cv-query-result-table--header" style={{ minWidth: resultTableMinWidth }}>
                  {renderResultTableColGroup()}
                  {renderResultTableHeader()}
                </table>
              </div>
              <div
                className="cv-query-result-table-scroll"
                ref={resultTableScrollRef}
                onScroll={handleResultTableBodyScroll}
              >
                <table className="cv-query-result-table cv-query-result-table--body" style={{ minWidth: resultTableMinWidth }}>
                  {renderResultTableColGroup()}
                  <tbody>
                    {normalizedLogRows.map((row, index) => {
                    const isLogExpanded = expandedLogIndexes.has(index);
                    const detailMessageEntry = getLogDetailMessageEntry(row);
                    const detailMessageText = getLogDetailMessageText(row);
                    const visibleLogDetailEntries = getVisibleLogDetailEntries(row);
                    const primaryLogDetailEntries = visibleLogDetailEntries.filter(
                      ([key, value]) => !isLowPriorityResultField(key) && !isPromotedLogDetailMessageField(key, value, detailMessageText)
                    );
                    const metadataLogDetailEntries = visibleLogDetailEntries.filter(
                      ([key, value]) => isLowPriorityResultField(key) && !isPromotedLogDetailMessageField(key, value, detailMessageText)
                    );
                    const metadataExpanded = expandedLogMetadataIndexes.has(index);
                    const renderLogDetailEntryRows = ([key, value]: [string, unknown]) => {
                      const nestedEntries = scalarJsonEntries(key, value);
                      const nestedToggleKey = `${index}:${key}`;
                      const nestedExpanded = expandedLogNestedKeys.has(nestedToggleKey);
                      return (
                        <Fragment key={key}>
                          <div className="cv-query-detail__row">
                            {renderLogDetailFieldCell(row, key, value, {
                              statsPreferRawLog: !isPresentLogValue(row.original[key])
                            })}
                            <span className="cv-query-detail__value-cell">
                              {renderLogDetailValueCell(value)}
                              {nestedEntries.length > 0 ? (
                                <button
                                  type="button"
                                  className="cv-query-detail__nested-toggle"
                                  aria-expanded={nestedExpanded}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleExpandedLogNestedField(index, key);
                                  }}
                                >
                                  {nestedExpanded ? "Hide fields" : formatFieldsCount(nestedEntries.length)}
                                </button>
                              ) : null}
                            </span>
                          </div>
                          {nestedExpanded ? nestedEntries.map((nestedEntry) => {
                            const nestedKey = nestedEntry.key;
                            const nestedValue = nestedEntry.value;
                            const nestedConditionField = nestedEntry.fieldRef?.fieldKey ?? nestedKey;
                            return (
                              <div key={`${key}.${nestedKey}`} className="cv-query-detail__row cv-query-detail__row--nested">
                                {renderLogDetailFieldCell(row, nestedKey, nestedValue, {
                                  title: `${key}.${nestedKey}`,
                                  conditionField: nestedConditionField,
                                  statsPreferRawLog: true,
                                  statsFieldRef: nestedEntry.fieldRef
                                })}
                                {renderLogDetailValueCell(nestedValue)}
                              </div>
                            );
                          }) : null}
                        </Fragment>
                      );
                    };
                    return (
                      <Fragment key={`${index}-${row.timeText}`}>
                        <tr
                          className={
                            isLogExpanded
                              ? "cv-query-result-table__row cv-query-result-table__row--active"
                              : "cv-query-result-table__row"
                          }
                          tabIndex={0}
                          aria-expanded={isLogExpanded}
                          onClick={() => toggleExpandedLog(index)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleExpandedLog(index);
                            }
                          }}
                        >
                          <td className="cv-query-result-table__toggle-cell">
                            <button
                              type="button"
                              className="cv-query-result-table__toggle-button"
                              aria-label={isLogExpanded ? "Collapse log details" : "Expand log details"}
                              aria-expanded={isLogExpanded}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleExpandedLog(index);
                              }}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                              }}
                            >
                              <EuiIcon type={isLogExpanded ? "arrowDown" : "arrowRight"} size="s" aria-hidden="true" />
                            </button>
                          </td>
                          {visibleResultColumns.map((column) => {
                            const value = formatResultColumnValue(row, column);
                            const isLevelColumn =
                              column.key === "__level" || ["level", "lv", "severity", "log_level"].includes(column.key);
                            const levelTone = isLevelColumn && !value.empty ? getLogLevelTone(value.text) : "";
                            const cellClassName = [
                              "cv-query-result-table__cell",
                              getResultColumnLayoutClass(column.key),
                              isLevelColumn ? "cv-query-result-table__level" : "",
                              levelTone ? `cv-query-result-table__level--${levelTone}` : "",
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
                                  {truncate(value.text, getResultColumnTextMaxLength(column.key))}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                        {isLogExpanded ? (
                          <tr className="cv-query-result-table__detail-row">
                            <td colSpan={visibleResultColumns.length + 1}>
                              <section
                                aria-label="Log details"
                                className={`cv-query-detail cv-query-detail--inline cv-query-detail--${expandedLogDisplayMode}`}
                              >
                                <div className="cv-query-detail__header">
                                  <div className="cv-query-detail__view-switch" role="tablist" aria-label="Log detail view">
                                    <button
                                      type="button"
                                      role="tab"
                                      aria-selected={expandedLogDisplayMode === "fields"}
                                      className={
                                        expandedLogDisplayMode === "fields"
                                          ? "cv-query-detail__view cv-query-detail__view--active"
                                          : "cv-query-detail__view"
                                      }
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setExpandedLogDisplayMode("fields");
                                      }}
                                    >
                                      Fields
                                    </button>
                                    <button
                                      type="button"
                                      role="tab"
                                      aria-selected={expandedLogDisplayMode === "json"}
                                      className={
                                        expandedLogDisplayMode === "json"
                                          ? "cv-query-detail__view cv-query-detail__view--active"
                                          : "cv-query-detail__view"
                                      }
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setExpandedLogDisplayMode("json");
                                      }}
                                    >
                                      JSON
                                    </button>
                                  </div>
                                  <div className="cv-query-detail__actions">
                                    <button
                                      type="button"
                                      className="cv-query-detail__action"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void copyExpandedLog(row);
                                      }}
                                    >
                                      <EuiIcon type="copyClipboard" size="s" aria-hidden="true" />
                                      <span>Copy log</span>
                                    </button>
                                  </div>
                                </div>
                                {expandedLogDisplayMode === "json" ? (
                                  <pre className="cv-query-pre cv-query-detail__json">
                                    {formatLogJsonPreview(row)}
                                  </pre>
                                ) : (
                                  <div className="cv-query-detail__body">
                                    <div className="cv-query-detail__focus">
                                      <div className="cv-query-detail__message">
                                        {renderLogDetailFieldCell(row, detailMessageEntry.key, detailMessageEntry.value)}
                                        <code title={detailMessageText}>{detailMessageText}</code>
                                      </div>
                                    </div>
                                    <div className="cv-query-detail__fields">
                                      {primaryLogDetailEntries.map(renderLogDetailEntryRows)}
                                      {metadataLogDetailEntries.length > 0 ? (
                                        <>
                                          <div className="cv-query-detail__row cv-query-detail__row--metadata-toggle">
                                            <strong className="cv-query-detail__field-cell">
                                              <span className="cv-query-detail__key-text">Metadata</span>
                                            </strong>
                                            <button
                                              type="button"
                                              className="cv-query-detail__metadata-toggle"
                                              aria-expanded={metadataExpanded}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                toggleExpandedLogMetadata(index);
                                              }}
                                            >
                                              {metadataExpanded ? "Hide fields" : `Show ${formatFieldsCount(metadataLogDetailEntries.length)}`}
                                            </button>
                                          </div>
                                          {metadataExpanded ? metadataLogDetailEntries.map(renderLogDetailEntryRows) : null}
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                )}
                              </section>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                    })}
                  </tbody>
                </table>
              </div>
              {resultBodyLoadingOverlay}
              {resultFooterPageSizeControl || resultFooterPagerControls ? (
                <div className="cv-query-result-footer">
                  <div className="cv-query-result-footer__meta">
                    <span className="cv-query-result-footer__summary">
                      {resultBarSummaryText}
                      {shouldShowResultRangeSummary && hasResultKnownTotal ? (
                        <em>of {formatCount(resultTotalCount)}</em>
                      ) : null}
                    </span>
                    {resultFooterPageSizeControl}
                  </div>
                  {resultFooterPagerControls}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {!resultBlockingErrorMessage && (!workspace.logs || workspace.logs.logs.length === 0) ? renderResultEmptyState() : null}
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
        <div
          className="cv-report-modal-backdrop cv-query-field-stats-backdrop"
          role="presentation"
          onClick={closeFieldStatsModal}
        >
          <section
            ref={fieldStatsPanelRef}
            className="cv-report-modal cv-query-modal cv-query-field-stats-modal"
            role="dialog"
            aria-modal="false"
            aria-label={`${fieldStatsState.field} top values`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header cv-query-field-stats__header">
              <div>
                <h2 className="cv-panel-title">{fieldStatsState.field}</h2>
                <div className="cv-query-field-stats__meta-line" aria-label="Top values summary">
                  <span>Top values</span>
                  {modalFieldStatsView?.source ? <span>{modalFieldStatsView.source}</span> : null}
                  {modalFieldStatsView && modalFieldStatsView.total > 0 ? (
                    <span>{formatCount(modalFieldStatsView.total)}</span>
                  ) : null}
                </div>
              </div>
              <div className="cv-query-field-stats__header-actions">
                {fieldStatsState.loading ? (
                  <button
                    type="button"
                    className="cv-query-field-stats__cancel"
                    onClick={closeFieldStatsModal}
                    aria-label="Cancel top values query"
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  className="cv-query-field-stats__close"
                  onClick={closeFieldStatsModal}
                  aria-label="Close top values"
                >
                  <EuiIcon type="cross" size="s" aria-hidden="true" />
                </button>
              </div>
            </div>
            {renderFieldStatsContent(fieldStatsState, modalFieldStatsView ?? undefined)}
          </section>
        </div>
      ) : null}

      {conditionModalOpen && conditionDraft ? (
        <div
          className="cv-report-modal-backdrop cv-query-condition-modal-backdrop"
          role="presentation"
          onMouseDown={handleConditionModalBackdropMouseDown}
          onClick={handleConditionModalBackdropClick}
        >
          <section
            className="cv-report-modal cv-query-modal cv-query-condition-modal"
            role="dialog"
            aria-modal="true"
            aria-label={conditionModalMode === "create" ? "Add condition" : "Edit condition"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header cv-query-condition-modal__header">
              <div>
                <h2 className="cv-panel-title">
                  {conditionModalMode === "create" ? "Add condition" : "Edit condition"}
                </h2>
              </div>
              <button
                type="button"
                className="cv-query-condition-modal__close"
                onClick={closeConditionModal}
                aria-label="Close filter editor"
              >
                <EuiIcon type="cross" size="s" aria-hidden="true" />
              </button>
            </div>
            <div className="cv-query-condition-modal__body">
              <div className="cv-query-builder-form cv-query-builder-form--modal">
                <label
                  className="cv-query-builder-form__field cv-query-builder-form__field--field-picker"
                  htmlFor="query-condition-field-trigger"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setFieldPickerOpen(false);
                    }
                  }}
                >
                  Field
                  <button
                    id="query-condition-field-trigger"
                    type="button"
                    aria-label="Field"
                    aria-expanded={fieldPickerOpen}
                    aria-haspopup="listbox"
                    className="cv-query-field-select__trigger"
                    role="combobox"
                    onClick={() => {
                      setInlineFieldPickerOpen(false);
                      setFieldPickerOpen((current) => !current);
                    }}
                  >
                    <span>{formatConditionFieldLabel(conditionDraft.field)}</span>
                    <span aria-hidden="true" className="cv-query-field-select__chevron">⌄</span>
                  </button>
                  {fieldPickerOpen ? (
                    <FieldPickerDropdown
                      value={conditionDraft.field}
                      options={conditionFieldOptions}
                      onSelect={(field) => {
                        handleConditionDraftFieldChange(field);
                        setFieldPickerOpen(false);
                      }}
                      onClose={() => setFieldPickerOpen(false)}
                    />
                  ) : null}
                </label>

                <label className="cv-query-builder-form__field">
                  Operator
                  <QueryCompactSelect
                    value={conditionDraft.operator}
                    onChange={(operator) =>
                      setConditionDraft((current) =>
                        current
                          ? {
                              ...current,
                              operator
                            }
                          : current
                      )
                    }
                    options={conditionOperatorOptions}
                    ariaLabel="Operator"
                  />
                </label>

                <label className="cv-query-builder-form__field" htmlFor="query-condition-value">
                  Value
                  <EuiFieldText
                    compressed
                    fullWidth
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
                    placeholder={conditionDraft.valueType === "number" ? "number" : "value"}
                    aria-label="Value"
                  />
                </label>
              </div>
              <div className="cv-query-condition-modal__footer">
                {conditionModalMode === "edit" ? (
                  <button
                    type="button"
                    className="cv-query-condition-modal__text-action cv-query-condition-modal__text-action--danger"
                    onClick={deleteConditionFromModal}
                  >
                    Delete
                  </button>
                ) : (
                  <span />
                )}
                <div className="cv-query-condition-modal__actions">
                  <button
                    type="button"
                    className="cv-query-condition-modal__text-action"
                    onClick={closeConditionModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="cv-query-condition-modal__text-action cv-query-condition-modal__text-action--primary"
                    onClick={saveConditionModal}
                    disabled={isGlobalMatchUnsupported}
                  >
                    {conditionModalMode === "create" ? "Add" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {linkQueryAnchor ? (
        <div
          className="cv-report-modal-backdrop cv-query-link-modal-backdrop"
          role="presentation"
          onClick={closeLinkQueryModal}
        >
          <section
            ref={linkQueryPanelRef}
            className="cv-report-modal cv-query-modal cv-query-link-modal"
            role="dialog"
            aria-modal="false"
            aria-label="Correlate logs"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header cv-query-link-modal__header">
              <div>
                <h2 className="cv-panel-title">Correlate logs</h2>
              </div>
              <button
                type="button"
                className="cv-query-link-modal__close"
                onClick={closeLinkQueryModal}
                aria-label="Close correlation"
              >
                <EuiIcon type="cross" size="s" aria-hidden="true" />
              </button>
            </div>
            <div className="cv-query-link-modal__body">
              <div className="cv-query-link-anchor">
                <div>
                  <span>Field</span>
                  <strong>{linkQueryAnchor.field}</strong>
                </div>
                <div>
                  <span>Value</span>
                  <code>{linkQueryAnchor.value}</code>
                </div>
              </div>
              <label className="cv-query-builder-form__field cv-query-link-window">
                Time window
                <QueryCompactSelect
                  value={String(linkQueryWindowMinutes)}
                  onChange={(value) => setLinkQueryWindowMinutes(Number(value))}
                  options={linkQueryWindowOptions}
                  ariaLabel="Time window"
                />
              </label>
              <div className="cv-query-link-table-picker" role="group" aria-label="Select log tables">
                <div className="cv-query-link-table-picker__header">
                  <strong>Tables</strong>
                  <button
                    type="button"
                    className="cv-query-link-modal__text-action"
                    onClick={() => setLinkQuerySelectedTableIds(linkQueryTableOptions.map((item) => item.id))}
                  >
                    Select all
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
                <button
                  type="button"
                  className="cv-query-link-modal__text-action"
                  onClick={closeLinkQueryModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cv-query-link-modal__text-action cv-query-link-modal__text-action--primary"
                  onClick={openLinkQueryPage}
                >
                  Open correlation
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
          className="cv-report-modal-backdrop cv-query-save-modal-backdrop"
          role="presentation"
          onClick={() => setSaveQueryModalOpen(false)}
        >
          <section
            className="cv-report-modal cv-query-modal cv-query-save-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Save query"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header cv-query-save-modal__header">
              <div>
                <h2 className="cv-panel-title">Save query</h2>
              </div>
              <button
                type="button"
                className="cv-query-save-modal__close"
                onClick={() => setSaveQueryModalOpen(false)}
                aria-label="Close save query"
              >
                <EuiIcon type="cross" size="s" aria-hidden="true" />
              </button>
            </div>
            <div className="cv-query-save-modal__body">
              <label className="cv-query-save-modal__field">
                <span>Name</span>
                <EuiFieldText
                  compressed
                  fullWidth
                  value={saveQueryName}
                  onChange={(event) => setSaveQueryName(event.target.value)}
                  placeholder="Error investigation"
                  aria-label="Query name"
                />
              </label>
              <div className="cv-query-save-modal__preview">
                <strong>SQL</strong>
                <code>{queryPreview}</code>
              </div>
              <div className="cv-query-modal__footer">
                <button
                  type="button"
                  className="cv-query-save-modal__text-action"
                  onClick={() => setSaveQueryModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cv-query-save-modal__text-action cv-query-save-modal__text-action--primary"
                  onClick={() => void handleSaveQuery()}
                >
                  Save
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {confirmState ? (
        <div
          className="cv-report-modal-backdrop cv-query-confirm-modal-backdrop"
          role="presentation"
          onClick={() => setConfirmState(null)}
        >
          <section
            className="cv-report-modal cv-query-modal cv-query-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-label={confirmState.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header cv-query-confirm-modal__header">
              <div>
                <h2 className="cv-panel-title">{confirmState.title}</h2>
              </div>
              <button
                type="button"
                className="cv-query-confirm-modal__close"
                onClick={() => setConfirmState(null)}
                aria-label="Close confirmation"
              >
                <EuiIcon type="cross" size="s" aria-hidden="true" />
              </button>
            </div>
            <div className="cv-query-confirm-modal__body">
              <div className="cv-query-confirm__content">{confirmState.content}</div>
              <div className="cv-query-modal__footer">
                <button
                  type="button"
                  className="cv-query-confirm-modal__text-action"
                  onClick={() => setConfirmState(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cv-query-confirm-modal__text-action cv-query-confirm-modal__text-action--danger"
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
