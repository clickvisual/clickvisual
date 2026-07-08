import { client } from "../../../shared/http/client";

export const ANALYSIS_PRIMARY_MINING = 1;
export const ANALYSIS_PRIMARY_SHORT = 3;
export const ANALYSIS_SECONDARY_DATABASE = 1;
export const ANALYSIS_SECONDARY_DATA_INTEGRATION = 2;
export const ANALYSIS_SECONDARY_DATA_MINING = 3;
export const ANALYSIS_SECONDARY_BOARD = 4;
export const ANALYSIS_TERTIARY_CLICKHOUSE = 10;
export const ANALYSIS_TERTIARY_MYSQL = 11;
export const ANALYSIS_TERTIARY_OFFLINE_SYNC = 20;
export const ANALYSIS_TERTIARY_START = -1;
export const ANALYSIS_TERTIARY_END = -2;
export const ANALYSIS_SOURCE_TYPE_MYSQL = 1;
export const ANALYSIS_SOURCE_TYPE_CLICKHOUSE = -1;

export interface AnalysisInstance {
  id: number;
  name: string;
  datasource?: string;
  desc?: string;
  mode?: number;
}

export interface AnalysisNode {
  id: number;
  iid: number;
  folderId: number;
  primary: number;
  secondary: number;
  tertiary: number;
  workflowId: number;
  sourceId: number;
  name: string;
  desc: string;
  lockUid: number;
  lockAt: number;
  status: number;
  uid: number;
  uuid?: string;
}

export interface AnalysisFolder {
  id: number;
  name: string;
  desc: string;
  primary: number;
  secondary: number;
  parentId: number;
  children: AnalysisFolder[];
  nodes: AnalysisNode[];
}

export interface AnalysisNodeDetail {
  id: number;
  name: string;
  desc: string;
  content: string;
  lockUid: number;
  lockAt: number;
  username: string;
  nickname: string;
  status: number;
  previousContent: string;
  result: string;
}

export interface AnalysisNodeCreatePayload {
  primary: number;
  secondary: number;
  tertiary?: number;
  iid: number;
  name: string;
  content?: string;
  desc?: string;
  folderId?: number;
  workflowId?: number;
}

export interface AnalysisNodeUpdatePayload {
  name: string;
  content: string;
  desc?: string;
  folderId?: number;
  tertiary?: number;
}

export interface AnalysisFolderCreatePayload {
  iid: number;
  name: string;
  primary: number;
  secondary: number;
  desc?: string;
  parentId?: number;
  workflowId?: number;
}

export interface AnalysisFolderUpdatePayload {
  name: string;
  desc: string;
  parentId: number;
}

export interface AnalysisRunResponse {
  result: string;
  status: number;
}

export interface AnalysisNodeHistory {
  uuid: string;
  utime: number;
  uid: number;
  userName: string;
  nickname: string;
}

export interface AnalysisNodeHistoryList {
  total: number;
  list: AnalysisNodeHistory[];
}

export interface AnalysisNodeResult {
  id: number;
  ctime: number;
  nodeId: number;
  content?: string;
  result?: string;
  cost?: number;
  excelProcess?: string;
  status: number;
  uid?: number;
  username?: string;
  nickname?: string;
}

export interface AnalysisNodeResultList {
  total: number;
  list: AnalysisNodeResult[];
}

export interface AnalysisCrontabArg {
  key: string;
  val: string;
}

export interface AnalysisCrontab {
  nodeId: number;
  desc: string;
  dutyUid: number;
  cron: string;
  typ: number;
  status: number;
  uid: number;
  args: string;
  isRetry: number;
  retryTimes: number;
  retryInterval: number;
  channelIds: number[] | string | null;
  ctime: number;
  utime: number;
}

export interface AnalysisCrontabPayload {
  desc?: string;
  dutyUid: number;
  cron?: string;
  typ?: number;
  args?: AnalysisCrontabArg[];
  isRetry: number;
  retryInterval?: number;
  retryTimes?: number;
  channelIds?: number[];
}

export interface AnalysisUser {
  id: number;
  uid?: number;
  username: string;
  nickname?: string;
}

export interface AnalysisDataSource {
  id: number;
  iid: number;
  name: string;
  desc: string;
  url: string;
  username: string;
  password: string;
  typ: number;
  uid: number;
  ctime: number;
  utime: number;
}

export interface AnalysisDataSourcePayload {
  name: string;
  desc: string;
  url: string;
  username: string;
  password: string;
  typ: number;
}

export interface AnalysisDataSourceCreatePayload extends AnalysisDataSourcePayload {
  iid: number;
}

export interface AnalysisWorkerFlow {
  timestamp: number;
  unknown: number;
  failed: number;
  success: number;
}

export interface AnalysisWorkerDashboard {
  nodeFailed: number;
  nodeSuccess: number;
  nodeUnknown: number;
  workerFailed: number;
  workerSuccess: number;
  workerUnknown: number;
  flows: AnalysisWorkerFlow[];
}

export interface AnalysisWorkerRow {
  id: number;
  iid: number;
  nodeId: number;
  nodeName: string;
  status: number;
  tertiary: number;
  crontab: string;
  startTime: number;
  endTime: number;
  cost: number;
  chargePerson?: {
    uid?: number;
    username?: string;
    nickname?: string;
  };
}

export interface AnalysisWorkerList {
  total: number;
  list: AnalysisWorkerRow[];
}

export interface AnalysisRealtimeTableDependency {
  database: string;
  deps: string[];
  engine: string;
  table: string;
  totalBytes: number;
  totalRows: number;
  shardNum: number;
  replicaNum: number;
}

export interface AnalysisRealtimeDependencyResult {
  data: AnalysisRealtimeTableDependency[];
  utime: number;
}

export interface AnalysisWorkflow {
  id: number;
  iid: number;
  name: string;
  desc: string;
  uid: number;
  ctime?: number;
  utime?: number;
  board?: unknown;
}

export interface AnalysisWorkflowPayload {
  iid: number;
  name: string;
  desc?: string;
}

export interface AnalysisTableColumn {
  field: string;
  type: string;
  comment?: string;
}

export interface AnalysisStructuralTransferPayload {
  source: string;
  target: string;
  columns: AnalysisTableColumn[];
}

function buildQueryString(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  return search.toString();
}

export async function listAnalysisInstances(): Promise<AnalysisInstance[]> {
  const data = await client.get<AnalysisInstance[]>("/api/v2/base/settings/instances");
  return Array.isArray(data) ? data : [];
}

export async function getAnalysisNodeTree(params: {
  iid: number;
  primary?: number;
  secondary?: number;
  folderId?: number;
  workflowId?: number;
}): Promise<AnalysisFolder> {
  const query = buildQueryString({
    primary: ANALYSIS_PRIMARY_MINING,
    secondary: ANALYSIS_SECONDARY_DATA_MINING,
    ...params
  });
  return client.get<AnalysisFolder>(`/api/v1/bigdata/nodes?${query}`);
}

export async function createAnalysisFolder(
  payload: AnalysisFolderCreatePayload
): Promise<void> {
  await client.post<void>("/api/v1/bigdata/folders", payload);
}

export async function updateAnalysisFolder(
  folderId: number,
  payload: AnalysisFolderUpdatePayload
): Promise<void> {
  await client.patch<void>(`/api/v1/bigdata/folders/${folderId}`, payload);
}

export async function deleteAnalysisFolder(folderId: number): Promise<void> {
  await client.delete<void>(`/api/v1/bigdata/folders/${folderId}`);
}

export async function createAnalysisNode(
  payload: AnalysisNodeCreatePayload
): Promise<AnalysisNode> {
  return client.post<AnalysisNode>("/api/v1/bigdata/nodes", payload);
}

export async function getAnalysisNode(nodeId: number): Promise<AnalysisNodeDetail> {
  return client.get<AnalysisNodeDetail>(`/api/v1/bigdata/nodes/${nodeId}`);
}

export async function updateAnalysisNode(
  nodeId: number,
  payload: AnalysisNodeUpdatePayload
): Promise<void> {
  await client.patch<void>(`/api/v1/bigdata/nodes/${nodeId}`, payload);
}

export async function deleteAnalysisNode(nodeId: number): Promise<void> {
  await client.delete<void>(`/api/v1/bigdata/nodes/${nodeId}`);
}

export async function runAnalysisNode(nodeId: number): Promise<AnalysisRunResponse> {
  return client.post<AnalysisRunResponse>(`/api/v1/bigdata/nodes/${nodeId}/run`, {});
}

export async function stopAnalysisNode(nodeId: number): Promise<AnalysisRunResponse> {
  return client.post<AnalysisRunResponse>(`/api/v1/bigdata/nodes/${nodeId}/stop`, {});
}

export async function lockAnalysisNode(nodeId: number): Promise<void> {
  await client.patch<void>(`/api/v1/bigdata/nodes/${nodeId}/lock`, {});
}

export async function unlockAnalysisNode(nodeId: number): Promise<void> {
  await client.patch<void>(`/api/v1/bigdata/nodes/${nodeId}/unlock`, {});
}

export async function listAnalysisNodeHistories(
  nodeId: number,
  params: { current?: number; pageSize?: number; isExcludeCrontabResult?: number } = {}
): Promise<AnalysisNodeHistoryList> {
  const query = buildQueryString({
    current: params.current ?? 1,
    pageSize: params.pageSize ?? 20,
    isExcludeCrontabResult: params.isExcludeCrontabResult ?? 0
  });
  return client.get<AnalysisNodeHistoryList>(
    `/api/v1/bigdata/nodes/${nodeId}/histories?${query}`
  );
}

export async function listAnalysisNodeResults(
  nodeId: number,
  params: { current?: number; pageSize?: number; isExcludeCrontabResult?: number } = {}
): Promise<AnalysisNodeResultList> {
  const query = buildQueryString({
    current: params.current ?? 1,
    pageSize: params.pageSize ?? 20,
    isExcludeCrontabResult: params.isExcludeCrontabResult ?? 0
  });
  return client.get<AnalysisNodeResultList>(
    `/api/v2/pandas/nodes/${nodeId}/results?${query}`
  );
}

export async function getAnalysisNodeResult(
  nodeId: number,
  resultId: number
): Promise<AnalysisNodeResult> {
  return client.get<AnalysisNodeResult>(`/api/v1/bigdata/nodes/${nodeId}/result/${resultId}`);
}

export async function listAnalysisUsers(): Promise<AnalysisUser[]> {
  const data = await client.get<AnalysisUser[]>("/api/v1/users");
  return Array.isArray(data) ? data : [];
}

export async function getAnalysisCrontab(nodeId: number): Promise<AnalysisCrontab | null> {
  const data = await client.get<AnalysisCrontab | null>(
    `/api/v1/bigdata/mining/nodes/${nodeId}/crontab`
  );
  return data ?? null;
}

export async function createAnalysisCrontab(
  nodeId: number,
  payload: AnalysisCrontabPayload
): Promise<void> {
  await client.post<void>(`/api/v2/pandas/nodes/${nodeId}/crontab`, payload);
}

export async function updateAnalysisCrontab(
  nodeId: number,
  payload: AnalysisCrontabPayload
): Promise<void> {
  await client.patch<void>(`/api/v2/pandas/nodes/${nodeId}/crontab`, payload);
}

export async function deleteAnalysisCrontab(nodeId: number): Promise<void> {
  await client.delete<void>(`/api/v1/bigdata/mining/nodes/${nodeId}/crontab`);
}

export async function listAnalysisDataSources(params: {
  iid: number;
  typ?: number;
  name?: string;
}): Promise<AnalysisDataSource[]> {
  const query = buildQueryString(params);
  const data = await client.get<AnalysisDataSource[]>(`/api/v1/bigdata/sources?${query}`);
  return Array.isArray(data) ? data : [];
}

export async function createAnalysisDataSource(
  payload: AnalysisDataSourceCreatePayload
): Promise<void> {
  await client.post<void>("/api/v1/bigdata/sources", payload);
}

export async function updateAnalysisDataSource(
  sourceId: number,
  payload: AnalysisDataSourcePayload
): Promise<void> {
  await client.patch<void>(`/api/v1/bigdata/sources/${sourceId}`, payload);
}

export async function deleteAnalysisDataSource(sourceId: number): Promise<void> {
  await client.delete<void>(`/api/v1/bigdata/sources/${sourceId}`);
}

export async function listAnalysisSourceDatabases(
  id: number,
  source: "instances" | "sources"
): Promise<string[]> {
  const data = await client.get<string[]>(
    `/api/v1/bigdata/mining/${source}/${id}/databases`
  );
  return Array.isArray(data) ? data : [];
}

export async function listAnalysisSourceTables(
  id: number,
  source: "instances" | "sources",
  database: string
): Promise<string[]> {
  const query = buildQueryString({ database });
  const data = await client.get<string[]>(
    `/api/v1/bigdata/mining/${source}/${id}/tables?${query}`
  );
  return Array.isArray(data) ? data : [];
}

export async function listAnalysisSourceColumns(
  id: number,
  source: "instances" | "sources",
  params: { database: string; table: string }
): Promise<AnalysisTableColumn[]> {
  const query = buildQueryString(params);
  const data = await client.get<AnalysisTableColumn[]>(
    `/api/v1/bigdata/mining/${source}/${id}/columns?${query}`
  );
  return Array.isArray(data) ? data : [];
}

export async function structuralTransferAnalysis(
  payload: AnalysisStructuralTransferPayload
): Promise<string> {
  return client.post<string>("/api/v2/pandas/utils/structural-transfer", payload);
}

export async function getAnalysisWorkerDashboard(params: {
  iid: number;
  start?: number;
  end?: number;
  isInCharge?: number;
}): Promise<AnalysisWorkerDashboard> {
  const query = buildQueryString(params);
  return client.get<AnalysisWorkerDashboard>(`/api/v2/pandas/workers/dashboard?${query}`);
}

export async function listAnalysisWorkers(params: {
  iid: number;
  current?: number;
  pageSize?: number;
  start?: number;
  end?: number;
  nodeName?: string;
  tertiary?: number;
  status?: number;
}): Promise<AnalysisWorkerList> {
  const query = buildQueryString(params);
  return client.get<AnalysisWorkerList>(`/api/v2/pandas/workers?${query}`);
}

export async function listAnalysisDatabases(instanceId: number): Promise<string[]> {
  const data = await client.get<string[]>(
    `/api/v1/bigdata/mining/instances/${instanceId}/databases`
  );
  return Array.isArray(data) ? data : [];
}

export async function listAnalysisTables(
  instanceId: number,
  database: string
): Promise<string[]> {
  const query = buildQueryString({ database });
  const data = await client.get<string[]>(
    `/api/v1/bigdata/mining/instances/${instanceId}/tables?${query}`
  );
  return Array.isArray(data) ? data : [];
}

export async function getAnalysisTableDependencies(
  instanceId: number,
  params: { databaseName: string; tableName: string }
): Promise<AnalysisRealtimeDependencyResult> {
  const query = buildQueryString(params);
  const result = await client.get<AnalysisRealtimeDependencyResult>(
    `/api/v2/pandas/instances/${instanceId}/table-dependencies?${query}`
  );
  return {
    data: Array.isArray(result.data) ? result.data : [],
    utime: result.utime
  };
}

export async function getAnalysisTableCreateSql(
  instanceId: number,
  database: string,
  table: string
): Promise<string> {
  return client.get<string>(
    `/api/v2/pandas/instances/${instanceId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/create-sql`
  );
}

export async function listAnalysisWorkflows(params: { iid: number }): Promise<AnalysisWorkflow[]> {
  const query = buildQueryString(params);
  const data = await client.get<AnalysisWorkflow[]>(`/api/v1/bigdata/mining/workflows?${query}`);
  return Array.isArray(data) ? data : [];
}

export async function createAnalysisWorkflow(payload: AnalysisWorkflowPayload): Promise<void> {
  await client.post<void>("/api/v1/bigdata/mining/workflows", payload);
}

export async function updateAnalysisWorkflow(
  workflowId: number,
  payload: AnalysisWorkflowPayload
): Promise<void> {
  await client.patch<void>(`/api/v1/bigdata/mining/workflows/${workflowId}`, payload);
}

export async function deleteAnalysisWorkflow(workflowId: number): Promise<void> {
  await client.delete<void>(`/api/v1/bigdata/mining/workflows/${workflowId}`);
}
