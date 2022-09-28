import { request } from "umi";

export interface getUserListType {
  current?: number;
  pageSize?: number;
  username?: string;
}

export interface createUserType {
  nickname: string | number;
  username: string | number;
}

export default {
  // Get user list
  async getUserList(params: getUserListType) {
    return request(process.env.PUBLIC_PATH + `api/v2/base/users`, {
      method: "GET",
      params,
    });
  },

  // create new user
  async createUser(data: createUserType) {
    return request(process.env.PUBLIC_PATH + `api/v2/base/users`, {
      method: "POST",
      data,
    });
  },

  // delete user
  async deleteUser(userId: number) {
    return request(process.env.PUBLIC_PATH + `api/v2/base/users/${userId}`, {
      method: "DELETE",
    });
  },

  // reset password
  async resetUserPassword(userId: number) {
    return request(
      process.env.PUBLIC_PATH + `api/v2/base/users/${userId}/password-reset`,
      {
        method: "PATCH",
      }
    );
  },
};
