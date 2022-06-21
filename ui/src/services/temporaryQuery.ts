import { request } from "umi";

export default {
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

  // POST  runCode Node
  async runCodekNode(id: number) {
    return request(process.env.PUBLIC_PATH + `api/v1/bigdata/nodes/${id}/run`, {
      method: "POST",
    });
  },
};
