import { request } from "umi";
import { TimeBaseType } from "@/services/systemSetting";

export interface BaseWorkflowPayload {
  iid: number;
}

export interface WorkflowInfo extends TimeBaseType {
  desc: string;
  id: number;
  iid: number;
  name: string;
  uid: number;
}

export interface CreatedWorkflowData extends BaseWorkflowPayload {
  name: string;
  desc: string;
}

export default {
  async getWorkflows(params: { iid: number }) {
    return request<API.Res<WorkflowInfo[]>>(
      process.env.PUBLIC_PATH + `api/v1/bigdata/mining/workflows`,
      {
        method: "GET",
        params,
      }
    );
  },

  async createdWorkflow(data: CreatedWorkflowData) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH + `api/v1/bigdata/mining/workflows`,
      {
        method: "POST",
        data,
      }
    );
  },

  async getWorkflowInfo(id: number) {
    return request<API.Res<WorkflowInfo>>(
      process.env.PUBLIC_PATH + `api/v1/bigdata/mining/workflows/${id}`,
      {
        method: "GET",
      }
    );
  },

  async updatedWorkflow(id: number, data: CreatedWorkflowData) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH + `api/v1/bigdata/mining/workflows/${id}`,
      {
        method: "PATCH",
        data,
      }
    );
  },

  async deleteWorkflow(id: number) {
    return request(
      process.env.PUBLIC_PATH + `api/v1/bigdata/mining/workflows/${id}`,
      {
        method: "DELETE",
      }
    );
  },
};
