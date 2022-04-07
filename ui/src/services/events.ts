import { request } from "umi";

export async function getEvents(params: any) {
  return request(`/api/v1/events`, { method: "GET", params });
}

export async function getEventEnums() {
  return request(`/api/v1/event/enums`, { method: "GET" });
}

export async function getSourceOptions(source: string) {
  return request(`/api/v1/event/source/${source}/enums`, { method: "GET" });
}
