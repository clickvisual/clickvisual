import { client } from "../../../shared/http/client";

export type SettingsDatasourceKind = "ch" | "databend" | "agent";

export interface SettingsDatasourceItem {
  id: number;
  name: string;
  datasource: SettingsDatasourceKind | string;
  desc: string;
  clusters: string[];
  clusterInfo: string[];
  mode: number;
  error: string;
}

export interface SettingsDatasourceDetail {
  id: number;
  name: string;
  datasource: SettingsDatasourceKind | string;
  dsn: string;
  desc: string;
  clusterId?: number;
  namespace?: string;
  configmap?: string;
  prometheusTarget?: string;
}

export interface SettingsDatasourcePayload {
  name: string;
  datasource: SettingsDatasourceKind | string;
  dsn: string;
  desc: string;
}

export interface SettingsDatasourceTestPayload {
  datasource: SettingsDatasourceKind | string;
  dsn: string;
}

export interface SettingsAlarmChannel {
  id: number;
  name: string;
  key: string;
  typ: number;
  uid: number;
}

export interface SettingsAlarmChannelPayload {
  name: string;
  key: string;
  typ: number;
}

export interface SettingsAIConfig {
  enabled: boolean;
  baseURL: string;
  model: string;
  timeoutSeconds: number;
  maxInputBytes: number;
  defaultTemperature: number;
  defaultMaxTokens: number;
  hasApiKey: boolean;
  apiKeyMasked: string;
}

export interface SettingsAIConfigPayload {
  enabled: boolean;
  baseURL: string;
  apiKey: string;
  model: string;
  timeoutSeconds: number;
  maxInputBytes: number;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

export interface SettingsAIConfigTestResult {
  ok: boolean;
  message: string;
  model: string;
}

export interface SettingsQueryToken {
  id: number;
  name: string;
  token?: string;
  tokenPrefix: string;
  status: number;
  expireAt: number;
  lastUsedAt: number;
  createdBy: number;
  desc: string;
  ctime: number;
  utime: number;
  tableIds: number[];
}

export interface SettingsQueryTokenCreatePayload {
  name: string;
  desc: string;
  expireAt: number;
  tableIds: number[];
}

export interface SettingsQueryTokenUpdatePayload {
  name: string;
  desc: string;
  status: number;
  expireAt: number;
}

export interface SettingsQueryTokenGrantPayload {
  tableIds: number[];
}

export interface SettingsQueryTokenAudit {
  id: number;
  tokenId: number;
  tokenName: string;
  tid: number;
  databaseName: string;
  tableName: string;
  queryJson: string;
  st: number;
  et: number;
  page: number;
  pageSize: number;
  resultCount: number;
  costMs: number;
  status: string;
  errorMessage: string;
  clientIp: string;
  userAgent: string;
  ctime: number;
}

export async function syncSystemSchema(): Promise<string> {
  return client.post<string>("/api/v2/base/system/schema-sync", {});
}

export async function listSettingsDatasources(): Promise<SettingsDatasourceItem[]> {
  return client.get<SettingsDatasourceItem[]>("/api/v2/base/settings/instances");
}

export async function getSettingsDatasource(
  instanceId: number
): Promise<SettingsDatasourceDetail> {
  return client.get<SettingsDatasourceDetail>(
    `/api/v2/base/settings/instances/${instanceId}`
  );
}

export async function createSettingsDatasource(
  payload: SettingsDatasourcePayload
): Promise<void> {
  await client.post<void>("/api/v2/base/settings/instances", payload);
}

export async function updateSettingsDatasource(
  instanceId: number,
  payload: SettingsDatasourcePayload
): Promise<void> {
  await client.patch<void>(`/api/v2/base/settings/instances/${instanceId}`, payload);
}

export async function deleteSettingsDatasource(instanceId: number): Promise<void> {
  await client.delete<void>(`/api/v2/base/settings/instances/${instanceId}`);
}

export async function testSettingsDatasource(
  payload: SettingsDatasourceTestPayload
): Promise<string> {
  return client.post<string>("/api/v2/base/settings/instances/test", payload);
}

export async function listSettingsAlarmChannels(): Promise<SettingsAlarmChannel[]> {
  return client.get<SettingsAlarmChannel[]>("/api/v2/base/settings/alarm-channels");
}

export async function getSettingsAlarmChannel(
  channelId: number
): Promise<SettingsAlarmChannel> {
  return client.get<SettingsAlarmChannel>(
    `/api/v2/base/settings/alarm-channels/${channelId}`
  );
}

export async function createSettingsAlarmChannel(
  payload: SettingsAlarmChannelPayload
): Promise<void> {
  await client.post<void>("/api/v2/base/settings/alarm-channels", payload);
}

export async function updateSettingsAlarmChannel(
  channelId: number,
  payload: SettingsAlarmChannelPayload
): Promise<void> {
  await client.patch<void>(
    `/api/v2/base/settings/alarm-channels/${channelId}`,
    payload
  );
}

export async function deleteSettingsAlarmChannel(channelId: number): Promise<void> {
  await client.delete<void>(`/api/v2/base/settings/alarm-channels/${channelId}`);
}

export async function sendSettingsAlarmChannelTest(
  payload: SettingsAlarmChannelPayload
): Promise<string> {
  return client.post<string>(
    "/api/v2/base/settings/alarm-channels/send-test",
    payload
  );
}

export async function getSettingsAIConfig(): Promise<SettingsAIConfig> {
  return client.get<SettingsAIConfig>("/api/v2/base/settings/ai");
}

export async function updateSettingsAIConfig(
  payload: SettingsAIConfigPayload
): Promise<SettingsAIConfig> {
  return client.patch<SettingsAIConfig>("/api/v2/base/settings/ai", payload);
}

export async function testSettingsAIConfig(): Promise<SettingsAIConfigTestResult> {
  return client.post<SettingsAIConfigTestResult>("/api/v2/base/settings/ai/test", {});
}

export async function listSettingsQueryTokens(): Promise<SettingsQueryToken[]> {
  return client.get<SettingsQueryToken[]>("/api/v2/query/tokens");
}

export async function createSettingsQueryToken(
  payload: SettingsQueryTokenCreatePayload
): Promise<SettingsQueryToken> {
  return client.post<SettingsQueryToken>("/api/v2/query/tokens", payload);
}

export async function updateSettingsQueryToken(
  tokenId: number,
  payload: SettingsQueryTokenUpdatePayload
): Promise<SettingsQueryToken> {
  return client.patch<SettingsQueryToken>(`/api/v2/query/tokens/${tokenId}`, payload);
}

export async function updateSettingsQueryTokenGrants(
  tokenId: number,
  payload: SettingsQueryTokenGrantPayload
): Promise<void> {
  await client.put<void>(`/api/v2/query/tokens/${tokenId}/grants`, payload);
}

export async function listSettingsQueryTokenAudits(
  tokenId: number,
  params: { current?: number; pageSize?: number } = {}
): Promise<SettingsQueryTokenAudit[]> {
  const search = new URLSearchParams();
  search.set("current", String(params.current ?? 1));
  search.set("pageSize", String(params.pageSize ?? 20));
  return client.get<SettingsQueryTokenAudit[]>(
    `/api/v2/query/tokens/${tokenId}/audits?${search.toString()}`
  );
}
