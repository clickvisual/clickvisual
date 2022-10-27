import { request } from "umi";

export interface PatchAlarmConfigType {
  clusterId?: number;
  ruleStoreType?: number;
  configmap?: string;
  filePath?: string;
  namespace?: string;
  prometheusTarget?: string;
}

export async function getAlarmConfigList() {
  return request(process.env.PUBLIC_PATH + `api/v2/alert/settings`, {
    method: "GET",
  });
}

export async function getAlarmConfigDetails(iid: number) {
  return request(process.env.PUBLIC_PATH + `api/v2/alert/settings/${iid}`, {
    method: "GET",
  });
}

export async function patchAlarmConfigDetails(
  iid: number,
  data: PatchAlarmConfigType
) {
  return request(process.env.PUBLIC_PATH + `api/v2/alert/settings/${iid}`, {
    method: "PATCH",
    data,
  });
}
