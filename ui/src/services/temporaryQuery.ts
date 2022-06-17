import { request } from "umi";

export interface folderListType extends nodeListType {
  id: number;
  children: any[];
  desc: string;
  name: string;
  nodes: any[];
  parentId: number;
}

export interface nodeListType {
  desc: string;
  folderId: number;
  id: number;
  iid: number;
  lockAt: number;
  lockUid: number;
  name: string;
  primagry: number;
  secondary: number;
  tertiary: number;
  uid: number;
}

export default {
  /**
   * Folder
   */
  // Get Folder information
  async getFolderList(params: {
    iid: number;
    primary: number;
    secondary: number;
  }) {
    return request<any>(process.env.PUBLIC_PATH + `api/v1/bigdata/nodes`, {
      params,
    });
  },

  // POST create Folder
  async createdFolder(data: {
    iid: number;
    name: string;
    primary: number;
    desc?: string;
    parentId?: number;
    secondary: number;
  }) {
    return request(process.env.PUBLIC_PATH + `api/v1/bigdata/folders`, {
      method: "POST",
      data,
    });
  },

  // DEL delete Folder
  async deleteFolder(id: number) {
    return request(process.env.PUBLIC_PATH + `api/v1/bigdata/folders/${id}`, {
      method: "DELETE",
    });
  },

  // PATCH Update Folder
  async updateFolder(
    id: number,
    data: { name: string; desc: string; parentId: number }
  ) {
    return request(process.env.PUBLIC_PATH + `api/v1/bigdata/folders/${id}`, {
      method: "PATCH",
      data,
    });
  },

  /**
   * Node
   */
  // POST New Node
  async createdNode(data: {
    primary: number;
    secondary: number; // 1 数据库
    tertiary: number; // 1 clickhouse
    iid: number;
    name: string;
    content: string;
    desc?: string;
    folderId?: number;
  }) {
    return request(process.env.PUBLIC_PATH + `api/v1/bigdata/nodes`, {
      method: "POST",
      data,
    });
  },

  // PATCH Update Node
  async updateNode(
    id: number,
    data: { name: string; content: string; desc?: string; folderId?: number }
  ) {
    return request(process.env.PUBLIC_PATH + `api/v1/bigdata/nodes/${id}`, {
      method: "PATCH",
      data,
    });
  },

  // GET Node Info
  async getNodeInfo(id: number) {
    return request(process.env.PUBLIC_PATH + `api/v1/bigdata/nodes/${id}`, {
      method: "GET",
    });
  },

  // DEL delete Node
  async deleteNode(id: number) {
    return request(process.env.PUBLIC_PATH + `api/v1/bigdata/nodes/${id}`, {
      method: "DELETE",
    });
  },

  // PATCH Lock Node
  async lockNode(id: number) {
    return request(
      process.env.PUBLIC_PATH + `api/v1/bigdata/nodes/${id}/lock`,
      {
        method: "PATCH",
      }
    );
  },

  // PATCH  UnLock Node
  async unLockNode(id: number) {
    return request(
      process.env.PUBLIC_PATH + `api/v1/bigdata/nodes/${id}/unlock`,
      {
        method: "PATCH",
      }
    );
  },
};
