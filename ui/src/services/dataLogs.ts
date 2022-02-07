import { request } from "umi";
import { TimeBaseType } from "@/services/systemSetting";

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

export interface ViewResponse {
  id: number;
  viewName: string;
}
export interface CreatedLogLibraryRequest {
  tableName: string;
  typ: number;
  days: number;
  brokers: string;
  topics: string;
}

export interface CreatedViewRequest {
  id?: number;
  viewName: string;
  isUseDefaultTime: number;
  key?: string;
  format?: string;
}

export interface ViewInfoResponse extends TimeBaseType {
  id: number;
  uid: number;
  tid: number;
  name: string;
  isUseDefaultTime: number;
  key: string;
  format: string;
  sql_view: string;
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
  // Get chart information
  async getHighCharts(params: QueryLogsProps, cancelToken: any) {
    return request<API.Res<HighChartsResponse>>(`/api/v1/query/charts`, {
      cancelToken,
      method: "GET",
      params,
      skipErrorHandler: true,
    });
  },

  // Get log information
  async getLogs(params: QueryLogsProps, cancelToken: any) {
    return request<API.Res<LogsResponse>>(`/api/v1/query/logs`, {
      cancelToken,
      method: "GET",
      params,
      skipErrorHandler: true,
    });
  },

  // Get a list of log stores
  async getTableList(params: DataSourceTableProps) {
    return request<API.Res<string[]>>(`/api/v1/query/tables`, {
      method: "GET",
      params,
    });
  },

  // Create a log library
  async createdTable(iid: number, db: string, data: CreatedLogLibraryRequest) {
    return request<API.Res<string>>(
      `/api/v1/query/instances/${iid}/databases/${db}/tables`,
      {
        method: "POST",
        data,
      }
    );
  },

  // Deleting a Log Library
  async deletedTable(iid: number, db: string, table: string) {
    return request<API.Res<string>>(
      `/api/v1/query/instances/${iid}/databases/${db}/tables/${table}`,
      { method: "DELETE" }
    );
  },

  // Get a list of databases
  async getDatabaseList(payload: InstanceSelectedType | undefined) {
    return request<API.Res<DatabaseResponse[]>>(`/api/v1/query/databases`, {
      method: "GET",
      params: { iid: payload?.iid },
    });
  },

  // Get index details
  async getIndexDetail(params: IndexDetailRequest) {
    return request<API.Res<IndexDetail[]>>(`/api/v1/query/indexes`, {
      method: "GET",
      params,
    });
  },

  // Add or modify index
  async setIndexes(data: IndexRequest) {
    return request<API.Res<string>>(`/api/v1/setting/indexes`, {
      method: "PATCH",
      data,
    });
  },

  // Get Index Edit List
  async getIndexes(params: IndexRequest) {
    return request<API.Res<IndexInfoType[]>>(`/api/v1/setting/indexes`, {
      method: "GET",
      params,
    });
  },

  // Obtain log configuration rules
  async getViews(iid: number, db: string, table: string) {
    return request<API.Res<ViewResponse[]>>(
      `/api/v1/query/instances/${iid}/databases/${db}/tables/${table}/views`,
      { method: "GET" }
    );
  },
  // Create a log configuration rule
  async createdView(
    iid: number,
    db: string,
    table: string,
    data: CreatedViewRequest
  ) {
    return request<API.Res<string>>(
      `/api/v1/query/instances/${iid}/databases/${db}/tables/${table}/views`,
      { method: "POST", data }
    );
  },

  // Update log configuration rules
  async updatedView(id: number, data: CreatedViewRequest) {
    return request<API.Res<string>>(`/api/v1/query/views/${id}`, {
      method: "PATCH",
      data,
    });
  },

  async deletedView(id: number) {
    return request<API.Res<string>>(`/api/v1/query/views/${id}`, {
      method: "DELETE",
    });
  },

  // Obtain rule details
  async getViewInfo(id: number) {
    return request<API.Res<ViewInfoResponse>>(`/api/v1/query/views/${id}`, {
      method: "GET",
    });
  },
};
