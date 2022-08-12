import { request } from "umi";

enum TaskListTertiaryEnum {
  ClickHouse = 10,
  MySQL = 11,
  OfflineSync = 20,
}

export interface getTaskListType {
  // 总记录数
  current?: number;
  end?: number;
  start?: number;
  nodeName?: number;
  pageSize?: number;
  sort?: string;
  tertiary?: TaskListTertiaryEnum;
  total?: number;
}
export interface getDashboardType {
  end?: number;
  start?: number;
  isInCharge?: number;
}

export default {
  // The scheduled task list
  async getTaskList(params: getTaskListType) {
    return request(process.env.PUBLIC_PATH + `api/v2/pandas/workers`, {
      params,
    });
  },

  // Kanban on the execution status of a scheduled task
  async getDashboard(params: getDashboardType) {
    return request(
      process.env.PUBLIC_PATH + `api/v2/pandas/workers/dashboard`,
      {
        params,
      }
    );
  },
};
