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
