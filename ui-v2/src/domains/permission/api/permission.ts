import { client } from "../../../shared/http/client";

export type PermissionUser = {
  uid: number;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  avatar: string;
};

export type PermissionUserList = {
  total: number;
  list: PermissionUser[];
};

export type ListPermissionUsersParams = {
  username?: string;
  current?: number;
  pageSize?: number;
};

export type CreatePermissionUserPayload = {
  username: string;
  nickname: string;
};

export type PermissionUserPassword = {
  username: string;
  password: string;
};

export type PermissionDomainOption = {
  label: string;
  value: string;
  children?: PermissionDomainOption[];
};

export type PermissionInfoItem = {
  name: string;
  desc: string;
};

export type PermissionCommonInfo = {
  domainCascader: PermissionDomainOption[];
  prefixes_info?: PermissionInfoItem[];
  all_acts_info?: PermissionInfoItem[];
  app_subResources_info?: PermissionInfoItem[];
};

export type PermissionInstance = {
  id: number;
  name: string;
  datasource: string;
  desc: string;
  clusters: string[];
  clusterInfo: string[];
  mode: number;
  error: string;
};

export type PermissionRoleDetail = {
  sub_resources: string[];
  acts: string[];
};

export type PermissionRoleDetailItem = {
  id?: number;
  pmsRoleId?: number;
  subResources: string[];
  acts: string[];
};

export type PermissionRole = {
  id: number;
  name: string;
  desc: string;
  belongResource: string;
  roleType: number;
  resourceId: number;
  details: PermissionRoleDetailItem[];
};

export type PermissionInstanceRoleGrant = {
  created: number;
  domain: string[];
  userIds: number[];
};

export type PermissionInstanceRole = {
  id: number;
  roleType: number;
  name: string;
  desc: string;
  details: PermissionRoleDetail[];
  grant: PermissionInstanceRoleGrant[];
};

export type PermissionInstanceGrant = {
  iid: number;
  roles: PermissionInstanceRole[];
};

export type UpdatePermissionUserPayload = {
  nickname: string;
  email: string;
  phone: string;
};

export type ListPermissionRolesParams = {
  name?: string;
  belongResource?: string;
};

export type PermissionRolePayload = {
  id?: number;
  name: string;
  desc: string;
  belongResource: string;
  roleType: number;
  resourceId: number;
  details: PermissionRoleDetailItem[];
};

export type DeletePermissionRolePayload = {
  belongResource: string;
  resourceId: number;
};

export type PermissionRootUsers = {
  root_uids: number[];
};

function buildUsersQuery(params: ListPermissionUsersParams) {
  const searchParams = new URLSearchParams();

  if (params.username) {
    searchParams.set("username", params.username);
  }
  if (params.current) {
    searchParams.set("current", String(params.current));
  }
  if (params.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const query = searchParams.toString();
  return query ? `/api/v2/base/users?${query}` : "/api/v2/base/users";
}

function buildRolesQuery(params: ListPermissionRolesParams) {
  const searchParams = new URLSearchParams();

  if (params.name) {
    searchParams.set("name", params.name);
  }
  if (params.belongResource) {
    searchParams.set("belongResource", params.belongResource);
  }

  const query = searchParams.toString();
  return query ? `/api/v1/pms/role?${query}` : "/api/v1/pms/role";
}

export function listPermissionUsers(params: ListPermissionUsersParams) {
  return client.get<PermissionUserList>(buildUsersQuery(params));
}

export function createPermissionUser(payload: CreatePermissionUserPayload) {
  return client.post<PermissionUserPassword>("/api/v2/base/users", payload);
}

export function updatePermissionUser(
  userId: number,
  payload: UpdatePermissionUserPayload
) {
  return client.patch<void>(`/api/v2/base/users/${userId}`, payload);
}

export function deletePermissionUser(userId: number) {
  return client.delete<void>(`/api/v2/base/users/${userId}`);
}

export function resetPermissionUserPassword(userId: number) {
  return client.patch<PermissionUserPassword>(
    `/api/v2/base/users/${userId}/password-reset`,
    {}
  );
}

export function listPermissionInstances() {
  return client.get<PermissionInstance[]>("/api/v2/base/settings/instances");
}

export function getPermissionCommonInfo(iid = 0) {
  return client.get<PermissionCommonInfo>(`/api/v1/pms/commonInfo?iid=${iid}`);
}

export function listPermissionRoles(params: ListPermissionRolesParams) {
  return client.get<PermissionRole[]>(buildRolesQuery(params));
}

export function getPermissionRoleDetail(roleId: number) {
  return client.get<PermissionRole>(`/api/v1/pms/role/${roleId}`);
}

export function createPermissionRole(payload: PermissionRolePayload) {
  return client.post<void>("/api/v1/pms/role", payload);
}

export function updatePermissionRole(
  roleId: number,
  payload: PermissionRolePayload
) {
  return client.put<void>(`/api/v1/pms/role/${roleId}`, payload);
}

export function deletePermissionRole(
  roleId: number,
  payload: DeletePermissionRolePayload
) {
  return client.delete<void>(`/api/v1/pms/role/${roleId}`, payload);
}

export function getPermissionRootUids() {
  return client.get<PermissionRootUsers>("/api/v1/pms/root/uids");
}

export function grantPermissionRootUids(payload: PermissionRootUsers) {
  return client.post<void>("/api/v1/pms/root/grant", payload);
}

export function getPermissionInstanceGrant(instanceId: number) {
  return client.get<PermissionInstanceGrant>(
    `/api/v1/pms/instance/${instanceId}/role/grant`
  );
}

export function updatePermissionInstanceGrant(
  instanceId: number,
  payload: PermissionInstanceGrant
) {
  return client.put<void>(
    `/api/v1/pms/instance/${instanceId}/role/grant`,
    payload
  );
}
