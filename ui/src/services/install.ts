import request from "@/utils/requestUtils/request";

export async function environmentalAudit() {
  return request(`/api/v1/install`, { method: "GET" });
}

export async function installEnv() {
  return request(`/api/v1/install`, { method: "POST" });
}
