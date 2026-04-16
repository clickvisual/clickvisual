import { useEffect, useMemo, useState } from "react";
import {
  getQueryAnalysisFields,
  getQueryAutocomplete,
  getQueryCharts,
  getQueryLogs,
  listQuerySourceDatabases,
  listQuerySourceInstances,
  listQuerySourceTables,
  resolveQueryTableId
} from "../api/query";
import type {
  QueryAnalysisFieldsResponse,
  QueryAutocompleteResponse,
  QueryHistogramBucket,
  QueryLogsResponse,
  QuerySourceDatabase,
  QuerySourceInstance,
  QuerySourceTable
} from "../types/contracts";
import type { TimeRangeValue } from "../../../shared/state/TimeRangeContext";

const DEFAULT_PAGE_SIZE = 20;
const QUERY_HISTORY_STORAGE_KEY = "clickvisual-v2-query-history";
const SAVED_QUERY_STORAGE_KEY = "clickvisual-v2-saved-query";

function getRangeSeconds(timeRange: TimeRangeValue) {
  switch (timeRange) {
    case "15m":
      return 15 * 60;
    case "24h":
      return 24 * 60 * 60;
    default:
      return 60 * 60;
  }
}

function createTimeParams(timeRange: TimeRangeValue) {
  const et = Math.floor(Date.now() / 1000);
  const st = et - getRangeSeconds(timeRange);
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

function readSavedQueries() {
  if (typeof window === "undefined") {
    return [] as string[];
  }
  try {
    const raw = window.localStorage.getItem(SAVED_QUERY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSavedQueries(value: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SAVED_QUERY_STORAGE_KEY, JSON.stringify(value));
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

export function useQueryWorkspace(timeRange: TimeRangeValue) {
  const [instances, setInstances] = useState<QuerySourceInstance[]>([]);
  const [databases, setDatabases] = useState<QuerySourceDatabase[]>([]);
  const [tables, setTables] = useState<QuerySourceTable[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [queryText, setQueryText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [logs, setLogs] = useState<QueryLogsResponse | null>(null);
  const [charts, setCharts] = useState<QueryHistogramBucket[]>([]);
  const [analysisFields, setAnalysisFields] = useState<QueryAnalysisFieldsResponse>({
    baseFields: [],
    logFields: []
  });
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<string[]>(() => readSavedQueries());
  const [autocompleteItems, setAutocompleteItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [contextLoading, setContextLoading] = useState(false);

  const selectedInstance = useMemo(
    () => instances.find((item) => item.id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId]
  );

  useEffect(() => {
    let active = true;
    setContextLoading(true);
    listQuerySourceInstances()
      .then((data) => {
        if (!active) {
          return;
        }
        setInstances(data);
        setSelectedInstanceId((current) => current ?? data[0]?.id ?? null);
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "实例列表加载失败");
        }
      })
      .finally(() => {
        if (active) {
          setContextLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedInstanceId) {
      setDatabases([]);
      setSelectedDatabase("");
      return;
    }
    let active = true;
    setContextLoading(true);
    setSelectedDatabase("");
    setSelectedTable("");
    setSelectedTableId(null);
    setTables([]);
    setLogs(null);
    setCharts([]);
    listQuerySourceDatabases(selectedInstanceId)
      .then((data) => {
        if (!active) {
          return;
        }
        setDatabases(data);
        setSelectedDatabase(data[0]?.name ?? "");
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "数据库列表加载失败");
        }
      })
      .finally(() => {
        if (active) {
          setContextLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedInstanceId]);

  useEffect(() => {
    if (!selectedInstanceId || !selectedDatabase) {
      setTables([]);
      setSelectedTable("");
      return;
    }
    let active = true;
    setContextLoading(true);
    setSelectedTable("");
    setSelectedTableId(null);
    setLogs(null);
    setCharts([]);
    listQuerySourceTables(selectedInstanceId, selectedDatabase)
      .then((data) => {
        if (!active) {
          return;
        }
        setTables(data);
        setSelectedTable(data[0]?.name ?? "");
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "数据表列表加载失败");
        }
      })
      .finally(() => {
        if (active) {
          setContextLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedInstanceId, selectedDatabase]);

  useEffect(() => {
    if (!selectedInstanceId || !selectedDatabase || !selectedTable || !selectedInstance) {
      setSelectedTableId(null);
      return;
    }
    let active = true;
    setContextLoading(true);
    setSelectedTableId(null);
    setLogs(null);
    setCharts([]);
    resolveQueryTableId({
      instance: String(selectedInstanceId),
      database: selectedDatabase,
      datasource: selectedInstance.name,
      table: selectedTable
    })
      .then((data) => {
        if (active) {
          setSelectedTableId(data);
          const historyStore = readQueryHistory();
          setQueryHistory(historyStore[String(data)] ?? []);
          setErrorMessage("");
        }
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "日志库解析失败");
        }
      })
      .finally(() => {
        if (active) {
          setContextLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedDatabase, selectedInstance, selectedInstanceId, selectedTable]);

  useEffect(() => {
    if (!selectedTableId) {
      setAnalysisFields({ baseFields: [], logFields: [] });
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
          setAnalysisFields({ baseFields: [], logFields: [] });
        }
      });
    return () => {
      active = false;
    };
  }, [selectedTableId]);

  useEffect(() => {
    if (!selectedInstanceId || !queryText.trim()) {
      setAutocompleteItems([]);
      return;
    }
    const timer = window.setTimeout(() => {
      getQueryAutocomplete(selectedInstanceId, queryText.trim())
        .then((data) => {
          setAutocompleteItems(normalizeAutocompleteItems(data));
        })
        .catch(() => {
          setAutocompleteItems([]);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [queryText, selectedInstanceId]);

  async function runQuery(nextPage = page, overrideRange?: { st: number; et: number }) {
    if (!selectedTableId) {
      setErrorMessage("请先选择完整的实例、数据库和数据表");
      return;
    }
    const timeParams = overrideRange ?? createTimeParams(timeRange);
    const params = {
      ...timeParams,
      query: queryText.trim() || undefined,
      page: nextPage,
      pageSize
    };

    setLoading(true);
    setChartLoading(true);
    setErrorMessage("");

    const [logsResult, chartsResult] = await Promise.allSettled([
      getQueryLogs(selectedTableId, params),
      getQueryCharts(selectedTableId, params)
    ]);

    if (logsResult.status === "fulfilled") {
      setLogs(logsResult.value);
      setPage(nextPage);
      if (selectedTableId && nextPage === 1 && queryText.trim()) {
        const historyStore = readQueryHistory();
        const current = historyStore[String(selectedTableId)] ?? [];
        const nextHistory = [queryText.trim(), ...current.filter((item) => item !== queryText.trim())].slice(0, 10);
        const nextStore = {
          ...historyStore,
          [String(selectedTableId)]: nextHistory
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

  const suggestionFields = useMemo(
    () => [...analysisFields.baseFields, ...analysisFields.logFields].filter(Boolean).slice(0, 12),
    [analysisFields]
  );

  function saveCurrentQuery() {
    const value = queryText.trim();
    if (!value) {
      return false;
    }
    const next = [value, ...savedQueries.filter((item) => item !== value)].slice(0, 10);
    setSavedQueries(next);
    writeSavedQueries(next);
    return true;
  }

  return {
    instances,
    databases,
    tables,
    selectedInstanceId,
    selectedDatabase,
    selectedTable,
    selectedTableId,
    selectedInstance,
    queryText,
    page,
    pageSize,
    logs,
    charts,
    analysisFields,
    suggestionFields,
    queryHistory,
    savedQueries,
    autocompleteItems,
    loading,
    chartLoading,
    contextLoading,
    errorMessage,
    setSelectedInstanceId,
    setSelectedDatabase,
    setSelectedTable,
    setQueryText,
    applySuggestion: (value: string) => setQueryText(value),
    saveCurrentQuery,
    runQuery,
    setPage
  };
}
