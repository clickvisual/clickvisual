import request from "@/utils/requestUtils/request";

export async function environmentalAudit() {
  return request(process.env.PUBLIC_PATH+`api/v1/install`, { method: "GET" });
}

export async function installEnv() {
  return request(process.env.PUBLIC_PATH+`api/v1/install`, { method: "POST" });
}
