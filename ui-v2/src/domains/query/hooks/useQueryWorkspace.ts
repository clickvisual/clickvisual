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

const DEFAULT_PAGE_SIZE = 20;
const QUERY_HISTORY_STORAGE_KEY = "clickvisual-v2-query-history";
const DEFAULT_CONDITION_OPERATOR = "=";
const GLOBAL_MATCH_FIELD = "全局匹配";
const GLOBAL_MATCH_COLUMN = "_raw_log_";

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
      throw new Error(`字段 ${field || "unknown"} 需要数字值`);
    }
    return String(value);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`字段 ${field || "unknown"} 需要数字值`);
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`字段 ${field || "unknown"} 需要数字值`);
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
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) {
    return field;
  }
  return `\`${field.replaceAll("`", "``")}\``;
}

function unquoteQueryValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "'" || quote === "\"") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1).replaceAll("\\'", "'").replaceAll('\\"', '"');
  }
  return trimmed;
}

function createConditionFromQueryToken(token: string, index: number): QueryFilterCondition | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(.+?)\s+(not\s+like|like|!=|=)\s+(.+)$/i);
  if (!match) {
    return null;
  }
  const rawField = match[1].trim().replace(/^`|`$/g, "");
  const rawOperator = match[2].toLowerCase() as QueryFilterCondition["operator"];
  let value = unquoteQueryValue(match[3]);
  const isGlobalLike = rawField === GLOBAL_MATCH_COLUMN && rawOperator === "like";
  if (isGlobalLike && value.startsWith("%") && value.endsWith("%") && value.length >= 2) {
    value = value.slice(1, -1);
  }
  return {
    id: `cond_url_${index}`,
    field: isGlobalLike ? GLOBAL_MATCH_FIELD : rawField,
    operator: isGlobalLike ? "like" : rawOperator,
    value,
    valueType: /^-?\d+(\.\d+)?$/.test(value) && !isGlobalLike ? "number" : "string"
  };
}

function readInitialQueryConditions() {
  if (typeof window === "undefined") {
    return [] as QueryFilterCondition[];
  }
  const params = new URLSearchParams(window.location.search);
  const query = params.get("query") ?? "";
  if (!query.trim()) {
    const keyword = params.get("kw")?.trim();
    if (keyword) {
      return [
        {
          id: "cond_url_kw",
          field: GLOBAL_MATCH_FIELD,
          operator: "like",
          value: keyword,
          valueType: "string"
        }
      ] as QueryFilterCondition[];
    }
  }
  return query
    .split(/\s+AND\s+/i)
    .map((item, index) => createConditionFromQueryToken(item, index))
    .filter((item): item is QueryFilterCondition => Boolean(item));
}

function writeQueryToURL(query: string) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (query.trim()) {
    url.searchParams.set("query", query.trim());
  } else {
    url.searchParams.delete("query");
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(window.history.state, "", next);
  }
}

function validateOperatorValueType(operator: QueryFilterCondition["operator"], valueType: QueryFilterValueType) {
  if ((operator === "like" || operator === "not like") && valueType !== "string") {
    throw new Error(`${operator} 只支持字符串字段`);
  }
}

function isSystemTimeField(field: string) {
  return /^_time(_[a-z]+)?_$/.test(field) || field === "time" || field === "timestamp";
}

function buildVisualQuery(conditions: QueryFilterCondition[]) {
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
        throw new Error("筛选字段不能为空");
      }
      if (field === GLOBAL_MATCH_FIELD) {
        const raw = String(condition.value ?? "").replaceAll("'", "\\'");
        return `${GLOBAL_MATCH_COLUMN} like '%${raw}%'`;
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

function storageFieldName(field: QueryStorageAnalysisField) {
  return String(field.orderField || (field.rootName ? `${field.rootName}.${field.field}` : field.field)).trim();
}

function storageFieldTyp(field: QueryStorageAnalysisField): QueryFilterValueType {
  return field.typ === 1 || field.typ === 2 ? "number" : "string";
}

function fieldValueType(condition: QueryFilterCondition) {
  if (condition.valueType === "datetime") {
    return "datetime";
  }
  return condition.valueType === "number" ? "number" : "string";
}

function conditionOperator(condition: QueryFilterCondition) {
  if (String(condition.field || "").trim() === GLOBAL_MATCH_FIELD) {
    return "contains";
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
  if (fieldKey === GLOBAL_MATCH_FIELD) {
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
  const baseField = analysisFields.baseFields.find((item) => storageFieldName(item) === fieldKey || item.field === fieldKey);
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
  const logField = analysisFields.logFields.find((item) => storageFieldName(item) === fieldKey || item.field === fieldKey);
  const name = logField ? storageFieldName(logField) : fieldKey;
  return {
    fieldKey: name,
    displayName: logField?.alias || name,
    source: "json_path",
    path: name,
    valueType: logField ? storageFieldTyp(logField) : fieldValueType(condition),
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

function hasUnsupportedGlobalMatchCondition(
  conditions: QueryFilterCondition[],
  analysisFields: QueryAnalysisFieldsResponse
) {
  return (
    analysisFields.supportsGlobalMatch === false &&
    conditions.some(
      (condition) =>
        !condition.disabled &&
        String(condition.field || "").trim() === GLOBAL_MATCH_FIELD &&
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
  const [instances, setInstances] = useState<QuerySourceInstance[]>([]);
  const [databases, setDatabases] = useState<QuerySourceDatabase[]>([]);
  const [tables, setTables] = useState<QuerySourceTable[]>([]);
  const [tablesByDatabase, setTablesByDatabase] = useState<Record<string, QuerySourceTable[]>>({});
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [queryText, setQueryText] = useState("");
  const [conditions, setConditions] = useState<QueryFilterCondition[]>(initialConditions);
  const [activeConditionId, setActiveConditionId] = useState<string | null>(initialConditions[0]?.id ?? null);
  const [savedFilterProfiles, setSavedFilterProfiles] = useState<QueryFilterProfile[]>([]);
  const [savedFilterLoading, setSavedFilterLoading] = useState(false);
  const [page, setPage] = useState(options?.initialPage && options.initialPage > 0 ? options.initialPage : 1);
  const [pageSize] = useState(
    options?.initialPageSize && options.initialPageSize > 0 ? options.initialPageSize : DEFAULT_PAGE_SIZE
  );
  const [logs, setLogs] = useState<QueryLogsResponse | null>(null);
  const [charts, setCharts] = useState<QueryHistogramBucket[]>([]);
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

  function clearQueryResults() {
    setLogs(null);
    setCharts([]);
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

  async function refreshSourceTree(target?: QuerySourceTreeTarget) {
    setContextLoading(true);
    try {
      const data = await listQuerySourceInstances();
      treeSelectionTargetRef.current = findTreeTargetByTableId(data, target?.tableId) ?? target ?? null;
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
      setErrorMessage(error instanceof Error ? error.message : "实例列表加载失败");
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
    let nextQuery = queryText.trim();
    if (!nextQuery) {
      try {
        nextQuery = buildVisualQuery(conditions);
      } catch {
        return;
      }
    }
    writeQueryToURL(nextQuery);
  }, [conditions, queryText]);

  async function runQuery(
    nextPage = page,
    overrideRange?: { st: number; et: number },
    overrideConditions?: QueryFilterCondition[]
  ) {
    const effectiveTableId = selectedTableId ?? selectedTableEntry?.id ?? null;
    if (!effectiveTableId) {
      setErrorMessage("请先选择完整的实例、数据库和日志表");
      return;
    }
    const timeParams = overrideRange ?? createTimeParams(startTime, endTime);
    if (!timeParams) {
      setErrorMessage("请选择有效的开始时间和结束时间");
      return;
    }
    const effectiveConditions = overrideConditions ?? conditions;
    if (hasUnsupportedGlobalMatchCondition(effectiveConditions, analysisFields)) {
      setErrorMessage("当前日志表未配置日志内容字段，不能使用全局匹配");
      return;
    }
    let generatedQuery = "";
    try {
      generatedQuery = buildVisualQuery(effectiveConditions);
    } catch (error) {
      if (!queryText.trim()) {
        setErrorMessage(error instanceof Error ? error.message : "筛选条件不合法");
        return;
      }
    }
    const requestQuery = overrideConditions ? generatedQuery || undefined : queryText.trim() || generatedQuery || undefined;
    const structuredConditions = buildStructuredConditions(effectiveConditions, analysisFields);
    const shouldUseStructuredRun =
      (overrideConditions ? true : !queryText.trim()) && structuredConditions.length > 0;

    const params = {
      ...timeParams,
      query: requestQuery,
      page: nextPage,
      pageSize
    };
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
          pageSize,
          conditions: structuredConditions,
          sorts: [],
          displayFields: []
        })
      : getQueryLogs(effectiveTableId, params);

    const [logsResult, chartsResult] = await Promise.allSettled([
      logsRequest,
      getQueryCharts(effectiveTableId, params)
    ]);
    if (queryRunIdRef.current !== runId) {
      return;
    }

    if (logsResult.status === "fulfilled") {
      setLogs(logsResult.value);
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
      setErrorMessage(logsResult.reason instanceof Error ? logsResult.reason.message : "日志查询失败");
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
      const globalMatchOptions =
        analysisFields.supportsGlobalMatch === false
          ? []
          : [
              {
                field: GLOBAL_MATCH_FIELD,
                source: "column" as const,
                sourceLabel: "全局匹配",
                queryLabel: "日志内容 LIKE",
                valueType: "string" as const
              }
            ];
      return [
        ...globalMatchOptions,
        ...analysisFields.baseFields.map((item) => ({
          field: storageFieldName(item),
          source: "column" as const,
          sourceLabel: "物理列",
          queryLabel: "列查询",
          valueType: storageFieldTyp(item)
        })),
        ...analysisFields.logFields.map((item) => ({
          field: storageFieldName(item),
          source: "json_path" as const,
          sourceLabel: "解析字段",
          queryLabel: "JSON 路径查询",
          valueType: storageFieldTyp(item)
        }))
      ].filter((item) => item.field);
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
      throw new Error("请输入收藏名称");
    }
    if (!selectedInstanceId || !selectedInstance || !selectedDatabase || !selectedTable) {
      throw new Error("请先选择完整的实例、数据库和日志表");
    }
    const enabledConditions = conditions.filter(
      (condition) =>
        !condition.disabled &&
        String(condition.field || "").trim() &&
        String(condition.value ?? "").trim()
    );
    if (enabledConditions.length === 0) {
      throw new Error("当前收藏只支持条件构建器，请先添加至少一个条件");
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
    buildQueryText: () => buildVisualQuery(conditions),
    applyFilterProfile: (profile: QueryFilterProfile) => {
      const nextConditions = Array.isArray(profile.conditions) ? profile.conditions : [];
      setConditions(nextConditions);
      setActiveConditionId(nextConditions[0]?.id ?? null);
      setQueryText(buildVisualQuery(nextConditions));
    },
    applySuggestion: (value: string) => setQueryText(value),
    saveCurrentQuery,
    deleteSavedFilterProfile,
    refreshSavedFilterProfiles,
    runQuery,
    setPage,
    refreshSourceTree
  };
}
