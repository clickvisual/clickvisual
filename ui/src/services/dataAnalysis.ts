import { request } from "umi";
// import { TimeBaseType } from "@/services/systemSetting";

export interface folderListType {
  id: number;
  children: any[];
  desc: string;
  name: string;
  nodes: any[];
  parentId: number;
}

export default {
  // Get Folder information
  async getFolderList(params: { iid: number; primary: number }) {
    return request<any>(process.env.PUBLIC_PATH + `api/v1/bigdata/folders`, {
      params,
    });
  },

  // POST New Folder
  async createdFolder(data: {
    iid: number;
    name: string;
    primary: number;
    desc?: string;
    parentId?: number;
  }) {
    return request(process.env.PUBLIC_PATH + `api/v1/bigdata/folders`, {
      method: "POST",
      data,
    });
  },

  // DEL delete Folder
  async deleteFolder(id: number) {
    return request(process.env.PUBLIC_PATH + `/api/v1/bigdata/folders/${id}`);
  },

  // PAT Update Folder
  async updateFolder(
    id: number,
    data: { name: string; desc: string; parentId: number }
  ) {
    return request(process.env.PUBLIC_PATH + `/api/v1/bigdata/folders/${id}`, {
      method: "PAT",
      data,
    });
  },
};
