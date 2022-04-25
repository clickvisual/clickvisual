import { request } from "umi";
import { stringify } from "qs";
import { PermissionCheck, ReqPmsRoleGrantInfoParam } from "@/models/pms";
import { API } from "@/services/API";

export interface PmsGrantRes {
  aid: number;
  roles: PmsRole[];
}

export interface PmsRole {
  id: number;
  name: string;
  roleType: number;
  desc: string;
  details: PmsRoleDetail[];
  grant: PmsGrant[];
}

export interface PmsRoleDetail {
  acts: string[];
  sub_resources: string[];
}

export interface PmsGrant {
  created: 1;
  domain: string[];
  userIds: number[];
}

export async function reqRootUids() {
  return request(process.env.PUBLIC_PATH + `api/v1/pms/root/uids`);
}

export async function reqGrantRootUids(params: any) {
  return request(process.env.PUBLIC_PATH + "api/v1/pms/root/grant", {
    method: "POST",
    data: { ...params },
  });
}

export async function CheckPermission(params: PermissionCheck) {
  return request(process.env.PUBLIC_PATH + "api/v1/pms/check", {
    method: "POST",
    data: { ...params },
  });
}

export async function CheckRoot() {
  return request(process.env.PUBLIC_PATH + "api/v1/pms/check", {
    method: "POST",
    data: { objectType: "root" },
  });
}

export async function reqPmsCommonInfo() {
  return request(process.env.PUBLIC_PATH + `api/v1/pms/commonInfo`);
}

export async function reqGetPmsRole(roleId: number) {
  return request(process.env.PUBLIC_PATH + `api/v1/pms/role/${roleId}`, {
    method: "GET",
  });
}

export async function reqGetRoleList(name?: string, belongResource?: string) {
  return request(
    process.env.PUBLIC_PATH +
      `api/v1/pms/role?name=${name}&belongResource=${belongResource}`,
    {
      method: "GET",
    }
  );
}

export async function reqDeleteRole(roleId: number) {
  return request(process.env.PUBLIC_PATH + `api/v1/pms/role/${roleId}`, {
    method: "DELETE",
  });
}

export async function reqUpdatePmsRole(roleId: number, params: any) {
  return request(process.env.PUBLIC_PATH + `api/v1/pms/role/${roleId}`, {
    method: "PUT",
    data: params,
  });
}

export async function reqCreatedPmsRole(data: any) {
  return request(process.env.PUBLIC_PATH + `api/v1/pms/role`, {
    method: "POST",
    data,
  });
}

export async function reqUpdatePmsGrant(aid: number, params: any) {
  return request(process.env.PUBLIC_PATH + `api/v1/pms/app/${aid}/role/grant`, {
    method: "PUT",
    data: params,
  });
}

export async function reqGetPmsGrant(aid: number) {
  return request<API.Res<PmsGrantRes>>(
    process.env.PUBLIC_PATH + `api/v1/pms/app/${aid}/role/grant`,
    { method: "GET" }
  );
}

export async function reqAppAvailableRoles(aid: number) {
  return request(
    process.env.PUBLIC_PATH + `api/v1/pms/appAvailableRoles?appId=${aid}`
  );
}

export async function reqPmsDefaultRoles(param: any) {
  return request(
    process.env.PUBLIC_PATH + `api/v1/pms/defaultRole/list?${stringify(param)}`
  );
}

export async function reqResourceRolesGrantInfo(
  params: ReqPmsRoleGrantInfoParam
) {
  return request(
    process.env.PUBLIC_PATH +
      `api/v1/pms/resource/role/grant?${stringify(params)}`,
    {
      method: "GET",
    }
  );
}

export async function reqAppCurrentRolesAssignInfoInAllDom(aid: any) {
  return request(
    process.env.PUBLIC_PATH + `api/v1/pms/appRoleAssign/info?appId=${aid}`
  );
}

export async function reqCreatePmsDefaultRole(params: any) {
  return request(process.env.PUBLIC_PATH + "api/v1/pms/defaultRole/create", {
    method: "POST",
    data: { ...params },
  });
}

export async function reAssignAppRoles(params: any) {
  return request(process.env.PUBLIC_PATH + "api/v1/pms/appRole/reassign", {
    method: "POST",
    data: { ...params },
  });
}
