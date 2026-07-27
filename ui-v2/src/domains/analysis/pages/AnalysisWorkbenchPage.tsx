import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ANALYSIS_PRIMARY_MINING,
  ANALYSIS_PRIMARY_SHORT,
  ANALYSIS_SECONDARY_BOARD,
  ANALYSIS_SECONDARY_DATABASE,
  ANALYSIS_SECONDARY_DATA_INTEGRATION,
  ANALYSIS_SECONDARY_DATA_MINING,
  ANALYSIS_SOURCE_TYPE_CLICKHOUSE,
  ANALYSIS_SOURCE_TYPE_MYSQL,
  ANALYSIS_TERTIARY_CLICKHOUSE,
  ANALYSIS_TERTIARY_END,
  ANALYSIS_TERTIARY_MYSQL,
  ANALYSIS_TERTIARY_OFFLINE_SYNC,
  ANALYSIS_TERTIARY_START,
  createAnalysisCrontab,
  createAnalysisDataSource,
  createAnalysisFolder,
  createAnalysisNode,
  createAnalysisWorkflow,
  deleteAnalysisCrontab,
  deleteAnalysisFolder,
  deleteAnalysisDataSource,
  deleteAnalysisNode,
  deleteAnalysisWorkflow,
  getAnalysisCrontab,
  getAnalysisNode,
  getAnalysisNodeResult,
  getAnalysisNodeTree,
  getAnalysisTableCreateSql,
  getAnalysisTableDependencies,
  getAnalysisWorkerDashboard,
  listAnalysisDataSources,
  listAnalysisDatabases,
  listAnalysisInstances,
  listAnalysisNodeHistories,
  listAnalysisNodeResults,
  listAnalysisSourceColumns,
  listAnalysisSourceDatabases,
  listAnalysisSourceTables,
  listAnalysisTables,
  listAnalysisUsers,
  listAnalysisWorkers,
  listAnalysisWorkflows,
  lockAnalysisNode,
  runAnalysisNode,
  stopAnalysisNode,
  structuralTransferAnalysis,
  updateAnalysisCrontab,
  updateAnalysisFolder,
  updateAnalysisDataSource,
  updateAnalysisWorkflow,
  unlockAnalysisNode,
  updateAnalysisNode,
  type AnalysisDataSource,
  type AnalysisDataSourcePayload,
  type AnalysisFolder,
  type AnalysisInstance,
  type AnalysisNode,
  type AnalysisNodeDetail,
  type AnalysisNodeHistory,
  type AnalysisNodeResult,
  type AnalysisCrontabArg,
  type AnalysisCrontabPayload,
  type AnalysisRealtimeTableDependency,
  type AnalysisTableColumn,
  type AnalysisUser,
  type AnalysisWorkerDashboard,
  type AnalysisWorkerFlow,
  type AnalysisWorkerRow,
  type AnalysisWorkflow
} from "../api/analysis";

type AnalysisMode = "offline" | "temporary" | "datasource" | "realtime" | "dashboard" | "executions";

interface TreeNodeRow {
  kind: "folder" | "node";
  id: number;
  name: string;
  desc: string;
  depth: number;
  folderId?: number;
  parentId?: number;
  node?: AnalysisNode;
}

interface NodeDraft {
  name: string;
  desc: string;
  content: string;
  folderId: number;
  secondary: number;
  tertiary: number;
}

interface DataSourceDraft {
  name: string;
  desc: string;
  url: string;
  username: string;
  password: string;
  typ: number;
}

interface WorkflowDraft {
  name: string;
  desc: string;
}

interface WorkerFilters {
  start: number;
  end: number;
  isInCharge: number;
  nodeName: string;
  tertiary: number;
  status: number;
  current: number;
  pageSize: number;
}

interface CrontabDraft {
  enabled: boolean;
  dutyUid: number;
  cron: string;
  desc: string;
  channelIdsText: string;
  args: AnalysisCrontabArg[];
  isRetry: boolean;
  retryInterval: number;
  retryTimes: number;
}

interface ParsedResultDetail {
  message: string;
  logs: unknown;
  involvedSQLs: Record<string, string>;
  raw: unknown;
}

interface ResultTableData {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

interface BoardNodeItem {
  id: number;
  name: string;
  tertiary?: number;
  primary?: number;
  secondary?: number;
  workflowId?: number;
  sourceId?: number;
  position?: {
    x: number;
    y: number;
  };
}

interface BoardEdgeItem {
  id?: string;
  source: number | string;
  target: number | string;
}

interface BoardContent {
  boardNodeList: BoardNodeItem[];
  boardEdges: BoardEdgeItem[];
}

interface IntegrationEndpointDraft {
  type: number;
  datasource: number;
  cluster: string;
  database: string;
  table: string;
  sourceFilter?: string;
  targetBefore?: string;
  targetAfter?: string;
  targetBeforeList?: string[];
  targetAfterList?: string[];
}

interface IntegrationMappingItem {
  source: string;
  target: string;
  sourceType?: string;
  targetType?: string;
}

interface IntegrationDraft {
  source: IntegrationEndpointDraft;
  target: IntegrationEndpointDraft;
  mapping: IntegrationMappingItem[];
}

interface IntegrationOptionState {
  sourceDatabases: string[];
  sourceTables: string[];
  sourceColumns: AnalysisTableColumn[];
  targetDatabases: string[];
  targetTables: string[];
  targetColumns: AnalysisTableColumn[];
}

function flattenTree(root: AnalysisFolder | null): TreeNodeRow[] {
  if (!root) {
    return [];
  }
  const rows: TreeNodeRow[] = [];
  const pushFolder = (folder: AnalysisFolder, depth: number) => {
    if (folder.id !== 0) {
      rows.push({
        kind: "folder",
        id: folder.id,
        name: folder.name,
        desc: folder.desc,
        depth,
        parentId: folder.parentId
      });
    }
    (folder.nodes ?? []).forEach((node) => {
      if (node.secondary === ANALYSIS_SECONDARY_BOARD) {
        return;
      }
      rows.push({
        kind: "node",
        id: node.id,
        name: node.name,
        desc: node.desc,
        depth: folder.id === 0 ? depth : depth + 1,
        folderId: folder.id,
        node
      });
    });
    (folder.children ?? []).forEach((child) => pushFolder(child, folder.id === 0 ? depth : depth + 1));
  };
  (root.nodes ?? []).forEach((node) => {
    if (node.secondary === ANALYSIS_SECONDARY_BOARD) {
      return;
    }
    rows.push({
      kind: "node",
      id: node.id,
      name: node.name,
      desc: node.desc,
      depth: 0,
      folderId: 0,
      node
    });
  });
  (root.children ?? []).forEach((child) => pushFolder(child, 0));
  return rows;
}

function collectFolders(root: AnalysisFolder | null): Array<{ id: number; name: string; depth: number }> {
  const folders = [{ id: 0, name: "根目录", depth: 0 }];
  const walk = (folder: AnalysisFolder, depth: number) => {
    if (folder.id !== 0) {
      folders.push({ id: folder.id, name: folder.name, depth });
    }
    (folder.children ?? []).forEach((child) => walk(child, depth + 1));
  };
  (root?.children ?? []).forEach((child) => walk(child, 0));
  return folders;
}

function formatUnixTime(value: number | undefined) {
  if (!value) {
    return "-";
  }
  return new Date(value * 1000).toLocaleString();
}

function nodeStatusLabel(status: number | undefined) {
  switch (status) {
    case 2:
      return "运行中";
    case 3:
      return "异常";
    case 4:
      return "完成";
    default:
      return "空闲";
  }
}

function resultStatusLabel(status: number) {
  switch (status) {
    case 1:
      return "成功";
    case 2:
      return "失败";
    default:
      return "未知";
  }
}

function workerStatusLabel(status: number | undefined) {
  switch (status) {
    case 1:
      return "成功";
    case 2:
      return "失败";
    default:
      return "未知";
  }
}

function workerStatusClass(status: number | undefined) {
  switch (status) {
    case 1:
      return "cv-settings-status--ok";
    case 2:
      return "cv-settings-status--error";
    default:
      return "cv-settings-status--muted";
  }
}

function tertiaryLabel(tertiary: number | undefined) {
  switch (tertiary) {
    case ANALYSIS_TERTIARY_CLICKHOUSE:
      return "ClickHouse";
    case ANALYSIS_TERTIARY_MYSQL:
      return "MySQL";
    case ANALYSIS_TERTIARY_OFFLINE_SYNC:
      return "OfflineSync";
    default:
      return tertiary ? `类型 ${tertiary}` : "全部类型";
  }
}

function formatDuration(cost: number | undefined) {
  if (!cost) {
    return "unknown";
  }
  if (cost < 1000) {
    return `${cost}ms`;
  }
  const seconds = cost / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function getDefaultWorkerFilters(): WorkerFilters {
  const now = Math.floor(Date.now() / 1000);
  return {
    start: now - 24 * 60 * 60,
    end: now,
    isInCharge: 0,
    nodeName: "",
    tertiary: 0,
    status: -1,
    current: 1,
    pageSize: 20
  };
}

function datetimeLocalFromUnix(value: number) {
  if (!value) {
    return "";
  }
  const date = new Date(value * 1000);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function unixFromDatetimeLocal(value: string) {
  if (!value) {
    return 0;
  }
  return Math.floor(new Date(value).getTime() / 1000);
}

function flowTotal(flow: AnalysisWorkerFlow) {
  return flow.unknown + flow.failed + flow.success;
}

function formatBytes(bytes: number | undefined) {
  const value = Number(bytes || 0);
  if (value < 1024) {
    return `${value} B`;
  }
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let next = value / 1024;
  let unitIndex = 0;
  while (next >= 1024 && unitIndex < units.length - 1) {
    next /= 1024;
    unitIndex += 1;
  }
  return `${next.toFixed(next >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function formatLargeNumber(value: number | undefined) {
  const numberValue = Number(value || 0);
  if (numberValue >= 100000000) {
    return `${(numberValue / 100000000).toFixed(2)}亿`;
  }
  if (numberValue >= 10000) {
    return `${(numberValue / 10000).toFixed(2)}万`;
  }
  return String(numberValue);
}

function safePreview(value: string | undefined) {
  if (!value) {
    return "暂无内容";
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function buildEmptyDraft(folderId = 0): NodeDraft {
  return {
    name: "",
    desc: "",
    content: "",
    folderId,
    secondary: ANALYSIS_SECONDARY_DATA_MINING,
    tertiary: ANALYSIS_TERTIARY_CLICKHOUSE
  };
}

function buildEmptyDataSourceDraft(): DataSourceDraft {
  return {
    name: "",
    desc: "",
    url: "",
    username: "",
    password: "",
    typ: ANALYSIS_SOURCE_TYPE_MYSQL
  };
}

function buildEmptyWorkflowDraft(): WorkflowDraft {
  return {
    name: "",
    desc: ""
  };
}

function buildEmptyCrontabDraft(): CrontabDraft {
  return {
    enabled: true,
    dutyUid: 0,
    cron: "",
    desc: "",
    channelIdsText: "",
    args: [{ key: "", val: "" }],
    isRetry: false,
    retryInterval: 3,
    retryTimes: 2
  };
}

function parseCrontabArgs(value: string | undefined): AnalysisCrontabArg[] {
  if (!value) {
    return [{ key: "", val: "" }];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        key: String(item?.key ?? ""),
        val: String(item?.val ?? "")
      }));
    }
  } catch {
    return [{ key: "", val: "" }];
  }
  return [{ key: "", val: "" }];
}

function parseChannelIds(value: number[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  if (!value) {
    return "";
  }
  return String(value)
    .replace(/^\[|\]$/g, "")
    .trim();
}

function channelIdsFromText(value: string) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function parseResultDetail(result: AnalysisNodeResult | null): ParsedResultDetail {
  const rawText = result?.result || "";
  let parsed: unknown = rawText;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = rawText;
  }
  const record = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  const involvedSQLs = record.involvedSQLs && typeof record.involvedSQLs === "object" && !Array.isArray(record.involvedSQLs)
    ? Object.fromEntries(Object.entries(record.involvedSQLs as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")]))
    : {};
  return {
    message: typeof record.message === "string" ? record.message : "",
    logs: record.logs ?? null,
    involvedSQLs,
    raw: parsed
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeResultRows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => isRecord(item) ? [item] : [{ value: item }]);
  }
  if (isRecord(value)) {
    const candidateKeys = ["rows", "data", "list", "result", "results", "records"];
    for (const key of candidateKeys) {
      const nested = value[key];
      if (Array.isArray(nested)) {
        return normalizeResultRows(nested);
      }
    }
    return [value];
  }
  if (typeof value === "string") {
    try {
      return normalizeResultRows(JSON.parse(value));
    } catch {
      return value ? [{ value }] : [];
    }
  }
  return value === null || value === undefined ? [] : [{ value }];
}

function buildResultTableData(detail: ParsedResultDetail): ResultTableData {
  const rows = normalizeResultRows(detail.logs ?? detail.raw);
  const columns = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>())
  );
  return { columns, rows };
}

function formatTableCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function parseBoardContent(content: string | undefined): BoardContent {
  if (!content) {
    return { boardNodeList: [], boardEdges: [] };
  }
  try {
    const parsed = JSON.parse(content) as Partial<BoardContent>;
    return {
      boardNodeList: Array.isArray(parsed.boardNodeList) ? parsed.boardNodeList : [],
      boardEdges: Array.isArray(parsed.boardEdges) ? parsed.boardEdges : []
    };
  } catch {
    return { boardNodeList: [], boardEdges: [] };
  }
}

function boardNodeTypeLabel(tertiary: number | undefined) {
  switch (tertiary) {
    case ANALYSIS_TERTIARY_START:
      return "Start";
    case ANALYSIS_TERTIARY_END:
      return "End";
    case ANALYSIS_TERTIARY_CLICKHOUSE:
      return "ClickHouse";
    case ANALYSIS_TERTIARY_MYSQL:
      return "MySQL";
    case ANALYSIS_TERTIARY_OFFLINE_SYNC:
      return "OfflineSync";
    default:
      return tertiary ? `类型 ${tertiary}` : "节点";
  }
}

function ensureBoardSpecialNode(tertiary: number): BoardNodeItem {
  return {
    id: tertiary,
    name: tertiary === ANALYSIS_TERTIARY_START ? "Start" : "End",
    tertiary,
    position: {
      x: tertiary === ANALYSIS_TERTIARY_START ? 0 : 520,
      y: tertiary === ANALYSIS_TERTIARY_START ? 0 : 260
    }
  };
}

function buildEmptyIntegrationEndpoint(type = ANALYSIS_SOURCE_TYPE_MYSQL): IntegrationEndpointDraft {
  return {
    type,
    datasource: 0,
    cluster: "",
    database: "",
    table: ""
  };
}

function buildEmptyIntegrationDraft(node?: AnalysisNode | null): IntegrationDraft {
  const isOfflineSync = node?.tertiary === ANALYSIS_TERTIARY_OFFLINE_SYNC;
  return {
    source: buildEmptyIntegrationEndpoint(isOfflineSync ? ANALYSIS_SOURCE_TYPE_MYSQL : ANALYSIS_SOURCE_TYPE_CLICKHOUSE),
    target: buildEmptyIntegrationEndpoint(isOfflineSync ? ANALYSIS_SOURCE_TYPE_CLICKHOUSE : ANALYSIS_SOURCE_TYPE_MYSQL),
    mapping: []
  };
}

function endpointTypeToTyp(type: number) {
  return type === ANALYSIS_SOURCE_TYPE_CLICKHOUSE ? "clickhouse" : "mysql";
}

function endpointTypToType(typ: string | undefined) {
  return typ === "clickhouse" ? ANALYSIS_SOURCE_TYPE_CLICKHOUSE : ANALYSIS_SOURCE_TYPE_MYSQL;
}

function parseIntegrationContent(content: string | undefined, node?: AnalysisNode | null): IntegrationDraft {
  if (!content) {
    return buildEmptyIntegrationDraft(node);
  }
  try {
    const parsed = JSON.parse(content) as Record<string, any>;
    return {
      source: {
        type: endpointTypToType(parsed.source?.typ),
        datasource: Number(parsed.source?.sourceId || 0),
        cluster: String(parsed.source?.cluster || ""),
        database: String(parsed.source?.database || ""),
        table: String(parsed.source?.table || ""),
        sourceFilter: String(parsed.source?.sourceFilter || "")
      },
      target: {
        type: endpointTypToType(parsed.target?.typ),
        datasource: Number(parsed.target?.sourceId || 0),
        cluster: String(parsed.target?.cluster || ""),
        database: String(parsed.target?.database || ""),
        table: String(parsed.target?.table || ""),
        targetBefore: String(parsed.target?.targetBefore || ""),
        targetAfter: String(parsed.target?.targetAfter || ""),
        targetBeforeList: Array.isArray(parsed.target?.targetBeforeList) ? parsed.target.targetBeforeList : [],
        targetAfterList: Array.isArray(parsed.target?.targetAfterList) ? parsed.target.targetAfterList : []
      },
      mapping: Array.isArray(parsed.mapping) ? parsed.mapping : []
    };
  } catch {
    return buildEmptyIntegrationDraft(node);
  }
}

function integrationPayloadFromDraft(draft: IntegrationDraft) {
  return {
    source: {
      typ: endpointTypeToTyp(draft.source.type),
      sourceId: draft.source.datasource || undefined,
      cluster: draft.source.cluster,
      database: draft.source.database,
      table: draft.source.table,
      sourceFilter: draft.source.sourceFilter || ""
    },
    target: {
      typ: endpointTypeToTyp(draft.target.type),
      sourceId: draft.target.datasource || undefined,
      cluster: draft.target.cluster,
      database: draft.target.database,
      table: draft.target.table,
      targetBefore: draft.target.targetBefore || "",
      targetAfter: draft.target.targetAfter || "",
      targetBeforeList: draft.target.targetBeforeList || [],
      targetAfterList: draft.target.targetAfterList || []
    },
    mapping: draft.mapping
  };
}

function sourceTypeLabel(typ: number) {
  if (typ === ANALYSIS_SOURCE_TYPE_MYSQL) {
    return "MySQL";
  }
  return `类型 ${typ}`;
}

function nodeScopeForMode(mode: AnalysisMode) {
  if (mode === "temporary") {
    return {
      primary: ANALYSIS_PRIMARY_SHORT,
      secondary: ANALYSIS_SECONDARY_DATABASE,
      title: "临时查询",
      emptyText: "暂无临时查询节点，点击右上角新建节点。"
    };
  }
  return {
    primary: ANALYSIS_PRIMARY_MINING,
    secondary: ANALYSIS_SECONDARY_DATA_MINING,
    title: "数据开发",
    emptyText: "暂无节点，点击右上角新建节点。"
  };
}

function analysisModeTitle(mode: AnalysisMode) {
  switch (mode) {
    case "temporary":
      return "临时查询";
    case "datasource":
      return "数据源管理";
    case "realtime":
      return "实时业务流";
    case "dashboard":
      return "统计看板";
    case "executions":
      return "执行明细";
    default:
      return "数据开发";
  }
}

function modeFromNavKey(navKey: string | null): AnalysisMode {
  switch (navKey) {
    case "short":
      return "temporary";
    case "datasourceManage":
      return "datasource";
    case "realtime":
      return "realtime";
    case "statisticalBoard":
      return "dashboard";
    case "TaskExecutionDetails":
      return "executions";
    case "offline":
    default:
      return "offline";
  }
}

function navKeyFromMode(mode: AnalysisMode) {
  switch (mode) {
    case "temporary":
      return "short";
    case "datasource":
      return "datasourceManage";
    case "realtime":
      return "realtime";
    case "dashboard":
      return "statisticalBoard";
    case "executions":
      return "TaskExecutionDetails";
    default:
      return "offline";
  }
}

function numberParam(name: string) {
  const params = new URLSearchParams(window.location.search);
  const value = Number(params.get(name));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export default function AnalysisWorkbenchPage() {
  const [mode, setMode] = useState<AnalysisMode>(() => modeFromNavKey(new URLSearchParams(window.location.search).get("navKey")));
  const [instances, setInstances] = useState<AnalysisInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
  const [tree, setTree] = useState<AnalysisFolder | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [nodeDetail, setNodeDetail] = useState<AnalysisNodeDetail | null>(null);
  const [draft, setDraft] = useState<NodeDraft>(buildEmptyDraft());
  const [histories, setHistories] = useState<AnalysisNodeHistory[]>([]);
  const [results, setResults] = useState<AnalysisNodeResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AnalysisNodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [nodeLoading, setNodeLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<TreeNodeRow | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");
  const [dataSources, setDataSources] = useState<AnalysisDataSource[]>([]);
  const [dataSourceLoading, setDataSourceLoading] = useState(false);
  const [dataSourceTypeFilter, setDataSourceTypeFilter] = useState<number>(0);
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<AnalysisDataSource | null>(null);
  const [dataSourceDraft, setDataSourceDraft] = useState<DataSourceDraft>(buildEmptyDataSourceDraft());
  const [workerDashboard, setWorkerDashboard] = useState<AnalysisWorkerDashboard | null>(null);
  const [workerDashboardLoading, setWorkerDashboardLoading] = useState(false);
  const [workers, setWorkers] = useState<AnalysisWorkerRow[]>([]);
  const [workersTotal, setWorkersTotal] = useState(0);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workerFilters, setWorkerFilters] = useState<WorkerFilters>(() => getDefaultWorkerFilters());
  const [realtimeDatabases, setRealtimeDatabases] = useState<string[]>([]);
  const [realtimeTables, setRealtimeTables] = useState<string[]>([]);
  const [selectedRealtimeDatabase, setSelectedRealtimeDatabase] = useState("");
  const [selectedRealtimeTable, setSelectedRealtimeTable] = useState("");
  const [realtimeDependencies, setRealtimeDependencies] = useState<AnalysisRealtimeTableDependency[]>([]);
  const [realtimeUpdatedAt, setRealtimeUpdatedAt] = useState<number | undefined>();
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [realtimeSqlLoading, setRealtimeSqlLoading] = useState(false);
  const [realtimeSqlModalOpen, setRealtimeSqlModalOpen] = useState(false);
  const [realtimeSqlTitle, setRealtimeSqlTitle] = useState("");
  const [realtimeCreateSql, setRealtimeCreateSql] = useState("");
  const [analysisUsers, setAnalysisUsers] = useState<AnalysisUser[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleExists, setScheduleExists] = useState(false);
  const [crontabDraft, setCrontabDraft] = useState<CrontabDraft>(() => buildEmptyCrontabDraft());
  const [resultDetailOpen, setResultDetailOpen] = useState(false);
  const [resultDetailLoading, setResultDetailLoading] = useState(false);
  const [resultDetail, setResultDetail] = useState<AnalysisNodeResult | null>(null);
  const [resultDetailTab, setResultDetailTab] = useState<"table" | "logs" | "sqls" | "raw">("table");
  const [selectedSqlKey, setSelectedSqlKey] = useState("");
  const [workflows, setWorkflows] = useState<AnalysisWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number>(0);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<AnalysisWorkflow | null>(null);
  const [workflowDraft, setWorkflowDraft] = useState<WorkflowDraft>(() => buildEmptyWorkflowDraft());
  const [boardNode, setBoardNode] = useState<AnalysisNode | null>(null);
  const [boardDetail, setBoardDetail] = useState<AnalysisNodeDetail | null>(null);
  const [boardNodes, setBoardNodes] = useState<BoardNodeItem[]>([]);
  const [boardEdges, setBoardEdges] = useState<BoardEdgeItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardDirty, setBoardDirty] = useState(false);
  const [boardSourceId, setBoardSourceId] = useState("");
  const [boardTargetId, setBoardTargetId] = useState("");
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationDraft, setIntegrationDraft] = useState<IntegrationDraft>(() => buildEmptyIntegrationDraft());
  const [integrationOptions, setIntegrationOptions] = useState<IntegrationOptionState>({
    sourceDatabases: [],
    sourceTables: [],
    sourceColumns: [],
    targetDatabases: [],
    targetTables: [],
    targetColumns: []
  });
  const [structuralSql, setStructuralSql] = useState("");

  const treeRows = useMemo(() => flattenTree(tree), [tree]);
  const folderOptions = useMemo(() => collectFolders(tree), [tree]);
  const selectedInstance = instances.find((item) => item.id === selectedInstanceId) ?? null;
  const selectedNode = treeRows.find((row) => row.kind === "node" && row.id === selectedNodeId)?.node ?? null;
  const isNodeWorkbenchMode = mode === "offline" || mode === "temporary";
  const activeNodeScope = useMemo(() => nodeScopeForMode(mode), [mode]);
  const activeModeTitle = analysisModeTitle(mode);
  const systemClickHouseInstances = instances.filter((instance) => instance.datasource === "ch");
  const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null;
  const workflowNodes = treeRows
    .filter((row) => row.kind === "node")
    .map((row) => row.node)
    .filter((node): node is AnalysisNode => Boolean(node))
    .filter((node) => node.secondary !== ANALYSIS_SECONDARY_BOARD);
  const boardNodeIds = new Set(boardNodes.map((node) => String(node.id)));
  const availableBoardNodes = workflowNodes.filter((node) => !boardNodeIds.has(String(node.id)));
  const boardNodeNameMap = new Map(boardNodes.map((node) => [String(node.id), node.name]));

  function handleModeChange(nextMode: AnalysisMode) {
    setMode(nextMode);
    const url = new URL(window.location.href);
    url.searchParams.set("navKey", navKeyFromMode(nextMode));
    if (nextMode !== "offline" && nextMode !== "temporary") {
      url.searchParams.delete("nodeId");
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function loadInstances() {
    setLoading(true);
    setError("");
    try {
      const nextInstances = await listAnalysisInstances();
      setInstances(nextInstances);
      const urlInstanceId = numberParam("iid");
      setSelectedInstanceId((current) => {
        if (current) {
          return current;
        }
        if (urlInstanceId && nextInstances.some((instance) => instance.id === urlInstanceId)) {
          return urlInstanceId;
        }
        return nextInstances[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "数据分析实例加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadTree(instanceId: number, scope = activeNodeScope, workflowId = selectedWorkflowId) {
    setLoading(true);
    setError("");
    try {
      const nextTree = await getAnalysisNodeTree({
        iid: instanceId,
        primary: scope.primary,
        secondary: mode === "offline" ? undefined : scope.secondary,
        workflowId: scope.primary === ANALYSIS_PRIMARY_MINING && workflowId ? workflowId : undefined
      });
      setTree(nextTree);
      setSelectedNodeId((current) => {
        const urlNodeId = numberParam("nodeId");
        if (urlNodeId && flattenTree(nextTree).some((row) => row.kind === "node" && row.id === urlNodeId)) {
          return urlNodeId;
        }
        if (current && flattenTree(nextTree).some((row) => row.kind === "node" && row.id === current)) {
          return current;
        }
        return nextTree.nodes?.[0]?.id ?? nextTree.children?.[0]?.nodes?.[0]?.id ?? null;
      });
    } catch (treeError) {
      setError(treeError instanceof Error ? treeError.message : "节点树加载失败");
      setTree(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkflows(instanceId: number) {
    setWorkflowLoading(true);
    setError("");
    try {
      const nextWorkflows = await listAnalysisWorkflows({ iid: instanceId });
      setWorkflows(nextWorkflows);
      setSelectedWorkflowId((current) => {
        if (current && nextWorkflows.some((workflow) => workflow.id === current)) {
          return current;
        }
        const urlNodeId = numberParam("nodeId");
        const workflowByUrl = urlNodeId ? nextWorkflows.find((workflow) => workflow.id === urlNodeId) : null;
        return workflowByUrl?.id ?? nextWorkflows[0]?.id ?? 0;
      });
    } catch (workflowError) {
      setError(workflowError instanceof Error ? workflowError.message : "工作流加载失败");
      setWorkflows([]);
      setSelectedWorkflowId(0);
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function loadWorkflowBoard(instanceId: number, workflow: AnalysisWorkflow) {
    setBoardLoading(true);
    setError("");
    try {
      const boardTree = await getAnalysisNodeTree({
        iid: instanceId,
        primary: ANALYSIS_PRIMARY_MINING,
        secondary: ANALYSIS_SECONDARY_BOARD,
        workflowId: workflow.id
      });
      let currentBoardNode = boardTree.nodes?.[0] ?? null;
      if (!currentBoardNode) {
        currentBoardNode = await createAnalysisNode({
          iid: instanceId,
          primary: ANALYSIS_PRIMARY_MINING,
          secondary: ANALYSIS_SECONDARY_BOARD,
          name: workflow.name,
          desc: workflow.desc || "",
          workflowId: workflow.id
        });
      }
      setBoardNode(currentBoardNode);
      const detail = await getAnalysisNode(currentBoardNode.id);
      setBoardDetail(detail);
      const content = parseBoardContent(detail.content);
      setBoardNodes(content.boardNodeList);
      setBoardEdges(content.boardEdges);
      setBoardDirty(false);
    } catch (boardError) {
      setError(boardError instanceof Error ? boardError.message : "工作流画布加载失败");
      setBoardNode(null);
      setBoardDetail(null);
      setBoardNodes([]);
      setBoardEdges([]);
    } finally {
      setBoardLoading(false);
    }
  }

  async function loadDataSources(instanceId: number, typ = dataSourceTypeFilter) {
    setDataSourceLoading(true);
    setError("");
    try {
      const nextSources = await listAnalysisDataSources({
        iid: instanceId,
        typ: typ || undefined
      });
      setDataSources(nextSources);
    } catch (sourceError) {
      setError(sourceError instanceof Error ? sourceError.message : "数据源加载失败");
      setDataSources([]);
    } finally {
      setDataSourceLoading(false);
    }
  }

  async function loadWorkerDashboard(instanceId: number, filters = workerFilters) {
    setWorkerDashboardLoading(true);
    setError("");
    try {
      const dashboard = await getAnalysisWorkerDashboard({
        iid: instanceId,
        start: filters.start || undefined,
        end: filters.end || undefined,
        isInCharge: filters.isInCharge || undefined
      });
      setWorkerDashboard({
        ...dashboard,
        flows: Array.isArray(dashboard.flows) ? dashboard.flows : []
      });
    } catch (dashboardError) {
      setError(dashboardError instanceof Error ? dashboardError.message : "统计看板加载失败");
      setWorkerDashboard(null);
    } finally {
      setWorkerDashboardLoading(false);
    }
  }

  async function loadWorkers(instanceId: number, filters = workerFilters) {
    setWorkersLoading(true);
    setError("");
    try {
      const list = await listAnalysisWorkers({
        iid: instanceId,
        current: filters.current,
        pageSize: filters.pageSize,
        start: filters.start || undefined,
        end: filters.end || undefined,
        nodeName: filters.nodeName.trim() || undefined,
        tertiary: filters.tertiary || undefined,
        status: filters.status >= 0 ? filters.status : undefined
      });
      setWorkers(Array.isArray(list.list) ? list.list : []);
      setWorkersTotal(list.total || 0);
    } catch (workerError) {
      setError(workerError instanceof Error ? workerError.message : "执行明细加载失败");
      setWorkers([]);
      setWorkersTotal(0);
    } finally {
      setWorkersLoading(false);
    }
  }

  async function loadRealtimeDatabases(instanceId: number) {
    setRealtimeLoading(true);
    setError("");
    try {
      const databases = await listAnalysisDatabases(instanceId);
      setRealtimeDatabases(databases);
      const params = new URLSearchParams(window.location.search);
      const urlDatabase = params.get("dName") || "";
      const urlTable = params.get("tName") || "";
      const nextDatabase = urlDatabase && databases.includes(urlDatabase) ? urlDatabase : databases[0] || "";
      setSelectedRealtimeDatabase(nextDatabase);
      if (nextDatabase) {
        await loadRealtimeTables(instanceId, nextDatabase, urlTable);
      } else {
        setRealtimeTables([]);
        setSelectedRealtimeTable("");
      }
    } catch (databaseError) {
      setError(databaseError instanceof Error ? databaseError.message : "实时业务流数据库加载失败");
      setRealtimeDatabases([]);
      setRealtimeTables([]);
    } finally {
      setRealtimeLoading(false);
    }
  }

  async function loadRealtimeTables(instanceId: number, database: string, preferredTable = "") {
    setRealtimeLoading(true);
    setError("");
    try {
      const tables = await listAnalysisTables(instanceId, database);
      setRealtimeTables(tables);
      const nextTable = preferredTable && tables.includes(preferredTable) ? preferredTable : tables[0] || "";
      setSelectedRealtimeTable(nextTable);
    } catch (tableError) {
      setError(tableError instanceof Error ? tableError.message : "实时业务流表加载失败");
      setRealtimeTables([]);
      setSelectedRealtimeTable("");
    } finally {
      setRealtimeLoading(false);
    }
  }

  function syncRealtimeUrl(database: string, table: string) {
    const url = new URL(window.location.href);
    if (database) {
      url.searchParams.set("dName", database);
    } else {
      url.searchParams.delete("dName");
    }
    if (table) {
      url.searchParams.set("tName", table);
    } else {
      url.searchParams.delete("tName");
    }
    if (selectedInstanceId) {
      url.searchParams.set("iid", String(selectedInstanceId));
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function handleRealtimeDatabaseChange(database: string) {
    setSelectedRealtimeDatabase(database);
    setSelectedRealtimeTable("");
    setRealtimeDependencies([]);
    setRealtimeUpdatedAt(undefined);
    syncRealtimeUrl(database, "");
    if (selectedInstanceId && database) {
      await loadRealtimeTables(selectedInstanceId, database);
    }
  }

  function handleRealtimeTableChange(table: string) {
    setSelectedRealtimeTable(table);
    setRealtimeDependencies([]);
    setRealtimeUpdatedAt(undefined);
    syncRealtimeUrl(selectedRealtimeDatabase, table);
  }

  async function handleRealtimeSearch() {
    if (!selectedInstanceId || !selectedRealtimeDatabase || !selectedRealtimeTable) {
      setError("请选择数据库和数据表");
      return;
    }
    setRealtimeLoading(true);
    setError("");
    try {
      syncRealtimeUrl(selectedRealtimeDatabase, selectedRealtimeTable);
      const result = await getAnalysisTableDependencies(selectedInstanceId, {
        databaseName: selectedRealtimeDatabase,
        tableName: selectedRealtimeTable
      });
      setRealtimeDependencies(result.data);
      setRealtimeUpdatedAt(result.utime);
    } catch (dependencyError) {
      setError(dependencyError instanceof Error ? dependencyError.message : "实时业务流查询失败");
      setRealtimeDependencies([]);
      setRealtimeUpdatedAt(undefined);
    } finally {
      setRealtimeLoading(false);
    }
  }

  async function handleOpenCreateSql(node: AnalysisRealtimeTableDependency) {
    if (!selectedInstanceId) {
      return;
    }
    setRealtimeSqlLoading(true);
    setError("");
    try {
      const sql = await getAnalysisTableCreateSql(selectedInstanceId, node.database, node.table);
      setRealtimeSqlTitle(`${node.database}.${node.table}`);
      setRealtimeCreateSql(sql || "");
      setRealtimeSqlModalOpen(true);
    } catch (sqlError) {
      setError(sqlError instanceof Error ? sqlError.message : "建表 SQL 加载失败");
    } finally {
      setRealtimeSqlLoading(false);
    }
  }

  async function loadNode(nodeId: number) {
    setNodeLoading(true);
    setError("");
    try {
      const [detail, resultList, historyList] = await Promise.all([
        getAnalysisNode(nodeId),
        listAnalysisNodeResults(nodeId, { current: 1, pageSize: 20, isExcludeCrontabResult: 0 }),
        listAnalysisNodeHistories(nodeId, { current: 1, pageSize: 20, isExcludeCrontabResult: 0 })
      ]);
      const treeNode = treeRows.find((row) => row.id === nodeId)?.node;
      setNodeDetail(detail);
      setDraft({
        name: detail.name,
        desc: detail.desc,
        content: detail.content || "",
        folderId: treeNode?.folderId ?? 0,
        secondary: treeNode?.secondary || ANALYSIS_SECONDARY_DATA_MINING,
        tertiary: treeNode?.tertiary || ANALYSIS_TERTIARY_CLICKHOUSE
      });
      setResults(resultList?.list ?? []);
      setHistories(historyList?.list ?? []);
      setSelectedResult(resultList?.list?.[0] ?? null);
    } catch (nodeError) {
      setError(nodeError instanceof Error ? nodeError.message : "节点详情加载失败");
      setNodeDetail(null);
    } finally {
      setNodeLoading(false);
    }
  }

  async function loadUsersIfNeeded() {
    if (analysisUsers.length > 0) {
      return analysisUsers;
    }
    const users = await listAnalysisUsers();
    setAnalysisUsers(users);
    return users;
  }

  async function openScheduleModal() {
    if (!selectedNodeId) {
      return;
    }
    setScheduleModalOpen(true);
    setScheduleLoading(true);
    setError("");
    try {
      const [users, crontab] = await Promise.all([
        loadUsersIfNeeded(),
        getAnalysisCrontab(selectedNodeId)
      ]);
      if (crontab?.nodeId) {
        setScheduleExists(true);
        setCrontabDraft({
          enabled: crontab.typ === 0,
          dutyUid: crontab.dutyUid || users[0]?.id || 0,
          cron: crontab.cron || "",
          desc: crontab.desc || "",
          channelIdsText: parseChannelIds(crontab.channelIds),
          args: parseCrontabArgs(crontab.args),
          isRetry: Boolean(crontab.isRetry),
          retryInterval: crontab.retryInterval || 3,
          retryTimes: crontab.retryTimes || 2
        });
      } else {
        setScheduleExists(false);
        setCrontabDraft({
          ...buildEmptyCrontabDraft(),
          dutyUid: users[0]?.id || 0
        });
      }
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "调度配置加载失败");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function handleSaveCrontab() {
    if (!selectedNodeId) {
      return;
    }
    if (!crontabDraft.dutyUid || !crontabDraft.cron.trim()) {
      setError("负责人和 cron 不能为空");
      return;
    }
    const payload: AnalysisCrontabPayload = {
      desc: crontabDraft.desc.trim(),
      dutyUid: crontabDraft.dutyUid,
      cron: crontabDraft.cron.trim(),
      typ: crontabDraft.enabled ? 0 : 1,
      args: crontabDraft.args.filter((arg) => arg.key.trim() || arg.val.trim()),
      isRetry: crontabDraft.isRetry ? 1 : 0,
      retryInterval: crontabDraft.isRetry ? crontabDraft.retryInterval : undefined,
      retryTimes: crontabDraft.isRetry ? crontabDraft.retryTimes : undefined,
      channelIds: channelIdsFromText(crontabDraft.channelIdsText)
    };
    setScheduleLoading(true);
    setError("");
    try {
      if (scheduleExists) {
        await updateAnalysisCrontab(selectedNodeId, payload);
      } else {
        await createAnalysisCrontab(selectedNodeId, payload);
      }
      setScheduleExists(true);
      setMessage("调度配置已保存");
      setScheduleModalOpen(false);
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "调度配置保存失败");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function handleDeleteCrontab() {
    if (!selectedNodeId || !scheduleExists) {
      return;
    }
    if (!window.confirm("确认删除当前节点的调度配置吗？")) {
      return;
    }
    setScheduleLoading(true);
    setError("");
    try {
      await deleteAnalysisCrontab(selectedNodeId);
      setScheduleExists(false);
      setCrontabDraft(buildEmptyCrontabDraft());
      setMessage("调度配置已删除");
      setScheduleModalOpen(false);
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "调度配置删除失败");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function openResultDetail(result: AnalysisNodeResult) {
    if (!selectedNodeId) {
      return;
    }
    setResultDetailOpen(true);
    setResultDetailLoading(true);
    setResultDetail(result);
    setResultDetailTab("table");
    setSelectedSqlKey("");
    setError("");
    try {
      const detail = await getAnalysisNodeResult(selectedNodeId, result.id);
      setResultDetail(detail);
      const parsed = parseResultDetail(detail);
      setSelectedSqlKey(Object.keys(parsed.involvedSQLs)[0] || "");
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "结果详情加载失败");
    } finally {
      setResultDetailLoading(false);
    }
  }

  function endpointSourceFor(type: number): "instances" | "sources" {
    return type === ANALYSIS_SOURCE_TYPE_CLICKHOUSE ? "instances" : "sources";
  }

  function endpointIdFor(endpoint: IntegrationEndpointDraft) {
    if (endpoint.type === ANALYSIS_SOURCE_TYPE_CLICKHOUSE) {
      return selectedInstanceId || 0;
    }
    return endpoint.datasource || 0;
  }

  async function loadIntegrationDatabases(side: "source" | "target", endpoint: IntegrationEndpointDraft) {
    const id = endpointIdFor(endpoint);
    if (!id) {
      return;
    }
    setIntegrationLoading(true);
    setError("");
    try {
      const databases = await listAnalysisSourceDatabases(id, endpointSourceFor(endpoint.type));
      setIntegrationOptions((current) => ({
        ...current,
        [side === "source" ? "sourceDatabases" : "targetDatabases"]: databases,
        [side === "source" ? "sourceTables" : "targetTables"]: [],
        [side === "source" ? "sourceColumns" : "targetColumns"]: []
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载数据库失败");
    } finally {
      setIntegrationLoading(false);
    }
  }

  async function loadIntegrationTables(side: "source" | "target", endpoint: IntegrationEndpointDraft) {
    const id = endpointIdFor(endpoint);
    if (!id || !endpoint.database) {
      return;
    }
    setIntegrationLoading(true);
    setError("");
    try {
      const tables = await listAnalysisSourceTables(id, endpointSourceFor(endpoint.type), endpoint.database);
      setIntegrationOptions((current) => ({
        ...current,
        [side === "source" ? "sourceTables" : "targetTables"]: tables,
        [side === "source" ? "sourceColumns" : "targetColumns"]: []
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载数据表失败");
    } finally {
      setIntegrationLoading(false);
    }
  }

  async function loadIntegrationColumns(side: "source" | "target", endpoint: IntegrationEndpointDraft) {
    const id = endpointIdFor(endpoint);
    if (!id || !endpoint.database || !endpoint.table) {
      return;
    }
    setIntegrationLoading(true);
    setError("");
    try {
      const columns = await listAnalysisSourceColumns(id, endpointSourceFor(endpoint.type), {
        database: endpoint.database,
        table: endpoint.table
      });
      setIntegrationOptions((current) => ({
        ...current,
        [side === "source" ? "sourceColumns" : "targetColumns"]: columns
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载字段失败");
    } finally {
      setIntegrationLoading(false);
    }
  }

  async function openIntegrationModal() {
    if (!selectedNode || !nodeDetail) {
      return;
    }
    const nextDraft = parseIntegrationContent(nodeDetail.content, selectedNode);
    setIntegrationDraft(nextDraft);
    setStructuralSql("");
    setIntegrationOptions({
      sourceDatabases: [],
      sourceTables: [],
      sourceColumns: [],
      targetDatabases: [],
      targetTables: [],
      targetColumns: []
    });
    setIntegrationModalOpen(true);
    if (selectedInstanceId) {
      await loadDataSources(selectedInstanceId, ANALYSIS_SOURCE_TYPE_MYSQL);
    }
    await Promise.all([
      loadIntegrationDatabases("source", nextDraft.source),
      loadIntegrationDatabases("target", nextDraft.target)
    ]);
    await Promise.all([
      nextDraft.source.database ? loadIntegrationTables("source", nextDraft.source) : Promise.resolve(),
      nextDraft.target.database ? loadIntegrationTables("target", nextDraft.target) : Promise.resolve()
    ]);
    await Promise.all([
      nextDraft.source.table ? loadIntegrationColumns("source", nextDraft.source) : Promise.resolve(),
      nextDraft.target.table ? loadIntegrationColumns("target", nextDraft.target) : Promise.resolve()
    ]);
  }

  function handleAutoMapByName() {
    const mappings = integrationOptions.targetColumns.flatMap((targetColumn) => {
      const sourceColumn = integrationOptions.sourceColumns.find((item) => item.field === targetColumn.field);
      if (!sourceColumn) {
        return [];
      }
      return [{
        source: sourceColumn.field,
        target: targetColumn.field,
        sourceType: sourceColumn.type,
        targetType: targetColumn.type
      }];
    });
    setIntegrationDraft((current) => ({ ...current, mapping: mappings }));
  }

  function handleAutoMapByOrder() {
    const length = Math.min(integrationOptions.sourceColumns.length, integrationOptions.targetColumns.length);
    const mappings = Array.from({ length }).map((_, index) => ({
      source: integrationOptions.sourceColumns[index].field,
      target: integrationOptions.targetColumns[index].field,
      sourceType: integrationOptions.sourceColumns[index].type,
      targetType: integrationOptions.targetColumns[index].type
    }));
    setIntegrationDraft((current) => ({ ...current, mapping: mappings }));
  }

  async function handleGenerateTargetDDL() {
    if (integrationOptions.sourceColumns.length === 0) {
      setError("请先加载来源字段");
      return;
    }
    setIntegrationLoading(true);
    setError("");
    try {
      const sql = await structuralTransferAnalysis({
        source: "mysql",
        target: "clickhouse",
        columns: integrationOptions.sourceColumns
      });
      setStructuralSql(sql || "");
    } catch (transferError) {
      setError(transferError instanceof Error ? transferError.message : "字段生成失败");
    } finally {
      setIntegrationLoading(false);
    }
  }

  async function handleSaveIntegrationConfig() {
    if (!selectedNodeId || !nodeDetail) {
      return;
    }
    if (!integrationDraft.source.database || !integrationDraft.source.table || !integrationDraft.target.database || !integrationDraft.target.table) {
      setError("来源和目标的库表不能为空");
      return;
    }
    setIntegrationLoading(true);
    setError("");
    try {
      await updateAnalysisNode(selectedNodeId, {
        name: nodeDetail.name,
        desc: nodeDetail.desc,
        content: JSON.stringify(integrationPayloadFromDraft(integrationDraft)),
        folderId: draft.folderId,
        tertiary: draft.tertiary
      });
      setMessage("数据集成配置已保存");
      setIntegrationModalOpen(false);
      await loadNode(selectedNodeId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存数据集成配置失败");
    } finally {
      setIntegrationLoading(false);
    }
  }

  useEffect(() => {
    void loadInstances();
  }, []);

  useEffect(() => {
    if (!selectedInstanceId) {
      setTree(null);
      setDataSources([]);
      return;
    }
    if (mode === "offline") {
      void loadWorkflows(selectedInstanceId);
    }
    if (mode === "temporary") {
      void loadTree(selectedInstanceId, activeNodeScope);
    }
    if (mode === "datasource") {
      void loadDataSources(selectedInstanceId);
    }
    if (mode === "dashboard") {
      void loadWorkerDashboard(selectedInstanceId);
    }
    if (mode === "executions") {
      void loadWorkers(selectedInstanceId);
    }
    if (mode === "realtime") {
      void loadRealtimeDatabases(selectedInstanceId);
    }
  }, [activeNodeScope, mode, selectedInstanceId]);

  useEffect(() => {
    if (!selectedInstanceId || mode !== "offline") {
      return;
    }
    if (!selectedWorkflowId) {
      setTree(null);
      setSelectedNodeId(null);
      setBoardNode(null);
      setBoardDetail(null);
      setBoardNodes([]);
      setBoardEdges([]);
      return;
    }
    void loadTree(selectedInstanceId, activeNodeScope, selectedWorkflowId);
    if (selectedWorkflow) {
      void loadWorkflowBoard(selectedInstanceId, selectedWorkflow);
    }
  }, [activeNodeScope, mode, selectedInstanceId, selectedWorkflowId]);

  useEffect(() => {
    if (!selectedNodeId) {
      setNodeDetail(null);
      return;
    }
    void loadNode(selectedNodeId);
  }, [selectedNodeId]);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function handleSaveNode() {
    if (!selectedNodeId || !nodeDetail) {
      return;
    }
    if (!draft.name.trim()) {
      setError("节点名称不能为空");
      return;
    }
    setNodeLoading(true);
    setError("");
    try {
      await updateAnalysisNode(selectedNodeId, {
        name: draft.name.trim(),
        desc: draft.desc.trim(),
        content: draft.content,
        folderId: draft.folderId,
        tertiary: draft.tertiary
      });
      setMessage("节点已保存");
      await Promise.all([
        selectedInstanceId ? loadTree(selectedInstanceId) : Promise.resolve(),
        loadNode(selectedNodeId)
      ]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setNodeLoading(false);
    }
  }

  async function handleRunNode() {
    if (!selectedNodeId) {
      return;
    }
    setRunning(true);
    setError("");
    try {
      await runAnalysisNode(selectedNodeId);
      setMessage("节点已提交运行");
      await loadNode(selectedNodeId);
      if (selectedInstanceId) {
        await loadTree(selectedInstanceId);
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "运行失败");
    } finally {
      setRunning(false);
    }
  }

  async function handleStopNode() {
    if (!selectedNodeId) {
      return;
    }
    setRunning(true);
    setError("");
    try {
      await stopAnalysisNode(selectedNodeId);
      setMessage("节点已停止");
      await loadNode(selectedNodeId);
      if (selectedInstanceId) {
        await loadTree(selectedInstanceId);
      }
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "停止失败");
    } finally {
      setRunning(false);
    }
  }

  async function handleLockNode(force = false) {
    if (!selectedNodeId) {
      return;
    }
    setError("");
    try {
      if (force) {
        await lockAnalysisNode(selectedNodeId);
      } else {
        await lockAnalysisNode(selectedNodeId);
      }
      setMessage("已进入编辑状态");
      await loadNode(selectedNodeId);
    } catch (lockError) {
      setError(lockError instanceof Error ? lockError.message : "锁定失败");
    }
  }

  async function handleUnlockNode() {
    if (!selectedNodeId) {
      return;
    }
    setError("");
    try {
      await unlockAnalysisNode(selectedNodeId);
      setMessage("已退出编辑状态");
      await loadNode(selectedNodeId);
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "解锁失败");
    }
  }

  async function handleCreateNode() {
    if (!selectedInstanceId) {
      return;
    }
    if (!draft.name.trim()) {
      setError("节点名称不能为空");
      return;
    }
    setNodeLoading(true);
    setError("");
    try {
      const created = await createAnalysisNode({
        iid: selectedInstanceId,
        primary: activeNodeScope.primary,
        secondary: mode === "offline" ? draft.secondary : activeNodeScope.secondary,
        tertiary: draft.tertiary,
        name: draft.name.trim(),
        desc: draft.desc.trim(),
        content: draft.content,
        folderId: draft.folderId,
        workflowId: mode === "offline" ? selectedWorkflowId || undefined : undefined
      });
      setNodeModalOpen(false);
      setMessage("节点已创建");
      await loadTree(selectedInstanceId, activeNodeScope, selectedWorkflowId);
      setSelectedNodeId(created.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建节点失败");
    } finally {
      setNodeLoading(false);
    }
  }

  async function handleCreateFolder() {
    if (!selectedInstanceId) {
      return;
    }
    if (!folderName.trim()) {
      setError("文件夹名称不能为空");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (editingFolder) {
        await updateAnalysisFolder(editingFolder.id, {
          name: folderName.trim(),
          desc: folderDesc.trim(),
          parentId: editingFolder.parentId ?? 0
        });
      } else {
        await createAnalysisFolder({
          iid: selectedInstanceId,
          name: folderName.trim(),
          desc: folderDesc.trim(),
          primary: activeNodeScope.primary,
          secondary: activeNodeScope.secondary,
          parentId: 0,
          workflowId: mode === "offline" ? selectedWorkflowId || undefined : undefined
        });
      }
      setFolderModalOpen(false);
      setEditingFolder(null);
      setFolderName("");
      setFolderDesc("");
      setMessage(editingFolder ? "文件夹已更新" : "文件夹已创建");
      await loadTree(selectedInstanceId, activeNodeScope, selectedWorkflowId);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "保存文件夹失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteFolder(folder: TreeNodeRow) {
    if (!selectedInstanceId || folder.kind !== "folder") {
      return;
    }
    if (!window.confirm(`确认删除文件夹 ${folder.name} 吗？请先确保文件夹内没有节点。`)) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await deleteAnalysisFolder(folder.id);
      setMessage("文件夹已删除");
      await loadTree(selectedInstanceId, activeNodeScope, selectedWorkflowId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除文件夹失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteNode(node: AnalysisNode) {
    if (!selectedInstanceId) {
      return;
    }
    if (!window.confirm(`确认删除节点 ${node.name} 吗？`)) {
      return;
    }
    setNodeLoading(true);
    setError("");
    try {
      await deleteAnalysisNode(node.id);
      setMessage("节点已删除");
      if (selectedNodeId === node.id) {
        setSelectedNodeId(null);
        setNodeDetail(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("nodeId");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
      await loadTree(selectedInstanceId, activeNodeScope, selectedWorkflowId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除节点失败");
    } finally {
      setNodeLoading(false);
    }
  }

  function openCreateDataSource() {
    setEditingDataSource(null);
    setDataSourceDraft(buildEmptyDataSourceDraft());
    setDataSourceModalOpen(true);
  }

  function openEditDataSource(source: AnalysisDataSource) {
    setEditingDataSource(source);
    setDataSourceDraft({
      name: source.name,
      desc: source.desc || "",
      url: source.url || "",
      username: source.username || "",
      password: source.password || "",
      typ: source.typ || ANALYSIS_SOURCE_TYPE_MYSQL
    });
    setDataSourceModalOpen(true);
  }

  async function handleSaveDataSource() {
    if (!selectedInstanceId) {
      return;
    }
    if (!dataSourceDraft.name.trim() || !dataSourceDraft.url.trim() || !dataSourceDraft.username.trim()) {
      setError("数据源名称、地址和用户名不能为空");
      return;
    }
    const payload: AnalysisDataSourcePayload = {
      name: dataSourceDraft.name.trim(),
      desc: dataSourceDraft.desc.trim(),
      url: dataSourceDraft.url.trim(),
      username: dataSourceDraft.username.trim(),
      password: dataSourceDraft.password,
      typ: dataSourceDraft.typ
    };
    setDataSourceLoading(true);
    setError("");
    try {
      if (editingDataSource) {
        await updateAnalysisDataSource(editingDataSource.id, payload);
        setMessage("数据源已更新");
      } else {
        await createAnalysisDataSource({
          ...payload,
          iid: selectedInstanceId
        });
        setMessage("数据源已创建");
      }
      setDataSourceModalOpen(false);
      setEditingDataSource(null);
      await loadDataSources(selectedInstanceId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "数据源保存失败");
    } finally {
      setDataSourceLoading(false);
    }
  }

  async function handleDeleteDataSource(source: AnalysisDataSource) {
    if (!selectedInstanceId) {
      return;
    }
    if (!window.confirm(`确认删除数据源 ${source.name} 吗？`)) {
      return;
    }
    setDataSourceLoading(true);
    setError("");
    try {
      await deleteAnalysisDataSource(source.id);
      setMessage("数据源已删除");
      await loadDataSources(selectedInstanceId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "数据源删除失败");
    } finally {
      setDataSourceLoading(false);
    }
  }

  function updateWorkerFilters(patch: Partial<WorkerFilters>) {
    setWorkerFilters((current) => ({
      ...current,
      ...patch
    }));
  }

  async function handleApplyDashboardFilters() {
    if (!selectedInstanceId) {
      return;
    }
    await loadWorkerDashboard(selectedInstanceId, workerFilters);
  }

  async function handleApplyWorkerFilters(patch: Partial<WorkerFilters> = {}) {
    if (!selectedInstanceId) {
      return;
    }
    const nextFilters = {
      ...workerFilters,
      ...patch
    };
    setWorkerFilters(nextFilters);
    await loadWorkers(selectedInstanceId, nextFilters);
  }

  function openCreateWorkflow() {
    setEditingWorkflow(null);
    setWorkflowDraft(buildEmptyWorkflowDraft());
    setWorkflowModalOpen(true);
  }

  function openEditWorkflow(workflow: AnalysisWorkflow) {
    setEditingWorkflow(workflow);
    setWorkflowDraft({
      name: workflow.name,
      desc: workflow.desc || ""
    });
    setWorkflowModalOpen(true);
  }

  async function handleSaveWorkflow() {
    if (!selectedInstanceId) {
      return;
    }
    if (!workflowDraft.name.trim()) {
      setError("工作流名称不能为空");
      return;
    }
    setWorkflowLoading(true);
    setError("");
    try {
      if (editingWorkflow) {
        await updateAnalysisWorkflow(editingWorkflow.id, {
          iid: selectedInstanceId,
          name: workflowDraft.name.trim(),
          desc: workflowDraft.desc.trim()
        });
        setMessage("工作流已更新");
      } else {
        await createAnalysisWorkflow({
          iid: selectedInstanceId,
          name: workflowDraft.name.trim(),
          desc: workflowDraft.desc.trim()
        });
        setMessage("工作流已创建");
      }
      setWorkflowModalOpen(false);
      setEditingWorkflow(null);
      await loadWorkflows(selectedInstanceId);
    } catch (workflowError) {
      setError(workflowError instanceof Error ? workflowError.message : "工作流保存失败");
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function handleDeleteWorkflow() {
    if (!selectedInstanceId || !selectedWorkflow) {
      return;
    }
    if (!window.confirm(`确认删除工作流 ${selectedWorkflow.name} 吗？`)) {
      return;
    }
    setWorkflowLoading(true);
    setError("");
    try {
      await deleteAnalysisWorkflow(selectedWorkflow.id);
      setMessage("工作流已删除");
      setSelectedWorkflowId(0);
      await loadWorkflows(selectedInstanceId);
    } catch (workflowError) {
      setError(workflowError instanceof Error ? workflowError.message : "工作流删除失败");
    } finally {
      setWorkflowLoading(false);
    }
  }

  function handleAddNodeToBoard(node: AnalysisNode) {
    setBoardNodes((current) => [
      ...current,
      {
        id: node.id,
        name: node.name,
        tertiary: node.tertiary,
        primary: node.primary,
        secondary: node.secondary,
        workflowId: node.workflowId,
        sourceId: node.sourceId,
        position: {
          x: 120 + (current.length % 3) * 220,
          y: 80 + Math.floor(current.length / 3) * 120
        }
      }
    ]);
    setBoardDirty(true);
  }

  function handleAddSpecialBoardNode(tertiary: number) {
    const id = String(tertiary);
    if (boardNodeIds.has(id)) {
      return;
    }
    setBoardNodes((current) => [...current, ensureBoardSpecialNode(tertiary)]);
    setBoardDirty(true);
  }

  function handleRemoveBoardNode(nodeId: number | string) {
    const targetId = String(nodeId);
    setBoardNodes((current) => current.filter((node) => String(node.id) !== targetId));
    setBoardEdges((current) => current.filter((edge) => String(edge.source) !== targetId && String(edge.target) !== targetId));
    setBoardDirty(true);
  }

  function handleAddBoardEdge() {
    if (!boardSourceId || !boardTargetId || boardSourceId === boardTargetId) {
      setError("请选择不同的起点和终点");
      return;
    }
    const exists = boardEdges.some((edge) => String(edge.source) === boardSourceId && String(edge.target) === boardTargetId);
    if (exists) {
      setError("连接已存在");
      return;
    }
    setBoardEdges((current) => [
      ...current,
      {
        id: `${boardSourceId}-${boardTargetId}`,
        source: boardSourceId,
        target: boardTargetId
      }
    ]);
    setBoardDirty(true);
  }

  function handleRemoveBoardEdge(edge: BoardEdgeItem) {
    setBoardEdges((current) => current.filter((item) => !(String(item.source) === String(edge.source) && String(item.target) === String(edge.target))));
    setBoardDirty(true);
  }

  async function handleSaveBoard() {
    if (!boardNode || !boardDetail) {
      setError("工作流画布未加载");
      return;
    }
    setBoardLoading(true);
    setError("");
    try {
      await updateAnalysisNode(boardNode.id, {
        name: boardDetail.name || selectedWorkflow?.name || "工作流画布",
        desc: boardDetail.desc || selectedWorkflow?.desc || "",
        content: JSON.stringify({ boardNodeList: boardNodes, boardEdges }),
        folderId: boardNode.folderId || 0,
        tertiary: boardNode.tertiary
      });
      setBoardDirty(false);
      setMessage("工作流画布已保存");
      if (selectedInstanceId && selectedWorkflow) {
        await loadWorkflowBoard(selectedInstanceId, selectedWorkflow);
      }
    } catch (boardError) {
      setError(boardError instanceof Error ? boardError.message : "工作流画布保存失败");
    } finally {
      setBoardLoading(false);
    }
  }

  async function handleRunBoard() {
    if (!boardNode) {
      return;
    }
    setBoardLoading(true);
    setError("");
    try {
      await runAnalysisNode(boardNode.id);
      setMessage("工作流已提交运行");
      if (selectedInstanceId && selectedWorkflow) {
        await loadWorkflowBoard(selectedInstanceId, selectedWorkflow);
      }
    } catch (boardError) {
      setError(boardError instanceof Error ? boardError.message : "工作流运行失败");
    } finally {
      setBoardLoading(false);
    }
  }

  async function handleStopBoard() {
    if (!boardNode) {
      return;
    }
    setBoardLoading(true);
    setError("");
    try {
      await stopAnalysisNode(boardNode.id);
      setMessage("工作流已停止");
      if (selectedInstanceId && selectedWorkflow) {
        await loadWorkflowBoard(selectedInstanceId, selectedWorkflow);
      }
    } catch (boardError) {
      setError(boardError instanceof Error ? boardError.message : "工作流停止失败");
    } finally {
      setBoardLoading(false);
    }
  }

  function handleSelectNode(nodeId: number) {
    setSelectedNodeId(nodeId);
    const url = new URL(window.location.href);
    url.searchParams.set("navKey", navKeyFromMode(mode));
    if (selectedInstanceId) {
      url.searchParams.set("iid", String(selectedInstanceId));
    }
    url.searchParams.set("nodeId", String(nodeId));
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function openCreateNode(folderId = 0) {
    setDraft(buildEmptyDraft(folderId));
    setNodeModalOpen(true);
  }

  function openCreateFolder() {
    setEditingFolder(null);
    setFolderName("");
    setFolderDesc("");
    setFolderModalOpen(true);
  }

  function openEditFolder(folder: TreeNodeRow) {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDesc(folder.desc || "");
    setFolderModalOpen(true);
  }

  const parsedResultDetail = parseResultDetail(resultDetail);
  const resultTableData = buildResultTableData(parsedResultDetail);
  const sqlKeys = Object.keys(parsedResultDetail.involvedSQLs);
  const activeSql = selectedSqlKey ? parsedResultDetail.involvedSQLs[selectedSqlKey] : "";
  const selectedNodeIsIntegration = selectedNode?.secondary === ANALYSIS_SECONDARY_DATA_INTEGRATION;
  const selectedIntegrationSummary = selectedNodeIsIntegration ? parseIntegrationContent(nodeDetail?.content, selectedNode) : null;

  return (
    <section className="cv-page cv-analysis-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>数据开发</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">{activeModeTitle}</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">数据开发</h1>
          <nav className="cv-settings-subnav" aria-label="数据开发导航">
            <button
              type="button"
              className={`cv-settings-subnav__item${mode === "offline" ? " cv-settings-subnav__item--active" : ""}`}
              onClick={() => handleModeChange("offline")}
            >
              数据开发
            </button>
            <button
              type="button"
              className={`cv-settings-subnav__item${mode === "temporary" ? " cv-settings-subnav__item--active" : ""}`}
              onClick={() => handleModeChange("temporary")}
            >
              临时查询
            </button>
            <button
              type="button"
              className={`cv-settings-subnav__item${mode === "datasource" ? " cv-settings-subnav__item--active" : ""}`}
              onClick={() => handleModeChange("datasource")}
            >
              数据源
            </button>
            <button
              type="button"
              className={`cv-settings-subnav__item${mode === "realtime" ? " cv-settings-subnav__item--active" : ""}`}
              onClick={() => handleModeChange("realtime")}
            >
              实时业务流
            </button>
            <button
              type="button"
              className={`cv-settings-subnav__item${mode === "dashboard" ? " cv-settings-subnav__item--active" : ""}`}
              onClick={() => handleModeChange("dashboard")}
            >
              统计看板
            </button>
            <button
              type="button"
              className={`cv-settings-subnav__item${mode === "executions" ? " cv-settings-subnav__item--active" : ""}`}
              onClick={() => handleModeChange("executions")}
            >
              执行明细
            </button>
          </nav>
        </div>
        <div className="cv-header-actions">
          <select
            className="cv-input cv-analysis-instance-select"
            value={selectedInstanceId ?? ""}
            onChange={(event) => {
              const nextInstanceId = Number(event.target.value) || null;
              setSelectedInstanceId(nextInstanceId);
              const url = new URL(window.location.href);
              if (nextInstanceId) {
                url.searchParams.set("iid", String(nextInstanceId));
              } else {
                url.searchParams.delete("iid");
              }
              url.searchParams.delete("nodeId");
              window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
            }}
          >
            {instances.map((instance) => (
              <option key={instance.id} value={instance.id}>
                {instance.name}
              </option>
            ))}
          </select>
          {isNodeWorkbenchMode ? (
            <>
              <button type="button" className="cv-secondary-button" onClick={() => selectedInstanceId && void loadTree(selectedInstanceId)} disabled={loading}>
                刷新
              </button>
              <button type="button" className="cv-secondary-button" onClick={() => openCreateFolder()} disabled={!selectedInstanceId || (mode === "offline" && !selectedWorkflowId)}>
                新建文件夹
              </button>
              <button type="button" className="cv-action-button" onClick={() => openCreateNode()} disabled={!selectedInstanceId || (mode === "offline" && !selectedWorkflowId)}>
                新建节点
              </button>
            </>
          ) : null}
        </div>
      </header>

      <section className="cv-analysis-flow-strip" aria-label="数据开发产出链路">
        <div className="cv-analysis-flow-step">
          <strong>1. 数据源</strong>
          <span>接入 MySQL / ClickHouse / 已有落地表</span>
        </div>
        <div className="cv-analysis-flow-arrow" aria-hidden="true">→</div>
        <div className="cv-analysis-flow-step cv-analysis-flow-step--active">
          <strong>2. 数据开发</strong>
          <span>编排同步、SQL 节点和业务流程</span>
        </div>
        <div className="cv-analysis-flow-arrow" aria-hidden="true">→</div>
        <div className="cv-analysis-flow-step">
          <strong>3. 落地结果</strong>
          <span>查看执行结果、明细表和产出表</span>
        </div>
        <div className="cv-analysis-flow-arrow" aria-hidden="true">→</div>
        <Link className="cv-analysis-flow-step cv-analysis-flow-step--link" to="/v2/reports">
          <strong>4. 数据报表</strong>
          <span>把落地数据渲染为报表和展示页</span>
        </Link>
      </section>

      {error ? (
        <section className="cv-settings-banner cv-settings-banner--error">
          <strong>操作失败</strong>
          <span>{error}</span>
        </section>
      ) : null}

      {isNodeWorkbenchMode ? (
        <div className="cv-analysis-node-stack">
          <div className="cv-analysis-workbench">
            <aside className="cv-panel cv-analysis-tree-panel">
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">Nodes</div>
                <h2 className="cv-panel-title">{selectedInstance?.name || "数据实例"} · {activeNodeScope.title}</h2>
              </div>
              <span className="cv-settings-chip">{treeRows.filter((row) => row.kind === "node").length} 节点</span>
            </div>
            {mode === "offline" ? (
              <div className="cv-analysis-workflow-bar">
                <select
                  className="cv-input"
                  value={selectedWorkflowId}
                  onChange={(event) => {
                    const nextWorkflowId = Number(event.target.value) || 0;
                    setSelectedWorkflowId(nextWorkflowId);
                    const url = new URL(window.location.href);
                    if (nextWorkflowId) {
                      url.searchParams.set("nodeId", String(nextWorkflowId));
                    } else {
                      url.searchParams.delete("nodeId");
                    }
                    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
                  }}
                  disabled={workflowLoading}
                >
                  {workflows.length === 0 ? <option value={0}>暂无工作流</option> : null}
                  {workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
                <div className="cv-analysis-tree-actions">
                  <button type="button" className="cv-link-button" onClick={openCreateWorkflow}>
                    新建
                  </button>
                  <button type="button" className="cv-link-button" onClick={() => selectedWorkflow && openEditWorkflow(selectedWorkflow)} disabled={!selectedWorkflow}>
                    编辑
                  </button>
                  <button type="button" className="cv-link-button" onClick={() => void handleDeleteWorkflow()} disabled={!selectedWorkflow}>
                    删除
                  </button>
                </div>
              </div>
            ) : null}
            <div className="cv-analysis-tree">
              {loading ? (
                <div className="cv-settings-empty">正在加载节点树...</div>
              ) : treeRows.length === 0 ? (
                <div className="cv-settings-empty">{activeNodeScope.emptyText}</div>
              ) : (
                treeRows.map((row) =>
                  row.kind === "folder" ? (
                    <div key={`folder-${row.id}`} className="cv-analysis-tree-folder" style={{ paddingLeft: row.depth * 14 + 8 }}>
                      <span>▸</span>
                      <strong>{row.name}</strong>
                      <div className="cv-analysis-tree-actions">
                        <button type="button" className="cv-link-button" onClick={() => openCreateNode(row.id)}>
                          新建节点
                        </button>
                        <button type="button" className="cv-link-button" onClick={() => openEditFolder(row)}>
                          编辑
                        </button>
                        <button type="button" className="cv-link-button" onClick={() => void handleDeleteFolder(row)}>
                          删除
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={`node-${row.id}`}
                      type="button"
                      className={`cv-analysis-tree-node${selectedNodeId === row.id ? " cv-analysis-tree-node--active" : ""}`}
                      style={{ paddingLeft: row.depth * 14 + 10 }}
                      onClick={() => handleSelectNode(row.id)}
                    >
                      <span className="cv-analysis-tree-node__name">{row.name}</span>
                      <span className="cv-analysis-tree-node__meta">
                        {row.node?.secondary === ANALYSIS_SECONDARY_DATA_INTEGRATION ? "数据集成" : "数据开发"} · {boardNodeTypeLabel(row.node?.tertiary)}
                      </span>
                    </button>
                  )
                )
              )}
            </div>
            </aside>

            <main className="cv-panel cv-analysis-editor-panel">
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">Editor</div>
                <h2 className="cv-panel-title">{nodeDetail?.name || "选择节点"}</h2>
              </div>
              <div className="cv-header-actions">
                <button type="button" className="cv-secondary-button" disabled={!selectedNodeId || nodeLoading} onClick={() => void handleLockNode()}>
                  编辑锁
                </button>
                <button type="button" className="cv-secondary-button" disabled={!selectedNodeId || nodeLoading} onClick={() => void handleUnlockNode()}>
                  解锁
                </button>
                <button type="button" className="cv-secondary-button" disabled={!selectedNodeId || nodeLoading} onClick={() => void handleStopNode()}>
                  停止
                </button>
                {selectedNodeIsIntegration ? (
                  <button type="button" className="cv-secondary-button" disabled={!selectedNodeId || nodeLoading} onClick={() => void openIntegrationModal()}>
                    集成配置
                  </button>
                ) : null}
                <button type="button" className="cv-secondary-button" disabled={!selectedNodeId || nodeLoading} onClick={() => void openScheduleModal()}>
                  调度
                </button>
                <button type="button" className="cv-secondary-button" disabled={!selectedNode || nodeLoading} onClick={() => selectedNode && void handleDeleteNode(selectedNode)}>
                  删除
                </button>
                <button type="button" className="cv-secondary-button" disabled={!selectedNodeId || nodeLoading} onClick={() => void handleSaveNode()}>
                  保存
                </button>
                <button type="button" className="cv-action-button" disabled={!selectedNodeId || running} onClick={() => void handleRunNode()}>
                  {running ? "运行中" : "运行"}
                </button>
              </div>
            </div>

            {nodeDetail ? (
              <div className="cv-analysis-editor">
                <div className="cv-analysis-node-meta">
                  <label className="cv-form-row">
                    <span className="cv-label">节点名称</span>
                    <input className="cv-input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                  <label className="cv-form-row">
                    <span className="cv-label">目录</span>
                    <select className="cv-input" value={draft.folderId} onChange={(event) => setDraft((current) => ({ ...current, folderId: Number(event.target.value) }))}>
                      {folderOptions.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {"  ".repeat(folder.depth)}{folder.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="cv-form-row">
                    <span className="cv-label">描述</span>
                    <input className="cv-input" value={draft.desc} onChange={(event) => setDraft((current) => ({ ...current, desc: event.target.value }))} />
                  </label>
                  <div className="cv-analysis-node-status">
                    <span className={`cv-settings-status ${selectedNode?.status === 3 ? "cv-settings-status--error" : "cv-settings-status--ok"}`}>
                      {nodeStatusLabel(selectedNode?.status ?? nodeDetail.status)}
                    </span>
                    <span className="cv-muted">
                      {nodeDetail.lockUid ? `编辑中：${nodeDetail.nickname || nodeDetail.username || nodeDetail.lockUid}` : "未锁定"}
                    </span>
                  </div>
                </div>
                <textarea
                  className="cv-analysis-sql-editor"
                  value={draft.content}
                  onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                  spellCheck={false}
                />
                {selectedIntegrationSummary ? (
                  <div className="cv-analysis-integration-summary">
                    <span>Source</span>
                    <code>{selectedIntegrationSummary.source.database || "-"} / {selectedIntegrationSummary.source.table || "-"}</code>
                    <span>Target</span>
                    <code>{selectedIntegrationSummary.target.database || "-"} / {selectedIntegrationSummary.target.table || "-"}</code>
                    <span>Mapping</span>
                    <strong>{selectedIntegrationSummary.mapping.length} 条</strong>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="cv-settings-empty">请选择左侧节点开始编辑。</div>
            )}
            </main>

            <aside className="cv-analysis-inspector">
            <section className="cv-panel cv-analysis-side-panel">
              <div className="cv-panel-header">
                <div>
                  <div className="cv-settings-section-eyebrow">Results</div>
                  <h2 className="cv-panel-title">运行结果 / 报表产出</h2>
                </div>
                <div className="cv-header-actions">
                  <span className="cv-settings-chip">{results.length} 条</span>
                  <Link className="cv-link-button" to="/v2/reports">
                    数据报表
                  </Link>
                </div>
              </div>
              <div className="cv-analysis-result-list">
                {results.length === 0 ? (
                  <div className="cv-settings-empty">暂无运行结果。</div>
                ) : (
                  results.map((result) => (
                    <div
                      key={result.id}
                      className={`cv-analysis-result-item${selectedResult?.id === result.id ? " cv-analysis-result-item--active" : ""}`}
                      onClick={() => setSelectedResult(result)}
                    >
                      <button type="button" className="cv-analysis-result-item__main">
                        <strong>#{result.id} {resultStatusLabel(result.status)}</strong>
                        <span>{formatUnixTime(result.ctime)} · {result.cost ?? 0}ms</span>
                      </button>
                      <button type="button" className="cv-link-button" onClick={(event) => {
                        event.stopPropagation();
                        void openResultDetail(result);
                      }}>
                        详情
                      </button>
                    </div>
                  ))
                )}
              </div>
              <pre className="cv-analysis-result-preview">{safePreview(selectedResult?.result ?? nodeDetail?.result)}</pre>
            </section>

            <section className="cv-panel cv-analysis-side-panel">
              <div className="cv-panel-header">
                <div>
                  <div className="cv-settings-section-eyebrow">History</div>
                  <h2 className="cv-panel-title">版本历史</h2>
                </div>
                <span className="cv-settings-chip">{histories.length} 条</span>
              </div>
              <div className="cv-analysis-history-list">
                {histories.length === 0 ? (
                  <div className="cv-settings-empty">暂无版本历史。</div>
                ) : (
                  histories.map((history) => (
                    <div key={history.uuid} className="cv-analysis-history-item">
                      <strong>{history.nickname || history.userName || history.uid}</strong>
                      <span>{formatUnixTime(history.utime)}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
            </aside>
          </div>

          {mode === "offline" ? (
            <section className="cv-panel cv-analysis-board-panel">
              <div className="cv-panel-header">
                <div>
                  <div className="cv-settings-section-eyebrow">Workflow Board</div>
                  <h2 className="cv-panel-title">{selectedWorkflow?.name || "工作流画布"}</h2>
                </div>
                <div className="cv-header-actions">
                  {boardDirty ? <span className="cv-settings-chip">未保存</span> : null}
                  <button type="button" className="cv-secondary-button" onClick={() => void handleStopBoard()} disabled={!boardNode || boardLoading}>
                    停止
                  </button>
                  <button type="button" className="cv-secondary-button" onClick={() => void handleRunBoard()} disabled={!boardNode || boardLoading}>
                    运行
                  </button>
                  <button type="button" className="cv-action-button" onClick={() => void handleSaveBoard()} disabled={!boardNode || boardLoading}>
                    保存画布
                  </button>
                </div>
              </div>
              {boardLoading ? (
                <div className="cv-settings-empty">正在加载工作流画布...</div>
              ) : !selectedWorkflow ? (
                <div className="cv-settings-empty">请先创建或选择工作流。</div>
              ) : (
                <div className="cv-analysis-board-workbench">
                  <aside className="cv-analysis-board-palette">
                    <div className="cv-settings-section-eyebrow">Nodes</div>
                    <div className="cv-analysis-board-specials">
                      <button type="button" className="cv-secondary-button" onClick={() => handleAddSpecialBoardNode(ANALYSIS_TERTIARY_START)}>
                        加入 Start
                      </button>
                      <button type="button" className="cv-secondary-button" onClick={() => handleAddSpecialBoardNode(ANALYSIS_TERTIARY_END)}>
                        加入 End
                      </button>
                    </div>
                    <div className="cv-analysis-board-palette-list">
                      {availableBoardNodes.length === 0 ? (
                        <div className="cv-settings-empty">暂无可加入节点。</div>
                      ) : (
                        availableBoardNodes.map((node) => (
                          <button key={node.id} type="button" className="cv-analysis-board-palette-item" onClick={() => handleAddNodeToBoard(node)}>
                            <strong>{node.name}</strong>
                            <span>{boardNodeTypeLabel(node.tertiary)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </aside>
                  <main className="cv-analysis-board-canvas">
                    <div className="cv-analysis-board-node-list">
                      {boardNodes.length === 0 ? (
                        <div className="cv-settings-empty">从左侧加入节点，构建工作流画布。</div>
                      ) : (
                        boardNodes.map((node) => (
                          <article key={String(node.id)} className="cv-analysis-board-node">
                            <div className="cv-analysis-board-node__head">
                              <strong>{node.name}</strong>
                              <span>{boardNodeTypeLabel(node.tertiary)}</span>
                            </div>
                            <div className="cv-muted">ID {node.id}</div>
                            <div className="cv-analysis-board-position">
                              <label>
                                x
                                <input
                                  className="cv-input"
                                  type="number"
                                  value={node.position?.x ?? 0}
                                  onChange={(event) => {
                                    const value = Number(event.target.value) || 0;
                                    setBoardNodes((current) => current.map((item) => String(item.id) === String(node.id) ? {
                                      ...item,
                                      position: {
                                        x: value,
                                        y: item.position?.y ?? 0
                                      }
                                    } : item));
                                    setBoardDirty(true);
                                  }}
                                />
                              </label>
                              <label>
                                y
                                <input
                                  className="cv-input"
                                  type="number"
                                  value={node.position?.y ?? 0}
                                  onChange={(event) => {
                                    const value = Number(event.target.value) || 0;
                                    setBoardNodes((current) => current.map((item) => String(item.id) === String(node.id) ? {
                                      ...item,
                                      position: {
                                        x: item.position?.x ?? 0,
                                        y: value
                                      }
                                    } : item));
                                    setBoardDirty(true);
                                  }}
                                />
                              </label>
                            </div>
                            <button type="button" className="cv-link-button" onClick={() => handleRemoveBoardNode(node.id)}>
                              移出画布
                            </button>
                          </article>
                        ))
                      )}
                    </div>
                  </main>
                  <aside className="cv-analysis-board-edges">
                    <div className="cv-settings-section-eyebrow">Edges</div>
                    <div className="cv-analysis-board-edge-editor">
                      <select className="cv-input" value={boardSourceId} onChange={(event) => setBoardSourceId(event.target.value)}>
                        <option value="">起点</option>
                        {boardNodes.map((node) => (
                          <option key={String(node.id)} value={String(node.id)}>{node.name}</option>
                        ))}
                      </select>
                      <select className="cv-input" value={boardTargetId} onChange={(event) => setBoardTargetId(event.target.value)}>
                        <option value="">终点</option>
                        {boardNodes.map((node) => (
                          <option key={String(node.id)} value={String(node.id)}>{node.name}</option>
                        ))}
                      </select>
                      <button type="button" className="cv-secondary-button" onClick={handleAddBoardEdge}>
                        连接
                      </button>
                    </div>
                    <div className="cv-analysis-board-edge-list">
                      {boardEdges.length === 0 ? (
                        <div className="cv-muted">暂无连接。</div>
                      ) : (
                        boardEdges.map((edge) => (
                          <div key={`${edge.source}-${edge.target}`} className="cv-analysis-board-edge">
                            <code>{boardNodeNameMap.get(String(edge.source)) || edge.source}</code>
                            <span>→</span>
                            <code>{boardNodeNameMap.get(String(edge.target)) || edge.target}</code>
                            <button type="button" className="cv-link-button" onClick={() => handleRemoveBoardEdge(edge)}>
                              删除
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </aside>
                </div>
              )}
            </section>
          ) : null}
        </div>
      ) : null}

      {mode === "datasource" ? (
        <section className="cv-panel cv-analysis-datasource-panel">
          <div className="cv-panel-header">
            <div>
              <h2 className="cv-panel-title">数据源管理</h2>
              <p className="cv-analysis-section-desc">分为系统 ClickHouse 数据源和数据开发私有数据源。</p>
            </div>
            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => selectedInstanceId && void loadDataSources(selectedInstanceId)}
                disabled={!selectedInstanceId || dataSourceLoading}
              >
                刷新
              </button>
              <button type="button" className="cv-action-button" onClick={openCreateDataSource} disabled={!selectedInstanceId}>
                新建数据源
              </button>
            </div>
          </div>

          <div className="cv-analysis-source-layout">
            <section className="cv-analysis-source-section">
              <div className="cv-panel-header cv-analysis-source-section__header">
                <div>
                  <h3 className="cv-panel-title">系统 ClickHouse 数据源</h3>
                </div>
                <div className="cv-header-actions">
                  <span className="cv-settings-chip">{systemClickHouseInstances.length} 个</span>
                  <Link className="cv-secondary-button" to="/v2/settings/datasource">
                    去配置中心
                  </Link>
                </div>
              </div>
              {systemClickHouseInstances.length === 0 ? (
                <div className="cv-settings-empty">暂无系统 ClickHouse 数据源，请在配置中心新增。</div>
              ) : (
                <div className="cv-analysis-system-source-list">
                  {systemClickHouseInstances.map((instance) => (
                    <article key={instance.id} className="cv-analysis-system-source">
                      <div className="cv-analysis-system-source__main">
                        <strong>{instance.name}</strong>
                        {instance.desc ? <span>{instance.desc}</span> : null}
                      </div>
                      <span className="cv-settings-chip">ID {instance.id}</span>
                      <code>{instance.datasource || "ch"}</code>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="cv-analysis-source-section">
              <div className="cv-panel-header cv-analysis-source-section__header">
                <div>
                  <h3 className="cv-panel-title">数据开发私有数据源</h3>
                </div>
                <div className="cv-header-actions">
                  <select
                    className="cv-input cv-analysis-source-filter"
                    value={dataSourceTypeFilter}
                    onChange={(event) => {
                      const nextTyp = Number(event.target.value);
                      setDataSourceTypeFilter(nextTyp);
                      if (selectedInstanceId) {
                        void loadDataSources(selectedInstanceId, nextTyp);
                      }
                    }}
                  >
                    <option value={0}>全部类型</option>
                    <option value={ANALYSIS_SOURCE_TYPE_MYSQL}>MySQL</option>
                  </select>
                  <span className="cv-settings-chip">{dataSources.length} 个</span>
                </div>
              </div>
              {dataSourceLoading ? (
                <div className="cv-settings-empty">正在加载数据开发私有数据源...</div>
              ) : dataSources.length === 0 ? (
                <div className="cv-settings-empty">暂无数据开发私有数据源，点击右上角新建。</div>
              ) : (
                <div className="cv-table-wrap cv-table-wrap--compact">
                  <table className="cv-table cv-settings-table cv-analysis-source-table">
                    <thead>
                      <tr>
                        <th>名称</th>
                        <th>类型</th>
                        <th>连接地址</th>
                        <th>用户</th>
                        <th>描述</th>
                        <th>创建时间</th>
                        <th style={{ textAlign: "right" }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataSources.map((source) => (
                        <tr key={source.id}>
                          <td>
                            <strong>{source.name}</strong>
                          </td>
                          <td>
                            <span className="cv-settings-chip">{sourceTypeLabel(source.typ)}</span>
                          </td>
                          <td>
                            <code className="cv-code cv-analysis-source-url">{source.url || "-"}</code>
                          </td>
                          <td>{source.username || "-"}</td>
                          <td className="cv-settings-truncate">{source.desc || "-"}</td>
                          <td>{formatUnixTime(source.ctime)}</td>
                          <td>
                            <div className="cv-settings-table-actions">
                              <button type="button" className="cv-secondary-button" onClick={() => openEditDataSource(source)}>
                                编辑
                              </button>
                              <button type="button" className="cv-secondary-button" onClick={() => void handleDeleteDataSource(source)}>
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </section>
      ) : null}

      {mode === "realtime" ? (
        <section className="cv-panel cv-analysis-realtime-panel">
          <div className="cv-panel-header">
            <div>
              <div className="cv-settings-section-eyebrow">Realtime Flow</div>
              <h2 className="cv-panel-title">实时业务流</h2>
            </div>
            <div className="cv-header-actions">
              {realtimeUpdatedAt ? (
                <span className="cv-settings-chip">更新时间 {formatUnixTime(realtimeUpdatedAt)}</span>
              ) : null}
              <button type="button" className="cv-secondary-button" onClick={() => selectedInstanceId && void loadRealtimeDatabases(selectedInstanceId)} disabled={!selectedInstanceId || realtimeLoading}>
                刷新库表
              </button>
              <button type="button" className="cv-action-button" onClick={() => void handleRealtimeSearch()} disabled={!selectedInstanceId || realtimeLoading || !selectedRealtimeDatabase || !selectedRealtimeTable}>
                查询依赖
              </button>
            </div>
          </div>
          <div className="cv-analysis-realtime-workbench">
            <aside className="cv-analysis-realtime-sidebar">
              <div className="cv-settings-section-eyebrow">Selector</div>
              <label className="cv-form-row">
                <span className="cv-label">数据库</span>
                <select
                  className="cv-input"
                  value={selectedRealtimeDatabase}
                  onChange={(event) => void handleRealtimeDatabaseChange(event.target.value)}
                  disabled={realtimeLoading}
                >
                  {realtimeDatabases.length === 0 ? <option value="">暂无数据库</option> : null}
                  {realtimeDatabases.map((database) => (
                    <option key={database} value={database}>
                      {database}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cv-form-row">
                <span className="cv-label">数据表</span>
                <select
                  className="cv-input"
                  value={selectedRealtimeTable}
                  onChange={(event) => handleRealtimeTableChange(event.target.value)}
                  disabled={realtimeLoading || !selectedRealtimeDatabase}
                >
                  {realtimeTables.length === 0 ? <option value="">暂无数据表</option> : null}
                  {realtimeTables.map((table) => (
                    <option key={table} value={table}>
                      {table}
                    </option>
                  ))}
                </select>
              </label>
              <div className="cv-analysis-realtime-summary">
                <span>库数量</span>
                <strong>{realtimeDatabases.length}</strong>
                <span>当前库表数量</span>
                <strong>{realtimeTables.length}</strong>
                <span>依赖节点</span>
                <strong>{realtimeDependencies.length}</strong>
              </div>
            </aside>
            <main className="cv-analysis-realtime-canvas">
              {realtimeLoading ? (
                <div className="cv-settings-empty">正在加载实时业务流...</div>
              ) : realtimeDependencies.length === 0 ? (
                <div className="cv-settings-empty">请选择数据库和数据表后查询依赖。</div>
              ) : (
                <>
                  <div className="cv-analysis-flow-list">
                    {realtimeDependencies.map((node) => {
                      const isSelected = node.database === selectedRealtimeDatabase && node.table === selectedRealtimeTable;
                      return (
                        <button
                          key={`${node.database}.${node.table}`}
                          type="button"
                          className={`cv-analysis-flow-node${isSelected ? " cv-analysis-flow-node--active" : ""}`}
                          onClick={() => void handleOpenCreateSql(node)}
                          disabled={realtimeSqlLoading}
                        >
                          <div className="cv-analysis-flow-node__head">
                            <strong>{node.table}</strong>
                            <span>{node.engine || "-"}</span>
                          </div>
                          <div className="cv-muted">{node.database}</div>
                          <div className="cv-analysis-flow-node__metrics">
                            <span>{formatBytes(node.totalBytes)}</span>
                            <span>{formatLargeNumber(node.totalRows)} 行</span>
                            <span>{node.shardNum || 0} 分片</span>
                            <span>{node.replicaNum || 0} 副本</span>
                          </div>
                          <div className="cv-analysis-flow-node__deps">
                            依赖：{node.deps?.length ? node.deps.join(" / ") : "无下游依赖"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="cv-analysis-flow-edges">
                    <div className="cv-settings-section-eyebrow">Dependencies</div>
                    {realtimeDependencies.flatMap((node) =>
                      (node.deps || []).map((dep) => (
                        <div key={`${node.table}-${dep}`} className="cv-analysis-flow-edge">
                          <code>{node.table}</code>
                          <span>→</span>
                          <code>{dep}</code>
                        </div>
                      ))
                    ).length === 0 ? (
                      <div className="cv-muted">当前返回结果没有依赖边。</div>
                    ) : (
                      realtimeDependencies.flatMap((node) =>
                        (node.deps || []).map((dep) => (
                          <div key={`${node.table}-${dep}`} className="cv-analysis-flow-edge">
                            <code>{node.table}</code>
                            <span>→</span>
                            <code>{dep}</code>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </>
              )}
            </main>
          </div>
        </section>
      ) : null}

      {mode === "dashboard" ? (
        <section className="cv-panel cv-analysis-dashboard-panel">
          <div className="cv-panel-header">
            <div>
              <div className="cv-settings-section-eyebrow">Dashboard</div>
              <h2 className="cv-panel-title">统计看板</h2>
            </div>
            <div className="cv-header-actions cv-analysis-filterbar">
              <label className="cv-analysis-inline-field">
                <span>开始</span>
                <input
                  className="cv-input"
                  type="datetime-local"
                  value={datetimeLocalFromUnix(workerFilters.start)}
                  onChange={(event) => updateWorkerFilters({ start: unixFromDatetimeLocal(event.target.value) })}
                />
              </label>
              <label className="cv-analysis-inline-field">
                <span>结束</span>
                <input
                  className="cv-input"
                  type="datetime-local"
                  value={datetimeLocalFromUnix(workerFilters.end)}
                  onChange={(event) => updateWorkerFilters({ end: unixFromDatetimeLocal(event.target.value) })}
                />
              </label>
              <label className="cv-analysis-inline-field cv-analysis-inline-field--compact">
                <span>范围</span>
                <select
                  className="cv-input"
                  value={workerFilters.isInCharge}
                  onChange={(event) => updateWorkerFilters({ isInCharge: Number(event.target.value) })}
                >
                  <option value={0}>全部任务</option>
                  <option value={1}>我负责的</option>
                </select>
              </label>
              <button type="button" className="cv-action-button" onClick={() => void handleApplyDashboardFilters()} disabled={!selectedInstanceId || workerDashboardLoading}>
                查询
              </button>
            </div>
          </div>
          {workerDashboardLoading ? (
            <div className="cv-settings-empty">正在加载统计数据...</div>
          ) : (
            <div className="cv-analysis-dashboard">
              <div className="cv-analysis-metric-grid">
                <div className="cv-analysis-metric">
                  <span>节点成功</span>
                  <strong>{workerDashboard?.nodeSuccess ?? 0}</strong>
                </div>
                <div className="cv-analysis-metric cv-analysis-metric--danger">
                  <span>节点失败</span>
                  <strong>{workerDashboard?.nodeFailed ?? 0}</strong>
                </div>
                <div className="cv-analysis-metric">
                  <span>节点未知</span>
                  <strong>{workerDashboard?.nodeUnknown ?? 0}</strong>
                </div>
                <div className="cv-analysis-metric">
                  <span>执行成功</span>
                  <strong>{workerDashboard?.workerSuccess ?? 0}</strong>
                </div>
                <div className="cv-analysis-metric cv-analysis-metric--danger">
                  <span>执行失败</span>
                  <strong>{workerDashboard?.workerFailed ?? 0}</strong>
                </div>
                <div className="cv-analysis-metric">
                  <span>执行未知</span>
                  <strong>{workerDashboard?.workerUnknown ?? 0}</strong>
                </div>
              </div>
              <section className="cv-analysis-trend-panel">
                <div className="cv-panel-header">
                  <div>
                    <div className="cv-settings-section-eyebrow">Trend</div>
                    <h3 className="cv-panel-title">执行趋势</h3>
                  </div>
                  <span className="cv-settings-chip">{workerDashboard?.flows?.length ?? 0} 点</span>
                </div>
                <div className="cv-analysis-trend">
                  {(workerDashboard?.flows ?? []).length === 0 ? (
                    <div className="cv-settings-empty">当前时间范围内暂无趋势数据。</div>
                  ) : (
                    workerDashboard?.flows.map((flow) => {
                      const total = Math.max(flowTotal(flow), 1);
                      return (
                        <div key={flow.timestamp} className="cv-analysis-trend-row" title={`成功 ${flow.success} / 失败 ${flow.failed} / 未知 ${flow.unknown}`}>
                          <time>{formatUnixTime(flow.timestamp)}</time>
                          <div className="cv-analysis-trend-bar">
                            {flow.success ? <span className="cv-analysis-trend-bar__ok" style={{ width: `${(flow.success / total) * 100}%` }} /> : null}
                            {flow.failed ? <span className="cv-analysis-trend-bar__error" style={{ width: `${(flow.failed / total) * 100}%` }} /> : null}
                            {flow.unknown ? <span className="cv-analysis-trend-bar__unknown" style={{ width: `${(flow.unknown / total) * 100}%` }} /> : null}
                          </div>
                          <strong>{flowTotal(flow)}</strong>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}
        </section>
      ) : null}

      {mode === "executions" ? (
        <section className="cv-panel cv-analysis-executions-panel">
          <div className="cv-panel-header">
            <div>
              <div className="cv-settings-section-eyebrow">Workers</div>
              <h2 className="cv-panel-title">执行明细</h2>
            </div>
            <div className="cv-header-actions">
              <button type="button" className="cv-secondary-button" onClick={() => selectedInstanceId && void loadWorkers(selectedInstanceId)} disabled={!selectedInstanceId || workersLoading}>
                刷新
              </button>
            </div>
          </div>
          <div className="cv-analysis-execution-filters">
            <label className="cv-analysis-inline-field">
              <span>开始</span>
              <input
                className="cv-input"
                type="datetime-local"
                value={datetimeLocalFromUnix(workerFilters.start)}
                onChange={(event) => updateWorkerFilters({ start: unixFromDatetimeLocal(event.target.value) })}
              />
            </label>
            <label className="cv-analysis-inline-field">
              <span>结束</span>
              <input
                className="cv-input"
                type="datetime-local"
                value={datetimeLocalFromUnix(workerFilters.end)}
                onChange={(event) => updateWorkerFilters({ end: unixFromDatetimeLocal(event.target.value) })}
              />
            </label>
            <label className="cv-analysis-inline-field">
              <span>节点</span>
              <input
                className="cv-input"
                placeholder="节点名称"
                value={workerFilters.nodeName}
                onChange={(event) => updateWorkerFilters({ nodeName: event.target.value })}
              />
            </label>
            <label className="cv-analysis-inline-field cv-analysis-inline-field--compact">
              <span>类型</span>
              <select className="cv-input" value={workerFilters.tertiary} onChange={(event) => updateWorkerFilters({ tertiary: Number(event.target.value) })}>
                <option value={0}>全部类型</option>
                <option value={ANALYSIS_TERTIARY_CLICKHOUSE}>ClickHouse</option>
                <option value={ANALYSIS_TERTIARY_MYSQL}>MySQL</option>
                <option value={ANALYSIS_TERTIARY_OFFLINE_SYNC}>OfflineSync</option>
              </select>
            </label>
            <label className="cv-analysis-inline-field cv-analysis-inline-field--compact">
              <span>状态</span>
              <select className="cv-input" value={workerFilters.status} onChange={(event) => updateWorkerFilters({ status: Number(event.target.value) })}>
                <option value={-1}>全部状态</option>
                <option value={0}>未知</option>
                <option value={1}>成功</option>
                <option value={2}>失败</option>
              </select>
            </label>
            <button type="button" className="cv-action-button" onClick={() => void handleApplyWorkerFilters({ current: 1 })} disabled={!selectedInstanceId || workersLoading}>
              查询
            </button>
          </div>
          {workersLoading ? (
            <div className="cv-settings-empty">正在加载执行明细...</div>
          ) : workers.length === 0 ? (
            <div className="cv-settings-empty">当前条件下暂无执行记录。</div>
          ) : (
            <div className="cv-table-wrap cv-table-wrap--compact">
              <table className="cv-table cv-settings-table cv-analysis-worker-table">
                <thead>
                  <tr>
                    <th>节点</th>
                    <th>状态</th>
                    <th>类型</th>
                    <th>调度</th>
                    <th>耗时</th>
                    <th>开始时间</th>
                    <th>结束时间</th>
                    <th>负责人</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => (
                    <tr key={worker.id}>
                      <td>
                        <strong>{worker.nodeName || "-"}</strong>
                        <div className="cv-muted">Node #{worker.nodeId}</div>
                      </td>
                      <td>
                        <span className={`cv-settings-status ${workerStatusClass(worker.status)}`}>{workerStatusLabel(worker.status)}</span>
                      </td>
                      <td>{tertiaryLabel(worker.tertiary)}</td>
                      <td>
                        <code className="cv-code">{worker.crontab || "-"}</code>
                      </td>
                      <td>{formatDuration(worker.cost)}</td>
                      <td>{formatUnixTime(worker.startTime)}</td>
                      <td>{formatUnixTime(worker.endTime)}</td>
                      <td>{worker.chargePerson?.nickname || worker.chargePerson?.username || worker.chargePerson?.uid || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="cv-analysis-pagination">
            <span className="cv-muted">
              共 {workersTotal} 条，第 {workerFilters.current} 页
            </span>
            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-secondary-button"
                disabled={workerFilters.current <= 1 || workersLoading}
                onClick={() => void handleApplyWorkerFilters({ current: Math.max(1, workerFilters.current - 1) })}
              >
                上一页
              </button>
              <button
                type="button"
                className="cv-secondary-button"
                disabled={workerFilters.current * workerFilters.pageSize >= workersTotal || workersLoading}
                onClick={() => void handleApplyWorkerFilters({ current: workerFilters.current + 1 })}
              >
                下一页
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {message ? <div className="cv-settings-toast">{message}</div> : null}

      {nodeModalOpen ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal cv-analysis-modal" role="dialog" aria-label="新建分析节点">
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">Node</div>
                <h2 className="cv-panel-title">新建分析节点</h2>
              </div>
              <button type="button" className="cv-secondary-button" onClick={() => setNodeModalOpen(false)}>
                关闭
              </button>
            </div>
            <div className="cv-form-grid">
              <label className="cv-form-row">
                <span className="cv-label">名称</span>
                <input className="cv-input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="cv-form-row">
                <span className="cv-label">目录</span>
                <select className="cv-input" value={draft.folderId} onChange={(event) => setDraft((current) => ({ ...current, folderId: Number(event.target.value) }))}>
                  {folderOptions.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {"  ".repeat(folder.depth)}{folder.name}
                    </option>
                  ))}
                </select>
              </label>
              {mode === "offline" ? (
                <label className="cv-form-row">
                  <span className="cv-label">分类</span>
                  <select className="cv-input" value={draft.secondary} onChange={(event) => setDraft((current) => ({ ...current, secondary: Number(event.target.value) }))}>
                    <option value={ANALYSIS_SECONDARY_DATA_MINING}>数据开发</option>
                    <option value={ANALYSIS_SECONDARY_DATA_INTEGRATION}>数据集成</option>
                  </select>
                </label>
              ) : null}
              <label className="cv-form-row">
                <span className="cv-label">执行类型</span>
                <select className="cv-input" value={draft.tertiary} onChange={(event) => setDraft((current) => ({ ...current, tertiary: Number(event.target.value) }))}>
                  <option value={ANALYSIS_TERTIARY_CLICKHOUSE}>ClickHouse</option>
                  <option value={ANALYSIS_TERTIARY_MYSQL}>MySQL</option>
                  {mode === "offline" ? <option value={ANALYSIS_TERTIARY_OFFLINE_SYNC}>OfflineSync</option> : null}
                </select>
              </label>
              <label className="cv-form-row">
                <span className="cv-label">描述</span>
                <input className="cv-input" value={draft.desc} onChange={(event) => setDraft((current) => ({ ...current, desc: event.target.value }))} />
              </label>
              <label className="cv-form-row">
                <span className="cv-label">SQL 内容</span>
                <textarea className="cv-textarea cv-analysis-create-sql" value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} />
              </label>
            </div>
            <div className="cv-settings-action-row">
              <button type="button" className="cv-secondary-button" onClick={() => setNodeModalOpen(false)}>
                取消
              </button>
              <button type="button" className="cv-action-button" onClick={() => void handleCreateNode()} disabled={nodeLoading}>
                创建节点
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {folderModalOpen ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal cv-analysis-modal" role="dialog" aria-label={editingFolder ? "编辑分析文件夹" : "新建分析文件夹"}>
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">Folder</div>
                <h2 className="cv-panel-title">{editingFolder ? "编辑文件夹" : "新建文件夹"}</h2>
              </div>
              <button type="button" className="cv-secondary-button" onClick={() => {
                setFolderModalOpen(false);
                setEditingFolder(null);
              }}>
                关闭
              </button>
            </div>
            <div className="cv-form-grid">
              <label className="cv-form-row">
                <span className="cv-label">名称</span>
                <input className="cv-input" value={folderName} onChange={(event) => setFolderName(event.target.value)} />
              </label>
              <label className="cv-form-row">
                <span className="cv-label">描述</span>
                <input className="cv-input" value={folderDesc} onChange={(event) => setFolderDesc(event.target.value)} />
              </label>
            </div>
            <div className="cv-settings-action-row">
              <button type="button" className="cv-secondary-button" onClick={() => {
                setFolderModalOpen(false);
                setEditingFolder(null);
              }}>
                取消
              </button>
              <button type="button" className="cv-action-button" onClick={() => void handleCreateFolder()} disabled={loading}>
                {editingFolder ? "保存文件夹" : "创建文件夹"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {workflowModalOpen ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal cv-analysis-modal" role="dialog" aria-label={editingWorkflow ? "编辑工作流" : "新建工作流"}>
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">Workflow</div>
                <h2 className="cv-panel-title">{editingWorkflow ? "编辑工作流" : "新建工作流"}</h2>
              </div>
              <button type="button" className="cv-secondary-button" onClick={() => {
                setWorkflowModalOpen(false);
                setEditingWorkflow(null);
              }}>
                关闭
              </button>
            </div>
            <div className="cv-form-grid">
              <label className="cv-form-row">
                <span className="cv-label">名称</span>
                <input className="cv-input" value={workflowDraft.name} onChange={(event) => setWorkflowDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="cv-form-row cv-form-row--wide">
                <span className="cv-label">描述</span>
                <textarea className="cv-textarea" value={workflowDraft.desc} onChange={(event) => setWorkflowDraft((current) => ({ ...current, desc: event.target.value }))} />
              </label>
            </div>
            <div className="cv-settings-action-row">
              <button type="button" className="cv-secondary-button" onClick={() => {
                setWorkflowModalOpen(false);
                setEditingWorkflow(null);
              }}>
                取消
              </button>
              <button type="button" className="cv-action-button" onClick={() => void handleSaveWorkflow()} disabled={workflowLoading}>
                {editingWorkflow ? "保存工作流" : "创建工作流"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {integrationModalOpen ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal cv-analysis-integration-modal" role="dialog" aria-label="数据集成配置">
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">Integration</div>
                <h2 className="cv-panel-title">{selectedNode?.name || "节点"} · 数据集成配置</h2>
              </div>
              <div className="cv-header-actions">
                <button type="button" className="cv-secondary-button" onClick={() => setIntegrationModalOpen(false)}>
                  关闭
                </button>
                <button type="button" className="cv-action-button" onClick={() => void handleSaveIntegrationConfig()} disabled={integrationLoading}>
                  保存配置
                </button>
              </div>
            </div>
            <div className="cv-analysis-integration-grid">
              <section className="cv-analysis-form-section">
                <div className="cv-settings-section-eyebrow">Source</div>
                <div className="cv-form-grid">
                  <label className="cv-form-row">
                    <span className="cv-label">类型</span>
                    <select
                      className="cv-input"
                      value={integrationDraft.source.type}
                      onChange={(event) => {
                        const source = { ...buildEmptyIntegrationEndpoint(Number(event.target.value)) };
                        setIntegrationDraft((current) => ({ ...current, source, mapping: [] }));
                        void loadIntegrationDatabases("source", source);
                      }}
                    >
                      <option value={ANALYSIS_SOURCE_TYPE_CLICKHOUSE}>ClickHouse</option>
                      <option value={ANALYSIS_SOURCE_TYPE_MYSQL}>MySQL</option>
                    </select>
                  </label>
                  {integrationDraft.source.type === ANALYSIS_SOURCE_TYPE_MYSQL ? (
                    <label className="cv-form-row">
                      <span className="cv-label">数据源</span>
                      <select
                        className="cv-input"
                        value={integrationDraft.source.datasource}
                        onChange={(event) => {
                          const source = { ...integrationDraft.source, datasource: Number(event.target.value), database: "", table: "" };
                          setIntegrationDraft((current) => ({ ...current, source, mapping: [] }));
                          void loadIntegrationDatabases("source", source);
                        }}
                      >
                        <option value={0}>请选择数据源</option>
                        {dataSources.map((source) => (
                          <option key={source.id} value={source.id}>{source.name}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="cv-form-row">
                    <span className="cv-label">数据库</span>
                    <select
                      className="cv-input"
                      value={integrationDraft.source.database}
                      onChange={(event) => {
                        const source = { ...integrationDraft.source, database: event.target.value, table: "" };
                        setIntegrationDraft((current) => ({ ...current, source, mapping: [] }));
                        void loadIntegrationTables("source", source);
                      }}
                    >
                      <option value="">请选择数据库</option>
                      {integrationOptions.sourceDatabases.map((database) => (
                        <option key={database} value={database}>{database}</option>
                      ))}
                    </select>
                  </label>
                  <label className="cv-form-row">
                    <span className="cv-label">数据表</span>
                    <select
                      className="cv-input"
                      value={integrationDraft.source.table}
                      onChange={(event) => {
                        const source = { ...integrationDraft.source, table: event.target.value };
                        setIntegrationDraft((current) => ({ ...current, source, mapping: [] }));
                        void loadIntegrationColumns("source", source);
                      }}
                    >
                      <option value="">请选择数据表</option>
                      {integrationOptions.sourceTables.map((table) => (
                        <option key={table} value={table}>{table}</option>
                      ))}
                    </select>
                  </label>
                  <label className="cv-form-row cv-form-row--wide">
                    <span className="cv-label">来源过滤</span>
                    <input
                      className="cv-input"
                      placeholder="可选，sourceFilter"
                      value={integrationDraft.source.sourceFilter || ""}
                      onChange={(event) => setIntegrationDraft((current) => ({ ...current, source: { ...current.source, sourceFilter: event.target.value } }))}
                    />
                  </label>
                </div>
                <div className="cv-analysis-column-list">
                  {integrationOptions.sourceColumns.map((column) => (
                    <span key={column.field} className="cv-settings-chip cv-settings-chip--truncate">{column.field} · {column.type}</span>
                  ))}
                </div>
              </section>

              <section className="cv-analysis-form-section">
                <div className="cv-settings-section-eyebrow">Target</div>
                <div className="cv-form-grid">
                  <label className="cv-form-row">
                    <span className="cv-label">类型</span>
                    <select
                      className="cv-input"
                      value={integrationDraft.target.type}
                      onChange={(event) => {
                        const target = { ...buildEmptyIntegrationEndpoint(Number(event.target.value)) };
                        setIntegrationDraft((current) => ({ ...current, target, mapping: [] }));
                        void loadIntegrationDatabases("target", target);
                      }}
                    >
                      <option value={ANALYSIS_SOURCE_TYPE_CLICKHOUSE}>ClickHouse</option>
                      <option value={ANALYSIS_SOURCE_TYPE_MYSQL}>MySQL</option>
                    </select>
                  </label>
                  {integrationDraft.target.type === ANALYSIS_SOURCE_TYPE_MYSQL ? (
                    <label className="cv-form-row">
                      <span className="cv-label">数据源</span>
                      <select
                        className="cv-input"
                        value={integrationDraft.target.datasource}
                        onChange={(event) => {
                          const target = { ...integrationDraft.target, datasource: Number(event.target.value), database: "", table: "" };
                          setIntegrationDraft((current) => ({ ...current, target, mapping: [] }));
                          void loadIntegrationDatabases("target", target);
                        }}
                      >
                        <option value={0}>请选择数据源</option>
                        {dataSources.map((source) => (
                          <option key={source.id} value={source.id}>{source.name}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="cv-form-row">
                    <span className="cv-label">数据库</span>
                    <select
                      className="cv-input"
                      value={integrationDraft.target.database}
                      onChange={(event) => {
                        const target = { ...integrationDraft.target, database: event.target.value, table: "" };
                        setIntegrationDraft((current) => ({ ...current, target, mapping: [] }));
                        void loadIntegrationTables("target", target);
                      }}
                    >
                      <option value="">请选择数据库</option>
                      {integrationOptions.targetDatabases.map((database) => (
                        <option key={database} value={database}>{database}</option>
                      ))}
                    </select>
                  </label>
                  <label className="cv-form-row">
                    <span className="cv-label">数据表</span>
                    <select
                      className="cv-input"
                      value={integrationDraft.target.table}
                      onChange={(event) => {
                        const target = { ...integrationDraft.target, table: event.target.value };
                        setIntegrationDraft((current) => ({ ...current, target, mapping: [] }));
                        void loadIntegrationColumns("target", target);
                      }}
                    >
                      <option value="">请选择数据表</option>
                      {integrationOptions.targetTables.map((table) => (
                        <option key={table} value={table}>{table}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="cv-analysis-column-list">
                  {integrationOptions.targetColumns.map((column) => (
                    <span key={column.field} className="cv-settings-chip cv-settings-chip--truncate">{column.field} · {column.type}</span>
                  ))}
                </div>
                <div className="cv-settings-action-row">
                  <button type="button" className="cv-secondary-button" onClick={() => void handleGenerateTargetDDL()} disabled={integrationLoading || integrationOptions.sourceColumns.length === 0}>
                    字段生成
                  </button>
                </div>
                {structuralSql ? <pre className="cv-analysis-create-sql-preview">{structuralSql}</pre> : null}
              </section>
            </div>

            <section className="cv-analysis-form-section">
              <div className="cv-panel-header cv-analysis-form-section__header">
                <div className="cv-settings-section-eyebrow">Field Mapping</div>
                <div className="cv-header-actions">
                  <button type="button" className="cv-secondary-button" onClick={handleAutoMapByName}>同名映射</button>
                  <button type="button" className="cv-secondary-button" onClick={handleAutoMapByOrder}>同行映射</button>
                  <button
                    type="button"
                    className="cv-secondary-button"
                    onClick={() => {
                      const sourceColumn = integrationOptions.sourceColumns[0];
                      const targetColumn = integrationOptions.targetColumns[0];
                      if (!sourceColumn || !targetColumn) {
                        setError("请先加载来源和目标字段");
                        return;
                      }
                      setIntegrationDraft((current) => ({
                        ...current,
                        mapping: [
                          ...current.mapping,
                          {
                            source: sourceColumn.field,
                            target: targetColumn.field,
                            sourceType: sourceColumn.type,
                            targetType: targetColumn.type
                          }
                        ]
                      }));
                    }}
                  >
                    新增映射
                  </button>
                  <button type="button" className="cv-secondary-button" onClick={() => setIntegrationDraft((current) => ({ ...current, mapping: [] }))}>清空</button>
                </div>
              </div>
              <div className="cv-analysis-mapping-table">
                <div className="cv-analysis-mapping-table__head">
                  <span>来源字段</span>
                  <span>目标字段</span>
                  <span>类型</span>
                  <span>操作</span>
                </div>
                {integrationDraft.mapping.length === 0 ? (
                  <div className="cv-settings-empty">暂无字段映射，可使用同名/同行映射自动生成。</div>
                ) : (
                  integrationDraft.mapping.map((mapping, index) => (
                    <div key={`${mapping.source}-${mapping.target}-${index}`} className="cv-analysis-mapping-row">
                      <select
                        className="cv-input"
                        value={mapping.source}
                        onChange={(event) => {
                          const sourceColumn = integrationOptions.sourceColumns.find((column) => column.field === event.target.value);
                          setIntegrationDraft((current) => ({
                            ...current,
                            mapping: current.mapping.map((item, itemIndex) => itemIndex === index ? { ...item, source: event.target.value, sourceType: sourceColumn?.type } : item)
                          }));
                        }}
                      >
                        {integrationOptions.sourceColumns.map((column) => (
                          <option key={column.field} value={column.field}>{column.field}</option>
                        ))}
                      </select>
                      <select
                        className="cv-input"
                        value={mapping.target}
                        onChange={(event) => {
                          const targetColumn = integrationOptions.targetColumns.find((column) => column.field === event.target.value);
                          setIntegrationDraft((current) => ({
                            ...current,
                            mapping: current.mapping.map((item, itemIndex) => itemIndex === index ? { ...item, target: event.target.value, targetType: targetColumn?.type } : item)
                          }));
                        }}
                      >
                        {integrationOptions.targetColumns.map((column) => (
                          <option key={column.field} value={column.field}>{column.field}</option>
                        ))}
                      </select>
                      <span className="cv-muted">{mapping.sourceType || "-"} → {mapping.targetType || "-"}</span>
                      <button type="button" className="cv-link-button" onClick={() => setIntegrationDraft((current) => ({ ...current, mapping: current.mapping.filter((_, itemIndex) => itemIndex !== index) }))}>
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>
        </div>
      ) : null}

      {dataSourceModalOpen ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal cv-analysis-modal" role="dialog" aria-label={editingDataSource ? "编辑数据源" : "新建数据源"}>
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">Source</div>
                <h2 className="cv-panel-title">{editingDataSource ? "编辑数据源" : "新建数据源"}</h2>
              </div>
              <button type="button" className="cv-secondary-button" onClick={() => setDataSourceModalOpen(false)}>
                关闭
              </button>
            </div>
            <div className="cv-form-grid">
              <label className="cv-form-row">
                <span className="cv-label">类型</span>
                <select className="cv-input" value={dataSourceDraft.typ} onChange={(event) => setDataSourceDraft((current) => ({ ...current, typ: Number(event.target.value) }))}>
                  <option value={ANALYSIS_SOURCE_TYPE_MYSQL}>MySQL</option>
                </select>
              </label>
              <label className="cv-form-row">
                <span className="cv-label">名称</span>
                <input className="cv-input" value={dataSourceDraft.name} onChange={(event) => setDataSourceDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="cv-form-row">
                <span className="cv-label">连接地址</span>
                <input className="cv-input" placeholder="127.0.0.1:3306" value={dataSourceDraft.url} onChange={(event) => setDataSourceDraft((current) => ({ ...current, url: event.target.value }))} />
              </label>
              <label className="cv-form-row">
                <span className="cv-label">用户名</span>
                <input className="cv-input" value={dataSourceDraft.username} onChange={(event) => setDataSourceDraft((current) => ({ ...current, username: event.target.value }))} />
              </label>
              <label className="cv-form-row">
                <span className="cv-label">密码</span>
                <input className="cv-input" type="password" value={dataSourceDraft.password} onChange={(event) => setDataSourceDraft((current) => ({ ...current, password: event.target.value }))} />
              </label>
              <label className="cv-form-row">
                <span className="cv-label">描述</span>
                <input className="cv-input" value={dataSourceDraft.desc} onChange={(event) => setDataSourceDraft((current) => ({ ...current, desc: event.target.value }))} />
              </label>
            </div>
            <div className="cv-settings-action-row">
              <button type="button" className="cv-secondary-button" onClick={() => setDataSourceModalOpen(false)}>
                取消
              </button>
              <button type="button" className="cv-action-button" onClick={() => void handleSaveDataSource()} disabled={dataSourceLoading}>
                保存
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {scheduleModalOpen ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal cv-analysis-schedule-modal" role="dialog" aria-label="调度配置">
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">Schedule</div>
                <h2 className="cv-panel-title">{selectedNode?.name || nodeDetail?.name || "节点"} · 调度配置</h2>
              </div>
              <div className="cv-header-actions">
                {scheduleExists ? (
                  <button type="button" className="cv-secondary-button" onClick={() => void handleDeleteCrontab()} disabled={scheduleLoading}>
                    删除调度
                  </button>
                ) : null}
                <button type="button" className="cv-secondary-button" onClick={() => setScheduleModalOpen(false)}>
                  关闭
                </button>
              </div>
            </div>
            {scheduleLoading ? (
              <div className="cv-settings-empty">正在加载调度配置...</div>
            ) : (
              <div className="cv-analysis-schedule-form">
                <section className="cv-analysis-form-section">
                  <div className="cv-settings-section-eyebrow">Basic</div>
                  <div className="cv-form-grid">
                    <label className="cv-form-row cv-analysis-switch-row">
                      <span className="cv-label">启用调度</span>
                      <input
                        type="checkbox"
                        checked={crontabDraft.enabled}
                        onChange={(event) => setCrontabDraft((current) => ({ ...current, enabled: event.target.checked }))}
                      />
                    </label>
                    <label className="cv-form-row">
                      <span className="cv-label">负责人</span>
                      <select
                        className="cv-input"
                        value={crontabDraft.dutyUid}
                        onChange={(event) => setCrontabDraft((current) => ({ ...current, dutyUid: Number(event.target.value) }))}
                      >
                        <option value={0}>请选择负责人</option>
                        {analysisUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.nickname || user.username || user.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="cv-form-row">
                      <span className="cv-label">cron</span>
                      <input
                        className="cv-input"
                        placeholder="例如：0 */5 * * * *"
                        value={crontabDraft.cron}
                        onChange={(event) => setCrontabDraft((current) => ({ ...current, cron: event.target.value }))}
                      />
                    </label>
                    <label className="cv-form-row">
                      <span className="cv-label">通知渠道 ID</span>
                      <input
                        className="cv-input"
                        placeholder="多个用逗号分隔"
                        value={crontabDraft.channelIdsText}
                        onChange={(event) => setCrontabDraft((current) => ({ ...current, channelIdsText: event.target.value }))}
                      />
                    </label>
                    <label className="cv-form-row cv-form-row--wide">
                      <span className="cv-label">描述</span>
                      <textarea
                        className="cv-textarea"
                        value={crontabDraft.desc}
                        onChange={(event) => setCrontabDraft((current) => ({ ...current, desc: event.target.value }))}
                      />
                    </label>
                  </div>
                </section>
                <section className="cv-analysis-form-section">
                  <div className="cv-panel-header cv-analysis-form-section__header">
                    <div className="cv-settings-section-eyebrow">Args</div>
                    <button
                      type="button"
                      className="cv-secondary-button"
                      onClick={() => setCrontabDraft((current) => ({ ...current, args: [...current.args, { key: "", val: "" }] }))}
                    >
                      新增参数
                    </button>
                  </div>
                  <div className="cv-analysis-args-list">
                    {crontabDraft.args.map((arg, index) => (
                      <div key={index} className="cv-analysis-arg-row">
                        <input
                          className="cv-input"
                          placeholder="key"
                          value={arg.key}
                          onChange={(event) => setCrontabDraft((current) => ({
                            ...current,
                            args: current.args.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item)
                          }))}
                        />
                        <span>=</span>
                        <input
                          className="cv-input"
                          placeholder="value"
                          value={arg.val}
                          onChange={(event) => setCrontabDraft((current) => ({
                            ...current,
                            args: current.args.map((item, itemIndex) => itemIndex === index ? { ...item, val: event.target.value } : item)
                          }))}
                        />
                        <button
                          type="button"
                          className="cv-link-button"
                          onClick={() => setCrontabDraft((current) => ({ ...current, args: current.args.filter((_, itemIndex) => itemIndex !== index) }))}
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="cv-analysis-form-section">
                  <div className="cv-settings-section-eyebrow">Retry</div>
                  <div className="cv-form-grid">
                    <label className="cv-form-row cv-analysis-switch-row">
                      <span className="cv-label">失败自动重试</span>
                      <input
                        type="checkbox"
                        checked={crontabDraft.isRetry}
                        onChange={(event) => setCrontabDraft((current) => ({ ...current, isRetry: event.target.checked }))}
                      />
                    </label>
                    <label className="cv-form-row">
                      <span className="cv-label">重试次数</span>
                      <input
                        className="cv-input"
                        type="number"
                        min={1}
                        max={30}
                        value={crontabDraft.retryTimes}
                        onChange={(event) => setCrontabDraft((current) => ({ ...current, retryTimes: Number(event.target.value) || 1 }))}
                        disabled={!crontabDraft.isRetry}
                      />
                    </label>
                    <label className="cv-form-row">
                      <span className="cv-label">重试间隔</span>
                      <input
                        className="cv-input"
                        type="number"
                        min={1}
                        max={10}
                        value={crontabDraft.retryInterval}
                        onChange={(event) => setCrontabDraft((current) => ({ ...current, retryInterval: Number(event.target.value) || 1 }))}
                        disabled={!crontabDraft.isRetry}
                      />
                    </label>
                  </div>
                </section>
              </div>
            )}
            <div className="cv-settings-action-row">
              <button type="button" className="cv-secondary-button" onClick={() => setScheduleModalOpen(false)}>
                取消
              </button>
              <button type="button" className="cv-action-button" onClick={() => void handleSaveCrontab()} disabled={scheduleLoading}>
                {scheduleExists ? "保存调度" : "创建调度"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {resultDetailOpen ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal cv-analysis-result-modal" role="dialog" aria-label="运行结果详情">
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">Result Detail</div>
                <h2 className="cv-panel-title">结果 #{resultDetail?.id ?? selectedResult?.id ?? "-"}</h2>
              </div>
              <div className="cv-header-actions">
                <Link className="cv-secondary-button" to="/v2/reports">
                  去数据报表
                </Link>
                <button type="button" className="cv-secondary-button" onClick={() => setResultDetailOpen(false)}>
                  关闭
                </button>
              </div>
            </div>
            {resultDetailLoading ? (
              <div className="cv-settings-empty">正在加载结果详情...</div>
            ) : (
              <div className="cv-analysis-result-detail">
                <div className="cv-analysis-result-message">
                  <strong>message</strong>
                  <span>{parsedResultDetail.message || "-"}</span>
                </div>
                <div className="cv-settings-subnav cv-analysis-detail-tabs">
                  <button type="button" className={`cv-settings-subnav__item${resultDetailTab === "table" ? " cv-settings-subnav__item--active" : ""}`} onClick={() => setResultDetailTab("table")}>
                    table
                  </button>
                  <button type="button" className={`cv-settings-subnav__item${resultDetailTab === "logs" ? " cv-settings-subnav__item--active" : ""}`} onClick={() => setResultDetailTab("logs")}>
                    logs
                  </button>
                  <button type="button" className={`cv-settings-subnav__item${resultDetailTab === "sqls" ? " cv-settings-subnav__item--active" : ""}`} onClick={() => setResultDetailTab("sqls")}>
                    sqls
                  </button>
                  <button type="button" className={`cv-settings-subnav__item${resultDetailTab === "raw" ? " cv-settings-subnav__item--active" : ""}`} onClick={() => setResultDetailTab("raw")}>
                    raw
                  </button>
                </div>
                {resultDetailTab === "table" ? (
                  resultTableData.rows.length === 0 || resultTableData.columns.length === 0 ? (
                    <div className="cv-settings-empty">当前结果无法识别为表格数据。</div>
                  ) : (
                    <div className="cv-analysis-result-table-wrap">
                      <table className="cv-table cv-settings-table cv-analysis-result-table">
                        <thead>
                          <tr>
                            {resultTableData.columns.map((column) => (
                              <th key={column}>{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {resultTableData.rows.map((row, index) => (
                            <tr key={index}>
                              {resultTableData.columns.map((column) => (
                                <td key={column}>
                                  <span title={formatTableCell(row[column])}>{formatTableCell(row[column])}</span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : null}
                {resultDetailTab === "logs" ? (
                  <pre className="cv-analysis-detail-preview">{safePreview(JSON.stringify(parsedResultDetail.logs ?? parsedResultDetail.raw))}</pre>
                ) : null}
                {resultDetailTab === "sqls" ? (
                  <div className="cv-analysis-sql-detail">
                    <select className="cv-input" value={selectedSqlKey} onChange={(event) => setSelectedSqlKey(event.target.value)}>
                      {sqlKeys.length === 0 ? <option value="">暂无 SQL</option> : null}
                      {sqlKeys.map((key) => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                    <pre className="cv-analysis-detail-preview">{activeSql || "暂无 SQL"}</pre>
                  </div>
                ) : null}
                {resultDetailTab === "raw" ? (
                  <pre className="cv-analysis-detail-preview">{safePreview(resultDetail?.result)}</pre>
                ) : null}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {realtimeSqlModalOpen ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal cv-analysis-sql-modal" role="dialog" aria-label="建表 SQL">
            <div className="cv-panel-header">
              <div>
                <div className="cv-settings-section-eyebrow">Create SQL</div>
                <h2 className="cv-panel-title">{realtimeSqlTitle}</h2>
              </div>
              <div className="cv-header-actions">
                <button
                  type="button"
                  className="cv-secondary-button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(realtimeCreateSql);
                    setMessage("SQL 已复制");
                  }}
                >
                  复制
                </button>
                <button type="button" className="cv-secondary-button" onClick={() => setRealtimeSqlModalOpen(false)}>
                  关闭
                </button>
              </div>
            </div>
            <pre className="cv-analysis-create-sql-preview">{realtimeCreateSql || "暂无 SQL"}</pre>
          </section>
        </div>
      ) : null}
    </section>
  );
}
