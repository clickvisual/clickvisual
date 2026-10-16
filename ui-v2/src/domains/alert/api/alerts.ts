import { client, type RequestOptions } from "../../../shared/http/client";
import { getV2BasePath } from "../../../shared/layout/VersionSwitcher";
import type { QueryLogsResponse } from "../../query/types/contracts";

export interface AlarmCondition { typ: number; exp: number; cond: number; val1: number; val2: number }
export interface AlarmFilter {
  id?: number; tid: number; tableName?: string; when: string; mode: number; typ: number; exp: string;
  conditions: AlarmCondition[];
}
export interface AlarmPayload {
  alarmName: string; desc: string; interval: number; unit: number; level: number; noDataOp: number;
  isDisableResolve: number; channelIds: number[]; dutyOfficers: number[]; aiCooldownSeconds: number;
  tags: Record<string, string>; filters: AlarmFilter[];
}
export interface AlarmRule extends Omit<AlarmPayload, "tags" | "filters"> {
  id: number; uuid: string; status: number; ctime: number; utime: number;
  tag?: Record<string, string>;
  user?: { nickname: string; username: string };
  nickname?: string; username?: string; filters?: AlarmFilter[];
  view?: string; alertRule?: string; viewDDLs?: Record<string, string>; alertRules?: Record<string, string>;
  relatedList?: Array<{
    instance: { id: number; name: string; desc?: string };
    table: { id: number; name: string; desc?: string; database: { id: number; name: string } };
  }>;
}
export interface AlarmHistory { id: number; alarmId: number; isPushed: number; ctime: number }
export const ALARM_STATUSES = [
  { value: 1, label: "已暂停" }, { value: 2, label: "正常" },
  { value: 3, label: "告警中" }, { value: 4, label: "配置异常" }
];
export const ALARM_LEVELS = ["告警", "通知", "严重"];
export const ALARM_UNITS = ["分钟", "秒", "小时", "天", "周"];

function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") search.set(key, String(value)); });
  return search.toString();
}
export function listAlarmRules(params: Record<string, string | number | undefined>, options?: RequestOptions) {
  return client.getPage<AlarmRule[] | null>(`/api/v1/alarms?${queryString(params)}`, options);
}
export function getAlarmRule(id: number, options?: RequestOptions) {
  return client.get<AlarmRule>(`/api/v1/alarms/${id}`, options);
}
export function createAlarmRule(payload: AlarmPayload) { return client.post<void>("/api/v1/alarms", payload); }
export function updateAlarmRule(id: number, payload: AlarmPayload | { status: number }) { return client.patch<void>(`/api/v1/alarms/${id}`, payload); }
export function deleteAlarmRule(id: number) { return client.delete<void>(`/api/v1/alarms/${id}`); }
export function listAlarmHistory(id: number, params: Record<string, string | number | undefined>, options?: RequestOptions) {
  return client.getPage<{ total: number; succ: number; list: AlarmHistory[] | null }>(
    `/api/v1/alarms-histories?${queryString({ ...params, alarmId: id })}`, options);
}
export function previewAlarmFilter(filter: AlarmFilter, start: number, end: number, page: number, alarmMode?: number, options?: RequestOptions) {
  return client.get<QueryLogsResponse>(`/api/v1/tables/${filter.tid}/logs?${queryString({ st: start, et: end, query: filter.when, page, pageSize: 20, alarmMode })}`, options);
}
export function alarmQueryHref(filter: AlarmFilter, start?: number, end?: number) {
  return `${getV2BasePath()}/v2/query?${queryString({ tid: filter.tid, query: filter.when, start, end })}`;
}
export function filterSignature(filter: AlarmFilter) { return JSON.stringify([filter.tid, filter.mode, filter.when]); }
export function alarmDraft(rule?: AlarmRule): AlarmPayload {
  return {
    alarmName: rule?.alarmName ?? "", desc: rule?.desc ?? "", interval: rule?.interval ?? 1,
    unit: rule?.unit ?? 0, level: rule?.level ?? 0, noDataOp: rule?.noDataOp ?? 0,
    isDisableResolve: rule?.isDisableResolve ?? 0, channelIds: rule?.channelIds ?? [],
    dutyOfficers: rule?.dutyOfficers ?? [], aiCooldownSeconds: rule?.aiCooldownSeconds ?? 0,
    tags: { ...rule?.tag }, filters: (rule?.filters ?? []).map((filter) => ({
      ...filter, exp: filter.exp ?? "", conditions: filter.conditions?.map((condition) => ({ ...condition })) ?? []
    }))
  };
}
