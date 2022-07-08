import { request } from "@@/plugin-request/request";
import { TimeBaseType } from "@/services/systemSetting";

export interface FolderListRequest {
  iid: number;
  primary: number;
  secondary?: number;
  folderId?: number;
  workflowId?: number;
}

export interface FolderListResponse {
  children: any[];
  desc: string;
  id: number;
  name: string;
  nodes: NodeInfo[];
  parentId: number;
}

export interface NodeInfo extends TimeBaseType {
  desc: string;
  folderId: number;
  id: number;
  iid: number;
  lockAt: number;
  lockUid: number;
  name: string;
  primary: number;
  secondary: number;
  tertiary: number;
  uid: number;
  workflowId: number;
}

export interface folderListType extends nodeListType {
  workflowId: any;
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

export interface nodeHistoriesType {
  current: number;
  pageSize: number;
}

export default {
  /**
   * Folder
   */
  // Get Folder information
  async getFolderList(params: FolderListRequest) {
    return request<API.Res<FolderListResponse>>(
      process.env.PUBLIC_PATH + `api/v1/bigdata/nodes`,
      {
        params,
      }
    );
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
    secondary: number;
    tertiary?: number;
    iid: number;
    name: string;
    content?: string;
    desc?: string;
    folderId?: number;
    workflowId?: number;
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

  // POST  runCode Node
  async runCodeNode(id: number) {
    return request(process.env.PUBLIC_PATH + `api/v1/bigdata/nodes/${id}/run`, {
      method: "POST",
    });
  },

  async stopCodeNode(id: number) {
    return request(
      process.env.PUBLIC_PATH + `api/v1/bigdata/nodes/${id}/stop`,
      {
        method: "POST",
      }
    );
  },

  // 获取历史记录的list
  async getNodeHistories(noodeId: number, params?: nodeHistoriesType) {
    // return request<API.Res<FolderListResponse>>(
    return request(
      process.env.PUBLIC_PATH + `api/v1/bigdata/nodes/${noodeId}/histories`,
      {
        params,
      }
    );
  },

  // 获取历史记录info
  async getNodeHistoriesInfo(noodeId: number, uuid: number) {
    // return request<API.Res<FolderListResponse>>(
    return request(
      process.env.PUBLIC_PATH +
        `api/v1/bigdata/nodes/${noodeId}/histories/${uuid}`
    );
  },

  // /bigdata/nodes/:id/histories/:uuid
};
