import { request } from "umi";
import { TimeBaseType } from "@/services/systemSetting";
import { ChannelFormType } from "@/pages/Alarm/Notifications/components/ChannelFormItems";

export interface AlarmsResponse {
  did?: number;
  tid?: number;
  name?: string;
  status?: number;
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
  channelIds: number[];
  status: number;
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

export interface AlarmInfoType extends AlarmType, TimeBaseType {
  id: number;
  filters: AlarmFilterType[];
  conditions: AlarmConditionType[];
  channelIds: number[];
  access: string;
  avatar: string;
  currentAuthority: string;
  email: string;
  hash: string;
  nickname: string;
  oa_id: number;
  oauth: string;
  oauthId: string;
  password: string;
  secret: string;
  state: string;
  username: string;
  webUrl: string;
  table: any;
  instance: any;
}

export interface AlarmRequest {
  alarmName: string;
  type: number;
  filters: AlarmFilterType[];
  conditions: AlarmConditionType[];
  channelIds: number[];
  desc: string;
  interval: number;
  unit: number;
}

export interface ChannelType extends TimeBaseType {
  id: number;
  key: string;
  name: string;
  typ: number;
  uid: number;
}

export interface AlarmHistoryRequest {
  alarmId?: number;
  startTime?: number;
  endTime?: number;
  current?: number;
  pageSize?: number;
}

export interface AlarmHistoryType extends TimeBaseType {
  alarmId: number;
  isPushed: number;
  id: number;
}

export interface AlarmHistoriesResponse {
  total: number;
  succ: number;
  list: AlarmHistoryType[];
  pagination: API.Pagination;
}

export default {
  async getAlarmList(params: AlarmsResponse) {
    return request<API.Res<AlarmType[]>>(process.env.PUBLIC_PATH+`api/v1/alarms`, {
      method: "GET",
      params,
    });
  },
  async getAlarmInfo(id: number) {
    return request<API.Res<AlarmInfoType>>(process.env.PUBLIC_PATH+`api/v1/alarms/${id}`, {
      method: "GET",
    });
  },
  async createdAlarm(data: AlarmRequest) {
    return request<API.Res<string>>(process.env.PUBLIC_PATH+`api/v1/alarms`, { method: "POST", data });
  },
  async updatedAlarm(id: number, data: AlarmRequest | { status: number }) {
    return request<API.Res<string>>(process.env.PUBLIC_PATH+`api/v1/alarms/${id}`, {
      method: "PATCH",
      data,
    });
  },
  async deletedAlarm(id: number) {
    return request<API.Res<string>>(process.env.PUBLIC_PATH+`api/v1/alarms/${id}`, {
      method: "DELETE",
    });
  },

  async getChannels() {
    return request<API.Res<ChannelType[]>>(process.env.PUBLIC_PATH+`api/v1/alarms-channels`, {
      method: "GET",
    });
  },

  async getChannelInfo(id: number) {
    return request(process.env.PUBLIC_PATH+`api/v1/alarms-channels/${id}`, { method: "GET" });
  },

  async getAlarmHistories(params: AlarmHistoryRequest) {
    return request<API.ResPageData<AlarmHistoriesResponse>>(
      process.env.PUBLIC_PATH+`api/v1/alarms-histories`,
      { method: "GET", params }
    );
  },

  async createdChannel(data: ChannelFormType) {
    return request<API.Res<string>>(process.env.PUBLIC_PATH+`api/v1/alarms-channels`, {
      method: "POST",
      data,
    });
  },

  async updatedChannel(id: number, data: ChannelFormType) {
    return request<API.Res<string>>(process.env.PUBLIC_PATH+`api/v1/alarms-channels/${id}`, {
      method: "PATCH",
      data,
    });
  },

  async deletedChannel(id: number) {
    return request<API.Res<ChannelType>>(process.env.PUBLIC_PATH+`api/v1/alarms-channels/${id}`, {
      method: "DELETE",
    });
  },
};
