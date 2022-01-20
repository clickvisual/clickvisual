import { request } from "umi";

export interface DataSourceTableProps {
  database: string;
  iid: number;
}

export interface QueryLogsProps extends DataSourceTableProps {
  table: string;
  st: number;
  et: number;
  query?: string | undefined;
  pageSize?: number;
  page?: number;
}

export interface LogsResponse {
  aggQueryd: string;
  count: number;
  cpuCore: number;
  cpuSec: number;
  elapsedMillisecond: number;
  hasSQL: boolean;
  keys: string[];
  limited: number;
  logs: any[];
  marker: string;
  processedRows: number;
  progress: string;
  terms: string[][];
  whereQuery: string;
}

export interface HighChartsResponse {
  count: number;
  progress: string;
  histograms: HighCharts[];
}

export interface HighCharts {
  count: number;
  from: number;
  to: number;
  progress: string;
}

export interface DatabaseResponse {
  databaseName: string;
  instanceId: number;
  instanceName: string;
  datasourceType: string;
}

export interface InstanceSelectedType {
  iid: number;
}

export interface IndexInfoType {
  field: string;
  alias: string;
  typ: number;
}

export interface IndexRequest {
  iid: number;
  database: string;
  table: string;
  data?: IndexInfoType[];
}

export interface IndexDetailRequest extends DataSourceTableProps {
  table: string;
  st: number;
  et: number;
  field: string;
  query?: string | undefined;
}

export interface IndexDetail {
  count: number;
  indexName: string;
  percent: number;
}

export default {
  // 获取海图信息
  async getHighCharts(params: QueryLogsProps, cancelToken: any) {
    return request<API.Res<HighChartsResponse>>(`/api/v1/query/charts`, {
      cancelToken,
      method: "GET",
      params,
      skipErrorHandler: true,
    });
  },

  // 获取日志信息
  async getLogs(params: QueryLogsProps, cancelToken: any) {
    return request<API.Res<LogsResponse>>(`/api/v1/query/logs`, {
      cancelToken,
      method: "GET",
      params,
      skipErrorHandler: true,
    });
  },

  // 获取日志库列表
  async getTableList(params: DataSourceTableProps) {
    return request<API.Res<string[]>>(`/api/v1/query/tables`, {
      method: "GET",
      params,
    });
  },

  // 获取数据库列表
  async getDatabaseList(payload: InstanceSelectedType | undefined) {
    return request<API.Res<DatabaseResponse[]>>(`/api/v1/query/databases`, {
      method: "GET",
      params: { iid: payload?.iid },
    });
  },

  // 获取索引详情
  async getIndexDetail(params: IndexDetailRequest) {
    return request<API.Res<IndexDetail[]>>(`/api/v1/query/indexes`, {
      method: "GET",
      params,
    });
  },

  // 增加 or 修改索引
  async setIndexes(data: IndexRequest) {
    return request<API.Res<string>>(`/api/v1/setting/indexes`, {
      method: "PATCH",
      data,
    });
  },

  // 获取索引编辑列表
  async getIndexes(params: IndexRequest) {
    return request<API.Res<IndexInfoType[]>>(`/api/v1/setting/indexes`, {
      method: "GET",
      params,
    });
  },
};
