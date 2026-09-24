import { useEffect, useMemo, useRef, useState } from "react";
import {
  createQueryFilter,
  deleteQueryFilter,
  getQueryAnalysisFields,
  getQueryAutocomplete,
  getQueryCharts,
  getQueryLogs,
  listQueryFilters,
  listQuerySourceInstances,
  runQueryV2,
} from "../api/query";
import type {
  QueryAnalysisFieldsResponse,
  QueryAutocompleteResponse,
  QueryFilterCondition,
  QueryFilterProfile,
  QueryFilterValueType,
  QueryFieldRef,
  QueryHistogramBucket,
  QueryLogsResponse,
  QueryConditionV2,
  QueryOperatorV2,
  QuerySourceDatabase,
  QuerySourceInstance,
  QueryStorageAnalysisField,
  QuerySourceTreeTarget,
  QuerySourceTable
} from "../types/contracts";

const DEFAULT_PAGE_SIZE = 50;
const DOWNLOAD_LOG_PAGE_SIZE = 200;
const QUERY_HISTORY_STORAGE_KEY = "clickvisual-v2-query-history";
const DEFAULT_CONDITION_OPERATOR = "=";
const GLOBAL_MATCH_FIELD = "All fields";
const LEGACY_GLOBAL_MATCH_FIELD = "全局匹配";
const GLOBAL_MATCH_COLUMN = "_raw_log_";

type QueryRunRange = {
  st: number;
  et: number;
};

type QueryRunSnapshot = {
  range: QueryRunRange;
  conditions: QueryConditionV2[];
};

function isAbortRequestError(error: unknown) {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  );
}

let conditionSeed = 1;

function createTimeParams(startTime: string, endTime: string) {
  const st = Math.floor(new Date(startTime).getTime() / 1000);
  const et = Math.floor(new Date(endTime).getTime() / 1000);
  if (!Number.isFinite(st) || !Number.isFinite(et)) {
    return null;
  }
  if (st >= et) {
    return null;
  }
  return { st, et };
}

function readQueryHistory() {
  if (typeof window === "undefined") {
    return {} as Record<string, string[]>;
  }
  try {
    const raw = window.localStorage.getItem(QUERY_HISTORY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function writeQueryHistory(value: Record<string, string[]>) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(QUERY_HISTORY_STORAGE_KEY, JSON.stringify(value));
}

function normalizeAutocompleteItems(data: QueryAutocompleteResponse | null | undefined) {
  if (!data || !Array.isArray(data.logs)) {
    return [];
  }
  return data.logs
    .map((row) => {
      const firstValue = Object.values(row ?? {}).find(
        (item) => typeof item === "string" || typeof item === "number"
      );
      return String(firstValue ?? "").trim();
    })
    .filter(Boolean)
    .slice(0, 8);
}

function nextConditionId() {
  const id = conditionSeed;
  conditionSeed += 1;
  return `cond_${id}`;
}

function createEmptyCondition(): QueryFilterCondition {
  return {
    id: nextConditionId(),
    field: "",
    operator: DEFAULT_CONDITION_OPERATOR,
    value: "",
    valueType: "string"
  };
}

function normalizeNumberValue(value: string | number, field: string) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Field ${field || "unknown"} requires a number`);
    }
    return String(value);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Field ${field || "unknown"} requires a number`);
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Field ${field || "unknown"} requires a number`);
  }
  return String(parsed);
}

function normalizeStringValue(value: string | number) {
  const raw = String(value ?? "");
  return `'${raw.replaceAll("'", "\\'")}'`;
}

function normalizeDateTimeValue(value: string | number) {
  return normalizeStringValue(value);
}

function quoteQueryField(field: string) {
  const trimmed = field.trim();
  if (trimmed.includes("(") || trimmed.includes(")")) {
    return trimmed;
  }
  return `\`${trimmed.replaceAll("`", "``")}\``;
}

function escapeClickHouseString(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function buildRawLogJsonPathArgs(path: string) {
  return path
    .split(".")
    .filter(Boolean)
    .map((segment) => `'${escapeClickHouseString(segment)}'`)
    .join(", ");
}

function buildNestedRawLogPredicate(
  field: string,
  value: string | number | boolean,
  valueType: QueryFilterValueType,
  operator: string
) {
  const args = buildRawLogJsonPathArgs(field);
  const negated = operator === "!=" || operator === "<>" || operator === "not like";
  if (value === true || value === false || value === "true" || value === "false") {
    const asBool = value === true || value === "true";
    const cmp = negated ? "!=" : "=";
    return `JSONExtractRaw(_raw_log_, ${args}) ${cmp} '${asBool}'`;
  }
  if (valueType === "number") {
    const cmp = negated ? "!=" : "=";
    return `JSONExtractFloat(_raw_log_, ${args}) ${cmp} ${normalizeNumberValue(value, field)}`;
  }
  const jsonToken = JSON.stringify(String(value));
  const cmp = negated ? "=" : ">";
  return `position(JSONExtractRaw(_raw_log_, ${args}), '${escapeClickHouseString(jsonToken)}') ${cmp} 0`;
}

function parseJsonExtractPathArgs(args: string) {
  const parts: string[] = [];
  const matcher = /'((?:\\'|[^'])*)'/g;
  let match: RegExpExecArray | null = matcher.exec(args);
  while (match) {
    parts.push(match[1].replaceAll("\\'", "'"));
    match = matcher.exec(args);
  }
  return parts.length > 0 ? parts.join(".") : null;
}

function parseNestedRawLogToken(token: string, index: number): QueryFilterCondition | null {
  const trimmed = token.trim();
  const floatMatch = trimmed.match(/^JSONExtractFloat\(\s*_raw_log_\s*,\s*(.+)\s*\)\s*(!=|=)\s*(.+)$/i);
  if (floatMatch) {
    const field = parseJsonExtractPathArgs(floatMatch[1]);
    const numeric = Number(floatMatch[3].trim());
    if (!field || !Number.isFinite(numeric)) {
      return null;
    }
    return {
      id: `cond_url_${index}`,
      field,
      operator: floatMatch[2] as "=" | "!=",
      value: numeric,
      valueType: "number",
      nestedJson: true
    };
  }
  const boolMatch = trimmed.match(/^JSONExtractRaw\(\s*_raw_log_\s*,\s*(.+)\s*\)\s*(!=|=)\s*'(true|false)'$/i);
  if (boolMatch) {
    const field = parseJsonExtractPathArgs(boolMatch[1]);
    if (!field) {
      return null;
    }
    return {
      id: `cond_url_${index}`,
      field,
      operator: boolMatch[2] as "=" | "!=",
      value: boolMatch[3].toLowerCase(),
      valueType: "string",
      nestedJson: true
    };
  }
  const posMatch = trimmed.match(
    /^position\(\s*JSONExtractRaw\(\s*_raw_log_\s*,\s*(.+)\s*\)\s*,\s*'((?:\\'|[^'])*)'\s*\)\s*(>|=)\s*0$/i
  );
  if (posMatch) {
    const field = parseJsonExtractPathArgs(posMatch[1]);
    if (!field) {
      return null;
    }
    let value: string | number = posMatch[2].replaceAll("\\'", "'");
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === "string" || typeof parsed === "number") {
        value = parsed;
      }
    } catch {
      // keep raw token text
    }
    return {
      id: `cond_url_${index}`,
      field,
      operator: posMatch[3] === "=" ? "!=" : "=",
      value,
      valueType: typeof value === "number" ? "number" : "string",
      nestedJson: true
    };
  }
  return null;
}

function isGlobalMatchField(field: string) {
  const normalized = String(field || "").trim();
  return normalized === GLOBAL_MATCH_FIELD || normalized === LEGACY_GLOBAL_MATCH_FIELD;
}

function normalizeSuggestionFieldKey(field: string) {
  const normalized = String(field || "").trim();
  return isGlobalMatchField(normalized) ? GLOBAL_MATCH_FIELD.toLowerCase() : normalized;
}

function unquoteQueryValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "'" || quote === "\"") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1).replaceAll("\\'", "'").replaceAll('\\"', '"');
  }
  return trimmed;
}

function isRawLogLikeField(field: string) {
  const normalized = String(field || "").trim();
  return isGlobalMatchField(normalized) || normalized === GLOBAL_MATCH_COLUMN;
}

function unwrapLikeValue(value: string) {
  return value.startsWith("%") && value.endsWith("%") && value.length >= 2 ? value.slice(1, -1) : value;
}

function createConditionFromQueryToken(token: string, index: number): QueryFilterCondition | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }
  const nested = parseNestedRawLogToken(trimmed, index);
  if (nested) {
    return nested;
  }
  const match = trimmed.match(/^(.+?)\s*(not\s+like|like|!=|>=|<=|=|>|<)\s*(.+)$/i);
  if (!match) {
    return null;
  }
  const rawField = match[1].trim().replace(/^`|`$/g, "");
  if (rawField.includes("(") || rawField.includes(")")) {
    return null;
  }
  const rawOperator = match[2].toLowerCase() as QueryFilterCondition["operator"];
  const rawValue = match[3].trim();
  const rawValueQuote = rawValue[0];
  const isExplicitStringValue =
    (rawValueQuote === "'" || rawValueQuote === "\"") && rawValue.endsWith(rawValueQuote);
  let value = unquoteQueryValue(rawValue);
  const isRawLogLike =
    rawField === GLOBAL_MATCH_COLUMN && (rawOperator === "like" || rawOperator === "not like");
  if (isRawLogLike) {
    value = unwrapLikeValue(value);
  }
  return {
    id: `cond_url_${index}`,
    field: rawField,
    operator: rawOperator,
    value,
    valueType: /^-?\d+(\.\d+)?$/.test(value) && !isExplicitStringValue && !isRawLogLike ? "number" : "string"
  };
}

export function parseQueryTextConditions(query: string) {
  return query
    .split(/\s+AND\s+/i)
    .map((item, index) => createConditionFromQueryToken(item, index))
    .filter((item): item is QueryFilterCondition => Boolean(item));
}

function parseCompleteQueryConditions(query: string) {
  const tokens = query.split(/\s+AND\s+/i);
  const conditions = tokens.map((item, index) => createConditionFromQueryToken(item, index));
  return conditions.every((item): item is QueryFilterCondition => Boolean(item)) ? conditions : [];
}

function readLegacyV1ShareQuery() {
  if (typeof window === "undefined") {
    return "";
  }
  const pathname = window.location.pathname.replace(/\/+$/, "");
  if (!pathname.endsWith("/share")) {
    return "";
  }
  const params = new URLSearchParams(window.location.search);
  const keyword = params.get("kw")?.trim() ?? "";
  if (!keyword) {
    return "";
  }
  const query = params.get("query")?.trim() ?? "";
  const legacyMarkers = ["index", "logState", "mode", "queryType", "tab"];
  const hasLegacyShareShape = legacyMarkers.some((marker) => params.has(marker));
  const parsed = parseCompleteQueryConditions(keyword);
  if (parsed.length > 0) {
    if (query && query !== keyword) {
      return keyword;
    }
    return hasLegacyShareShape ? keyword : "";
  }
  if (hasLegacyShareShape || (query && query !== keyword)) {
    return keyword;
  }
  return "";
}

function readInitialQueryConditions() {
  if (typeof window === "undefined") {
    return [] as QueryFilterCondition[];
  }
  const params = new URLSearchParams(window.location.search);
  const query = params.get("query") ?? "";
  const keyword = params.get("kw")?.trim();
  if (keyword) {
    const legacyConditions = parseCompleteQueryConditions(keyword);
    if (legacyConditions.length > 0) {
      return legacyConditions;
    }
  }
  if (query.trim()) {
    return parseQueryTextConditions(query);
  }
  if (!keyword) {
    return [] as QueryFilterCondition[];
  }
  return [
    {
      id: "cond_url_kw",
      field: GLOBAL_MATCH_COLUMN,
      operator: "like",
      value: keyword,
      valueType: "string"
    }
  ] as QueryFilterCondition[];
}

function writeQueryToURL(query: string, syncKeyword = false) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  const nextQuery = query.trim();
  if (nextQuery) {
    url.searchParams.set("query", nextQuery);
  } else {
    url.searchParams.delete("query");
  }
  if (syncKeyword) {
    if (nextQuery) {
      url.searchParams.set("kw", nextQuery);
    } else {
      url.searchParams.delete("kw");
    }
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(window.history.state, "", next);
  }
}

function validateOperatorValueType(operator: QueryFilterCondition["operator"], valueType: QueryFilterValueType) {
  if ((operator === "like" || operator === "not like") && valueType !== "string") {
    throw new Error(`${operator} only supports string fields`);
  }
}

function isSystemTimeField(field: string) {
  return /^_time(_[a-z]+)?_$/.test(field) || field === "time" || field === "timestamp";
}

export function buildVisualQuery(conditions: QueryFilterCondition[]) {
  const enabledConditions = conditions.filter((condition) => !condition.disabled);
  const validConditions = enabledConditions.filter(
    (condition) => String(condition.field || "").trim() && String(condition.value ?? "").trim()
  );
  if (validConditions.length === 0) {
    return "";
  }
  return validConditions
    .map((condition) => {
      const field = String(condition.field || "").trim();
      if (!field) {
        throw new Error("Field is required");
      }
      if (isGlobalMatchField(field) || (isRawLogLikeField(field) && (condition.operator === "like" || condition.operator === "not like"))) {
        const raw = unwrapLikeValue(String(condition.value ?? "")).replaceAll("'", "\\'");
        const operator = isGlobalMatchField(field)
          ? condition.operator === "not like" ? "not like" : "like"
          : condition.operator;
        return `${quoteQueryField(GLOBAL_MATCH_COLUMN)} ${operator} '%${raw}%'`;
      }
      if (condition.nestedJson) {
        return buildNestedRawLogPredicate(field, condition.value, condition.valueType, condition.operator);
      }
      validateOperatorValueType(condition.operator, condition.valueType);
      const normalizedValue =
        condition.valueType === "number"
          ? normalizeNumberValue(condition.value, field)
          : condition.valueType === "datetime"
          ? normalizeDateTimeValue(condition.value)
          : normalizeStringValue(condition.value);
      return `${quoteQueryField(field)} ${condition.operator} ${normalizedValue}`;
    })
    .join(" AND ");
}

function buildCombinedQuery(rawQuery: string, visualQuery: string) {
  const raw = rawQuery.trim();
  const visual = visualQuery.trim();
  if (raw && visual) {
    return `${raw} AND ${visual}`;
  }
  return raw || visual;
}

function storageFieldName(field: QueryStorageAnalysisField) {
  return String(field.orderField || (field.rootName ? `${field.rootName}.${field.field}` : field.field)).trim();
}

function storageFieldTyp(field: QueryStorageAnalysisField): QueryFilterValueType {
  return field.typ === 1 || field.typ === 2 ? "number" : "string";
}

function findStorageField(
  fields: QueryStorageAnalysisField[],
  fieldKey: string
) {
  return fields.find((item) => storageFieldName(item) === fieldKey || item.field === fieldKey);
}

function findParentStorageField(
  fields: QueryStorageAnalysisField[],
  fieldKey: string
) {
  const separatorIndex = fieldKey.indexOf(".");
  if (separatorIndex <= 0) {
    return null;
  }
  const parentKey = fieldKey.slice(0, separatorIndex);
  return findStorageField(fields, parentKey) ?? null;
}

function fieldValueType(condition: QueryFilterCondition) {
  if (condition.valueType === "datetime") {
    return "datetime";
  }
  return condition.valueType === "number" ? "number" : "string";
}

function conditionOperator(condition: QueryFilterCondition) {
  if (isGlobalMatchField(condition.field)) {
    return condition.operator === "not like" ? "not_contains" : "contains";
  }
  if (condition.operator === "like") {
    return "contains";
  }
  if (condition.operator === "not like") {
    return "not_contains";
  }
  return condition.operator;
}

export function buildQueryFieldRef(
  condition: QueryFilterCondition,
  analysisFields: QueryAnalysisFieldsResponse
): QueryFieldRef {
  const fieldKey = String(condition.field || "").trim();
  if (isGlobalMatchField(fieldKey)) {
    return {
      fieldKey: GLOBAL_MATCH_COLUMN,
      displayName: GLOBAL_MATCH_FIELD,
      source: "column",
      path: GLOBAL_MATCH_COLUMN,
      valueType: "string",
      isAccelerated: true,
      acceleratedCol: GLOBAL_MATCH_COLUMN
    };
  }
  if (isSystemTimeField(fieldKey)) {
    return {
      fieldKey,
      displayName: fieldKey,
      source: "column",
      path: fieldKey,
      valueType: "datetime",
      isAccelerated: true,
      acceleratedCol: fieldKey
    };
  }
  const baseField = findStorageField(analysisFields.baseFields, fieldKey);
  if (baseField) {
    const name = storageFieldName(baseField);
    return {
      fieldKey: name,
      displayName: baseField.alias || name,
      source: "column",
      path: name,
      valueType: storageFieldTyp(baseField),
      isAccelerated: true,
      acceleratedCol: name
    };
  }
  const parentBaseField = findParentStorageField(analysisFields.baseFields, fieldKey);
  if (parentBaseField) {
    return {
      fieldKey,
      displayName: fieldKey,
      source: "tag_path",
      path: fieldKey,
      valueType: fieldValueType(condition),
      isAccelerated: false
    };
  }
  const logField = findStorageField(analysisFields.logFields, fieldKey);
  const name = logField ? storageFieldName(logField) : fieldKey;
  if (logField) {
    return {
      fieldKey: name,
      displayName: logField.alias || name,
      source: "column",
      path: name,
      valueType: storageFieldTyp(logField),
      isAccelerated: true,
      acceleratedCol: name
    };
  }
  return {
    fieldKey: name,
    displayName: name,
    source: "json_path",
    path: name,
    valueType: fieldValueType(condition),
    isAccelerated: false
  };
}

export function buildStructuredConditions(
  conditions: QueryFilterCondition[],
  analysisFields: QueryAnalysisFieldsResponse
): QueryConditionV2[] {
  return conditions
    .filter(
      (condition) =>
        !condition.disabled &&
        String(condition.field || "").trim() &&
        String(condition.value ?? "").trim()
    )
    .map((condition) => ({
      field: buildQueryFieldRef(condition, analysisFields),
      operator: conditionOperator(condition) as QueryOperatorV2,
      value: condition.value
    }));
}

export function buildEffectiveStructuredConditions(
  queryText: string,
  conditions: QueryFilterCondition[],
  analysisFields: QueryAnalysisFieldsResponse
): QueryConditionV2[] {
  return [
    ...buildStructuredConditions(parseQueryTextConditions(queryText), analysisFields),
    ...buildStructuredConditions(conditions, analysisFields)
  ];
}

function hasUnsupportedGlobalMatchCondition(
  conditions: QueryFilterCondition[],
  analysisFields: QueryAnalysisFieldsResponse
) {
  return (
    analysisFields.supportsGlobalMatch === false &&
    conditions.some(
      (condition) =>
        !condition.disabled &&
        isGlobalMatchField(condition.field) &&
        String(condition.value ?? "").trim()
    )
  );
}

export function useQueryWorkspace(
  startTime: string,
  endTime: string,
  initialTreeTarget?: QuerySourceTreeTarget,
  options?: {
    initialPage?: number;
    initialPageSize?: number;
  }
) {
  const initialConditions = useMemo(() => readInitialQueryConditions(), []);
  const legacyV1ShareQueryRef = useRef(readLegacyV1ShareQuery());
  const [instances, setInstances] = useState<QuerySourceInstance[]>([]);
  const [databases, setDatabases] = useState<QuerySourceDatabase[]>([]);
  const [tables, setTables] = useState<QuerySourceTable[]>([]);
  const [tablesByDatabase, setTablesByDatabase] = useState<Record<string, QuerySourceTable[]>>({});
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [queryText, setQueryTextState] = useState("");
  function releaseLegacyV1ShareQuery() {
    legacyV1ShareQueryRef.current = "";
  }
  function setQueryText(nextValue: string) {
    releaseLegacyV1ShareQuery();
    setQueryTextState(nextValue);
  }
  const [conditions, setConditions] = useState<QueryFilterCondition[]>(initialConditions);
  const [activeConditionId, setActiveConditionId] = useState<string | null>(initialConditions[0]?.id ?? null);
  const [savedFilterProfiles, setSavedFilterProfiles] = useState<QueryFilterProfile[]>([]);
  const [savedFilterLoading, setSavedFilterLoading] = useState(false);
  const [page, setPage] = useState(options?.initialPage && options.initialPage > 0 ? options.initialPage : 1);
  const [pageSize, setPageSize] = useState(
    options?.initialPageSize && options.initialPageSize > 0 ? options.initialPageSize : DEFAULT_PAGE_SIZE
  );
  const [logs, setLogs] = useState<QueryLogsResponse | null>(null);
  const [charts, setCharts] = useState<QueryHistogramBucket[]>([]);
  const [lastRunSnapshot, setLastRunSnapshot] = useState<QueryRunSnapshot | null>(null);
  const [analysisFields, setAnalysisFields] = useState<QueryAnalysisFieldsResponse>({
    baseFields: [],
    logFields: [],
    supportsGlobalMatch: true
  });
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [autocompleteItems, setAutocompleteItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [contextLoading, setContextLoading] = useState(false);
  const autocompleteRequestIdRef = useRef(0);
  const queryRunIdRef = useRef(0);
  const queryAbortControllerRef = useRef<AbortController | null>(null);
  const treeSelectionTargetRef = useRef<QuerySourceTreeTarget | null>(null);

  const selectedInstance = useMemo(
    () => instances.find((item) => item.id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId]
  );

  const selectedDatabaseEntry = useMemo(
    () => selectedInstance?.databases.find((item) => item.name === selectedDatabase) ?? null,
    [selectedDatabase, selectedInstance]
  );

  const selectedTableEntry = useMemo(
    () => selectedDatabaseEntry?.tables.find((item) => item.name === selectedTable) ?? null,
    [selectedDatabaseEntry, selectedTable]
  );

  function abortActiveQueryRequest() {
    queryAbortControllerRef.current?.abort();
    queryAbortControllerRef.current = null;
  }

  function cancelQuery() {
    queryRunIdRef.current += 1;
    abortActiveQueryRequest();
    setLoading(false);
    setChartLoading(false);
  }

  function clearQueryResults() {
    cancelQuery();
    setLogs(null);
    setCharts([]);
    setLastRunSnapshot(null);
  }

  function pickTreeName(preferred: string | undefined, fallback: string, options: string[]) {
    if (preferred && options.includes(preferred)) {
      return preferred;
    }
    if (fallback && options.includes(fallback)) {
      return fallback;
    }
    return options[0] ?? "";
  }

  function findTreeTargetByTableId(data: QuerySourceInstance[], tableId?: number | null): QuerySourceTreeTarget | null {
    if (!tableId) {
      return null;
    }
    for (const instance of data) {
      for (const database of instance.databases ?? []) {
        const table = (database.tables ?? []).find((item) => item.id === tableId);
        if (table) {
          return {
            instanceId: instance.id,
            databaseName: database.name,
            tableName: table.name,
            tableId
          };
        }
      }
    }
    return null;
  }

  function findTreeTargetByDatabaseTable(data: QuerySourceInstance[], target?: QuerySourceTreeTarget): QuerySourceTreeTarget | null {
    if (!target?.databaseName || !target.tableName) {
      return null;
    }
    for (const instance of data) {
      if (target.instanceId && instance.id !== target.instanceId) {
        continue;
      }
      const database = (instance.databases ?? []).find((item) => item.name === target.databaseName);
      const table = (database?.tables ?? []).find((item) => item.name === target.tableName);
      if (database && table) {
        return {
          instanceId: instance.id,
          databaseName: database.name,
          tableName: table.name,
          tableId: table.id
        };
      }
    }
    return null;
  }

  async function refreshSourceTree(target?: QuerySourceTreeTarget) {
    setContextLoading(true);
    try {
      const data = await listQuerySourceInstances();
      treeSelectionTargetRef.current =
        findTreeTargetByTableId(data, target?.tableId) ??
        findTreeTargetByDatabaseTable(data, target) ??
        target ??
        null;
      setInstances(data);
      setSelectedInstanceId((current) => {
        const resolvedTarget = treeSelectionTargetRef.current;
        const preferredId = resolvedTarget?.instanceId ?? target?.instanceId ?? current;
        if (preferredId && data.some((item) => item.id === preferredId)) {
          return preferredId;
        }
        return data[0]?.id ?? null;
      });
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load sources");
    } finally {
      setContextLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      if (active) {
        await refreshSourceTree(initialTreeTarget);
      }
    })();
    return () => {
      active = false;
      abortActiveQueryRequest();
    };
  }, []);

  useEffect(() => {
    if (!selectedInstance) {
      setDatabases([]);
      setTablesByDatabase({});
      setSelectedDatabase("");
      setSelectedTable("");
      setSelectedTableId(null);
      clearQueryResults();
      return;
    }
    setTables([]);
    setSavedFilterProfiles([]);
    clearQueryResults();
    const nextDatabases = selectedInstance.databases ?? [];
    const target = treeSelectionTargetRef.current;
    const tableIdTargetDatabase = target?.tableId
      ? nextDatabases.find((database) => (database.tables ?? []).some((table) => table.id === target.tableId))
      : undefined;
    const nextDatabase = pickTreeName(
      target?.instanceId === selectedInstance.id ? tableIdTargetDatabase?.name ?? target.databaseName : undefined,
      selectedDatabase,
      nextDatabases.map((item) => item.name)
    );
    setDatabases(nextDatabases);
    setTablesByDatabase(
      nextDatabases.reduce<Record<string, QuerySourceTable[]>>((acc, database) => {
        acc[database.name] = Array.isArray(database.tables) ? database.tables : [];
        return acc;
      }, {})
    );
    setSelectedDatabase(nextDatabase);
  }, [selectedInstance]);

  useEffect(() => {
    if (!selectedDatabaseEntry) {
      setTables([]);
      setSelectedTable("");
      setSelectedTableId(null);
      clearQueryResults();
      return;
    }
    const nextTables = selectedDatabaseEntry.tables ?? [];
    const target = treeSelectionTargetRef.current;
    const tableIdTargetTable = target?.tableId
      ? nextTables.find((table) => table.id === target.tableId)
      : undefined;
    const nextTable = pickTreeName(
      target?.instanceId === selectedInstanceId && target.databaseName === selectedDatabaseEntry.name
        ? tableIdTargetTable?.name ?? target.tableName
        : undefined,
      selectedTable,
      nextTables.map((item) => item.name)
    );
    setTables(nextTables);
    setSelectedTable(nextTable);
    setSelectedTableId(null);
    clearQueryResults();
  }, [selectedDatabaseEntry, selectedInstanceId, selectedTable]);

  useEffect(() => {
    if (!selectedTableEntry) {
      setSelectedTableId(null);
      return;
    }
    setSelectedTableId(selectedTableEntry.id);
    const target = treeSelectionTargetRef.current;
    if (
      target &&
      target.instanceId === selectedInstanceId &&
      target.databaseName === selectedDatabase &&
      (!target.tableName || target.tableName === selectedTableEntry.name) &&
      (!target.tableId || target.tableId === selectedTableEntry.id)
    ) {
      treeSelectionTargetRef.current = null;
    }
    const historyStore = readQueryHistory();
    setQueryHistory(historyStore[String(selectedTableEntry.id)] ?? []);
    setErrorMessage("");
  }, [selectedDatabase, selectedInstanceId, selectedTableEntry]);

  useEffect(() => {
    if (!selectedTableId) {
      setAnalysisFields({ baseFields: [], logFields: [], supportsGlobalMatch: true });
      return;
    }
    let active = true;
    getQueryAnalysisFields(selectedTableId)
      .then((data) => {
        if (active) {
          setAnalysisFields(data);
        }
      })
      .catch(() => {
        if (active) {
          setAnalysisFields({ baseFields: [], logFields: [], supportsGlobalMatch: true });
        }
      });
    return () => {
      active = false;
    };
  }, [selectedTableId]);

  async function refreshSavedFilterProfiles() {
    if (!selectedInstanceId || !selectedDatabase || !selectedTable) {
      setSavedFilterProfiles([]);
      return;
    }
    setSavedFilterLoading(true);
    try {
      const data = await listQueryFilters({
        instanceId: selectedInstanceId,
        database: selectedDatabase,
        table: selectedTable
      });
      setSavedFilterProfiles(Array.isArray(data) ? data : []);
    } catch {
      setSavedFilterProfiles([]);
    } finally {
      setSavedFilterLoading(false);
    }
  }

  useEffect(() => {
    void refreshSavedFilterProfiles();
  }, [selectedDatabase, selectedInstanceId, selectedTable]);

  useEffect(() => {
    if (!selectedInstanceId || !queryText.trim()) {
      autocompleteRequestIdRef.current += 1;
      setAutocompleteItems([]);
      return;
    }
    const requestId = autocompleteRequestIdRef.current + 1;
    autocompleteRequestIdRef.current = requestId;
    const querySnapshot = queryText.trim();
    const instanceSnapshot = selectedInstanceId;
    const timer = window.setTimeout(() => {
      getQueryAutocomplete(instanceSnapshot, querySnapshot)
        .then((data) => {
          if (
            autocompleteRequestIdRef.current !== requestId ||
            selectedInstanceId !== instanceSnapshot ||
            queryText.trim() !== querySnapshot
          ) {
            return;
          }
          setAutocompleteItems(normalizeAutocompleteItems(data));
        })
        .catch(() => {
          if (autocompleteRequestIdRef.current !== requestId) {
            return;
          }
          setAutocompleteItems([]);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [queryText, selectedInstanceId]);

  useEffect(() => {
    let generatedQuery = "";
    try {
      generatedQuery = buildVisualQuery(conditions);
    } catch {
      if (!queryText.trim()) {
        return;
      }
    }
    const nextQuery = buildCombinedQuery(queryText, generatedQuery);
    writeQueryToURL(nextQuery, !legacyV1ShareQueryRef.current);
  }, [conditions, queryText]);

  async function runQuery(
    nextPage = page,
    overrideRange?: { st: number; et: number },
    overrideConditions?: QueryFilterCondition[],
    overrideQueryText?: string,
    overridePageSize?: number
  ) {
    cancelQuery();
    const effectiveTableId = selectedTableId ?? selectedTableEntry?.id ?? null;
    if (!effectiveTableId) {
      setErrorMessage("Select an instance, database, and log table first");
      return;
    }
    const timeParams = overrideRange ?? createTimeParams(startTime, endTime);
    if (!timeParams) {
      setErrorMessage("Select a valid start and end time");
      return;
    }
    const effectiveConditions = overrideConditions ?? conditions;
    const effectiveQueryText = overrideQueryText ?? queryText;
    if (hasUnsupportedGlobalMatchCondition(effectiveConditions, analysisFields)) {
      setErrorMessage("Current log table has no log content field, cannot use All fields");
      return;
    }
    let generatedQuery = "";
    try {
      generatedQuery = buildVisualQuery(effectiveConditions);
    } catch (error) {
      if (!effectiveQueryText.trim()) {
        setErrorMessage(error instanceof Error ? error.message : "Invalid conditions");
        return;
      }
    }
    const requestQuery = buildCombinedQuery(effectiveQueryText, generatedQuery) || undefined;
    const structuredConditions = buildStructuredConditions(effectiveConditions, analysisFields);
    const effectiveStructuredConditions = buildEffectiveStructuredConditions(
      effectiveQueryText,
      effectiveConditions,
      analysisFields
    );
    const shouldUseStructuredRun =
      !legacyV1ShareQueryRef.current && !effectiveQueryText.trim() && structuredConditions.length > 0;
    const effectivePageSize =
      overridePageSize && Number.isFinite(overridePageSize) && overridePageSize > 0
        ? Math.round(overridePageSize)
        : pageSize;

    const params = {
      ...timeParams,
      query: legacyV1ShareQueryRef.current || requestQuery,
      page: nextPage,
      pageSize: effectivePageSize
    };
    const abortController = new AbortController();
    queryAbortControllerRef.current = abortController;
    const requestOptions = { signal: abortController.signal };
    const runId = queryRunIdRef.current + 1;
    queryRunIdRef.current = runId;

    setLoading(true);
    setChartLoading(true);
    setErrorMessage("");

    const logsRequest = shouldUseStructuredRun
      ? runQueryV2({
          tid: effectiveTableId,
          st: timeParams.st,
          et: timeParams.et,
          page: nextPage,
          pageSize: effectivePageSize,
          conditions: structuredConditions,
          sorts: [],
          displayFields: []
        },
        requestOptions
      )
      : getQueryLogs(effectiveTableId, params, requestOptions);

    const [logsResult, chartsResult] = await Promise.allSettled([
      logsRequest,
      getQueryCharts(effectiveTableId, params, requestOptions)
    ]);
    if (queryRunIdRef.current !== runId) {
      return;
    }
    if (queryAbortControllerRef.current === abortController) {
      queryAbortControllerRef.current = null;
    }

    const logsAborted = logsResult.status === "rejected" && isAbortRequestError(logsResult.reason);
    const chartsAborted = chartsResult.status === "rejected" && isAbortRequestError(chartsResult.reason);
    if (abortController.signal.aborted || logsAborted || chartsAborted) {
      setLoading(false);
      setChartLoading(false);
      return;
    }

    if (logsResult.status === "fulfilled") {
      setLogs(logsResult.value);
      setLastRunSnapshot({
        range: timeParams,
        conditions: effectiveStructuredConditions
      });
      setPage(nextPage);
      if (nextPage === 1 && requestQuery) {
        const historyStore = readQueryHistory();
        const current = historyStore[String(effectiveTableId)] ?? [];
        const nextHistory = [requestQuery, ...current.filter((item) => item !== requestQuery)].slice(
          0,
          10
        );
        const nextStore = {
          ...historyStore,
          [String(effectiveTableId)]: nextHistory
        };
        writeQueryHistory(nextStore);
        setQueryHistory(nextHistory);
      }
    } else {
      setLogs(null);
      setErrorMessage(logsResult.reason instanceof Error ? logsResult.reason.message : "Query failed");
    }

    if (chartsResult.status === "fulfilled") {
      setCharts(chartsResult.value);
    } else {
      setCharts([]);
    }

    setLoading(false);
    setChartLoading(false);
  }

  const suggestionFieldOptions = useMemo(
    () => {
      const options = [
        ...analysisFields.baseFields.map((item) => ({
          field: storageFieldName(item),
          source: "column" as const,
          sourceLabel: "Column",
          queryLabel: "Column query",
          valueType: storageFieldTyp(item)
        })),
        ...analysisFields.logFields.map((item) => ({
          field: storageFieldName(item),
          source: "column" as const,
          sourceLabel: "Parsed field",
          queryLabel: "Indexed field",
          valueType: storageFieldTyp(item)
        }))
      ];
      const seenFields = new Set<string>();
      return options
        .map((item) => ({ ...item, field: String(item.field || "").trim() }))
        .filter((item) => {
          if (!item.field || isGlobalMatchField(item.field)) {
            return false;
          }
          const key = normalizeSuggestionFieldKey(item.field);
          if (seenFields.has(key)) {
            return false;
          }
          seenFields.add(key);
          return true;
        });
    },
    [analysisFields]
  );
  const suggestionFields = useMemo(
    () => suggestionFieldOptions.map((item) => item.field).slice(0, 12),
    [suggestionFieldOptions]
  );

  async function saveCurrentQuery(name: string, timeRange: { startTime: string; endTime: string }) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error("Enter a saved query name");
    }
    if (!selectedInstanceId || !selectedInstance || !selectedDatabase || !selectedTable) {
      throw new Error("Select an instance, database, and log table first");
    }
    const enabledConditions = conditions.filter(
      (condition) =>
        !condition.disabled &&
        String(condition.field || "").trim() &&
        String(condition.value ?? "").trim()
    );
    if (enabledConditions.length === 0) {
      throw new Error("Saved queries currently require at least one condition");
    }
    const saved = await createQueryFilter({
      name: normalizedName,
      instanceId: selectedInstanceId,
      instanceName: selectedInstance.name,
      database: selectedDatabase,
      table: selectedTable,
      timeRange,
      conditions: enabledConditions
    });
    await refreshSavedFilterProfiles();
    return saved;
  }

  async function deleteSavedFilterProfile(id: number) {
    await deleteQueryFilter(id);
    await refreshSavedFilterProfiles();
  }

  async function collectLogsForDownload(limit: number, signal?: AbortSignal) {
    const effectiveTableId = selectedTableId ?? selectedTableEntry?.id ?? null;
    if (!effectiveTableId) {
      throw new Error("Select an instance, database, and log table first");
    }
    const timeParams = lastRunSnapshot?.range ?? createTimeParams(startTime, endTime);
    if (!timeParams) {
      throw new Error("Select a valid start and end time");
    }
    if (hasUnsupportedGlobalMatchCondition(conditions, analysisFields)) {
      throw new Error("Current log table has no log content field, cannot use All fields");
    }
    let generatedQuery = "";
    try {
      generatedQuery = buildVisualQuery(conditions);
    } catch (error) {
      if (!queryText.trim()) {
        throw error instanceof Error ? error : new Error("Invalid conditions");
      }
    }
    const requestQuery = buildCombinedQuery(queryText, generatedQuery) || undefined;
    const structuredConditions = buildStructuredConditions(conditions, analysisFields);
    const shouldUseStructuredRun =
      !legacyV1ShareQueryRef.current && !queryText.trim() && structuredConditions.length > 0;
    const maxRows = Math.max(1, Math.floor(limit));
    const collected: Array<Record<string, unknown>> = [];
    let total = 0;
    let page = 1;
    while (collected.length < maxRows) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      const pageSize = Math.min(DOWNLOAD_LOG_PAGE_SIZE, maxRows - collected.length);
      const requestOptions = { signal };
      const data = shouldUseStructuredRun
        ? await runQueryV2(
            {
              tid: effectiveTableId,
              st: timeParams.st,
              et: timeParams.et,
              page,
              pageSize,
              conditions: structuredConditions,
              sorts: [],
              displayFields: []
            },
            requestOptions
          )
        : await getQueryLogs(
            effectiveTableId,
            {
              ...timeParams,
              query: legacyV1ShareQueryRef.current || requestQuery,
              page,
              pageSize
            },
            requestOptions
          );
      total = Number(data.count) > 0 ? Number(data.count) : total;
      const batch = Array.isArray(data.logs) ? data.logs : [];
      if (batch.length === 0) {
        break;
      }
      collected.push(...batch);
      if (batch.length < pageSize) {
        break;
      }
      if (total > 0 && collected.length >= total) {
        break;
      }
      page += 1;
    }
    const logs = collected.slice(0, maxRows);
    return {
      logs,
      total: total || logs.length,
      truncated: (total || 0) > logs.length
    };
  }

  function clearQueryHistory() {
    const effectiveTableId = selectedTableId ?? selectedTableEntry?.id ?? null;
    if (!effectiveTableId) {
      return;
    }
    const historyStore = readQueryHistory();
    delete historyStore[String(effectiveTableId)];
    writeQueryHistory(historyStore);
    setQueryHistory([]);
  }

  return {
    instances,
    databases,
    tables,
    tablesByDatabase,
    selectedInstanceId,
    selectedDatabase,
    selectedTable,
    selectedTableId,
    selectedInstance,
    queryText,
    conditions,
    activeConditionId,
    savedFilterProfiles,
    savedFilterLoading,
    page,
    pageSize,
    logs,
    charts,
    lastRunSnapshot,
    analysisFields,
    suggestionFieldOptions,
    suggestionFields,
    queryHistory,
    autocompleteItems,
    loading,
    chartLoading,
    contextLoading,
    errorMessage,
    setSelectedInstanceId: (nextValue: number | null) => {
      if (nextValue === selectedInstanceId) {
        return;
      }
      treeSelectionTargetRef.current = null;
      setSelectedDatabase("");
      setSelectedTable("");
      setSelectedTableId(null);
      setDatabases([]);
      setTablesByDatabase({});
      setTables([]);
      setSavedFilterProfiles([]);
      clearQueryResults();
      setSelectedInstanceId(nextValue);
    },
    setSelectedDatabase: (nextValue: string) => {
      if (nextValue === selectedDatabase) {
        return;
      }
      treeSelectionTargetRef.current = null;
      setSelectedTable("");
      setSelectedTableId(null);
      setTables([]);
      setSavedFilterProfiles([]);
      clearQueryResults();
      setSelectedDatabase(nextValue);
    },
    setSelectedTable: (nextValue: string) => {
      treeSelectionTargetRef.current = null;
      setSelectedTable(nextValue);
    },
    setQueryText,
    setConditions,
    setPageSize,
    setActiveConditionId,
    addCondition: () => {
      const next = createEmptyCondition();
      setConditions((current) => [...current, next]);
      setActiveConditionId(next.id);
      return next.id;
    },
    updateCondition: (id: string, patch: Partial<QueryFilterCondition>) => {
      setConditions((current) =>
        current.map((condition) =>
          condition.id === id
            ? {
                ...condition,
                ...patch
              }
            : condition
        )
      );
    },
    removeCondition: (id: string) => {
      setConditions((current) => {
        const next = current.filter((condition) => condition.id !== id);
        if (activeConditionId === id) {
          setActiveConditionId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    buildQueryText: () => buildCombinedQuery(queryText, buildVisualQuery(conditions)),
    applyFilterProfile: (profile: QueryFilterProfile) => {
      const nextConditions = Array.isArray(profile.conditions) ? profile.conditions : [];
      setConditions(nextConditions);
      setActiveConditionId(nextConditions[0]?.id ?? null);
      setQueryText("");
    },
    applySuggestion: (value: string) => {
      setQueryText(value);
      setConditions([]);
      setActiveConditionId(null);
    },
    collectLogsForDownload,
    clearQueryHistory,
    saveCurrentQuery,
    deleteSavedFilterProfile,
    refreshSavedFilterProfiles,
    runQuery,
    cancelQuery,
    setPage,
    refreshSourceTree
  };
}
