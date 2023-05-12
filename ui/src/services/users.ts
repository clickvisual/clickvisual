// import request from "@/utils/requestUtils/request";
// TODO: 升级

import { request } from "@umijs/max";

export interface UserLoginType {
  username: string;
  password: string;
}

// 账号密码登录
export async function LoginByPassword(data: UserLoginType) {
  return request(process.env.PUBLIC_PATH + `api/admin/users/login`, {
    method: "POST",
    data,
  });
}

// 获取当前用户信息
export async function FetchCurrentUserInfo() {
  return request(process.env.PUBLIC_PATH + `api/v1/users/info`, {
    method: "GET",
  });
}

// 退出登录
export async function LoginOut() {
  return request(process.env.PUBLIC_PATH + `api/v1/users/logout`, {
    method: "POST",
  });
}

export async function ChangePassword(
  uid: number,
  data: {
    password: string;
    newPassword: string;
    confirmNew: string;
  }
) {
  return request(process.env.PUBLIC_PATH + `api/v1/users/${uid}/password`, {
    method: "PATCH",
    data,
  });
}

export function updatedDatabaseStructure() {
  return request(process.env.PUBLIC_PATH + `api/v1/migration`);
}
