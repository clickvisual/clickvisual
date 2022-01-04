import request from '@/utils/requestUtils/request';

export interface UserLoginType {
  username: string;
  password: string;
}

// 账号密码登录
export async function LoginByPassword(data: UserLoginType) {
  return request(`/api/admin/users/login`, { method: 'POST', data });
}

// 获取当前用户信息
export async function FetchCurrentUserInfo() {
  return request('/api/v1/users/info', { method: 'GET' });
}

// 退出登录
export async function LoginOut() {
  return request('/api/v1/users/logout', { method: 'POST' });
}
