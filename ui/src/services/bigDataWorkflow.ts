import { request } from "umi";

export default {
  async getWorkflows(params: { iid: number }) {
    return request(
      process.env.PUBLIC_PATH + `api/v1/bigdata/mining/workflows`,
      {
        method: "GET",
        params,
      }
    );
  },

  async createdWorkflow(data: { name: string; desc: string }) {
    return request(
      process.env.PUBLIC_PATH + `api/v1/bigdata/mining/workflows`,
      {
        method: "POST",
        data,
      }
    );
  },
};
