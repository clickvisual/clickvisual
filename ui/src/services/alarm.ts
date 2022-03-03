import { request } from "umi";
import { TimeBaseType } from "@/services/systemSetting";

export interface AlarmsResponse {
  did?: number;
  tid?: number;
  name?: string;
  current: number;
  pageSize: number;
}
export interface AlarmType extends TimeBaseType {
  tid: number;
  uuid: string;
  alarmName: string;
  desc: string;
  interval: number;
  unit: number;
  alertRule: string;
  view: string;
  id: number;
  tag: any;
  uid: number;
}

export interface AlarmFilterType extends TimeBaseType {
  tid: number;
  alarmId: number;
  when: string;
  typ: number;
  exp: string;
  id: number;
}

export interface AlarmConditionType extends TimeBaseType {
  alarmId: number;
  typ: number;
  exp: number;
  cond: number;
  val1: number;
  val2: number;
  id: number;
}

export interface AlarmInfoType extends AlarmType {
  id: number;
  filters: AlarmFilterType[];
  conditions: AlarmConditionType[];
}

export interface AlarmRequest {
  alarmName: string;
  type: number;
  filters: AlarmFilterType[];
  conditions: AlarmInfoType[];
  desc: string;
  interval: number;
  unit: number;
}

export default {
  async getAlarmList(params: AlarmsResponse) {
    return request<API.Res<AlarmType[]>>(`/api/v1/alarms`, {
      method: "GET",
      params,
    });
  },
  async getAlarmInfo(id: number) {
    return request<API.Res<AlarmInfoType>>(`/api/v1/alarms/${id}`, {
      method: "GET",
    });
  },
  async createdAlarm(data: AlarmRequest) {
    return request<API.Res<string>>(`/api/v1/alarms`, { method: "POST", data });
  },
  async updatedAlarm(id: number, data: AlarmRequest) {
    return request<API.Res<string>>(`/api/v1/alarms/${id}`, {
      method: "PATCH",
      data,
    });
  },
  async deletedAlarm(id: number) {
    return request<API.Res<string>>(`/api/v1/alarms/${id}`, {
      method: "DELETE",
    });
  },
};
