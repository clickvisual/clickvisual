import { request } from "umi";
import { stringify } from "qs";

export async function queryUserListWithGroupInfo(
  page = 0,
  pageSize = 10,
  groupName = "",
  search = ""
) {
  return request(
    process.env.PUBLIC_PATH +
      `api/v1/permission/user/list?${stringify({
        page,
        page_size: pageSize,
        group_name: groupName,
        search,
      })}`
  );
}

export async function queryUserGroups() {
  return request(process.env.PUBLIC_PATH + `api/v1/permission/user/group/list`);
}

export async function changeUserGroup(uid: number, groups: string[]) {
  return request(
    process.env.PUBLIC_PATH + `api/v1/permission/user/changeGroup`,
    {
      method: "POST",
      data: {
        uid,
        groups,
      },
    }
  );
}

export async function loadUserGroupMenuList(groupName: string) {
  return request(
    process.env.PUBLIC_PATH +
      `api/v1/permission/user/group/menuPermission?group_name=${groupName}`
  );
}

export async function setUserGroupMenuPerm(groupName: string, menu: string[]) {
  return request(
    process.env.PUBLIC_PATH + `api/v1/permission/user/group/setMenuPermission`,
    {
      method: "POST",
      data: {
        group_name: groupName,
        menu,
      },
    }
  );
}

export async function loadUserGroupAPIList(groupName: string) {
  return request(
    process.env.PUBLIC_PATH +
      `api/v1/permission/user/group/apiPermission?group_name=${groupName}`
  );
}

export async function loadAPITree() {
  return request(process.env.PUBLIC_PATH + `api/v1/permission/api/list`);
}

export async function setUserGroupAPIPerm(
  groupName: string,
  apiList: { path: string; method: string }[]
) {
  return request(
    process.env.PUBLIC_PATH + `api/v1/permission/user/group/setApiPermission`,
    {
      method: "POST",
      data: {
        group_name: groupName,
        api_list: apiList,
      },
    }
  );
}

export async function appPermissionList() {
  return request(process.env.PUBLIC_PATH + `api/v1/permission/appPermissions`);
}

export async function setUserGroupAppPerm(payload: {
  group_name: string;
  app_name: string;
  env: string[];
  action: string[];
}) {
  return request(
    process.env.PUBLIC_PATH + `api/v1/permission/user/group/setAppPermission`,
    {
      method: "POST",
      data: payload,
    }
  );
}

export async function fetchPermissionTree() {
  return request(process.env.PUBLIC_PATH + `api/v1/permission/permissionTree`);
}
