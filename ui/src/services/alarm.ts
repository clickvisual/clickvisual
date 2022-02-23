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
export default {
  async getAlarmList(params: AlarmsResponse) {
    return request<API.Res<AlarmType[]>>(`/api/v1/alarms`, {
      method: "GET",
      params,
    });
  },
  async getAlarmInfo(id: number) {
    return request<API.Res<any>>(`/api/v1/alarms/${id}`, { method: "GET" });
  },
  async createdAlarm(data: any) {
    return request<API.Res<string>>(`/api/v1/alarms`, { method: "POST", data });
  },
  async updatedAlarm(id: number, data: any) {
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
