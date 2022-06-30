import { request } from "umi";

export interface SourceInfoType extends CreateSourceType {
  id: number;
  ctime: number;
  utime: number;
}

export interface CreateSourceType extends UpdateSourceType {
  iid: number;
}

export interface UpdateSourceType {
  name: string;
  desc: string;
  url: string;
  username: string;
  password: string;
  typ: number;
}

export default {
  // Get Source List
  async getSourceList(params: { iid: number; typ?: number }) {
    return request<any>(process.env.PUBLIC_PATH + `api/v1/bigdata/sources`, {
      params,
    });
  },

  // Get Source Info
  async getSourceInfo(id: number) {
    return request<any>(
      process.env.PUBLIC_PATH + `api/v1/bigdata/sources/${id}`
    );
  },

  // POST Source Create
  async createSource(data: CreateSourceType) {
    return request<any>(process.env.PUBLIC_PATH + `api/v1/bigdata/sources`, {
      method: "POST",
      data,
    });
  },

  // PATCH Sources Update
  async updateSource(id: number, data: UpdateSourceType) {
    return request<any>(
      process.env.PUBLIC_PATH + `api/v1/bigdata/sources/${id}`,
      {
        method: "PATCH",
        data,
      }
    );
  },

  // DELETE Sources Delete
  async deleteSource(id: number) {
    return request<any>(
      process.env.PUBLIC_PATH + `api/v1/bigdata/sources/${id}`,
      {
        method: "DELETE",
      }
    );
  },
};
