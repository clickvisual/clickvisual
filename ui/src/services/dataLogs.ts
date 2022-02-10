import { request } from "umi";
import { TimeBaseType } from "@/services/systemSetting";

export interface DataSourceTableProps {
  database: string;
  iid: number;
}

export interface QueryLogsProps {
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
  keys: IndexInfoType[];
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
  // databaseName: string;
  // instanceId: number;
  // instanceName: string;
  datasourceType: string;
  id: number;
  iid: number;
  name: string;
  uid?: number;
}

export interface TablesResponse {
  id: number;
  tableName: string;
}

export interface TableInfoResponse {
  brokers: string;
  days: number;
  did: number;
  name: string;
  sqlContent: TableSqlContent;
  topic: string;
  typ: number;
  uid: number;
}

export interface TableSqlContent {
  keys: string[];
  data: any;
}

export interface InstanceSelectedType {
  iid: number;
}

export interface IndexInfoType {
  id: number;
  tid: number;
  field: string;
  alias: string;
  typ: number;
}

export interface IndexRequest {
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
  async getHighCharts(
    tableId: number,
    params: QueryLogsProps,
    cancelToken: any
  ) {
    return request<API.Res<HighChartsResponse>>(
      `/api/v1/tables/${tableId}/charts`,
      {
        cancelToken,
        method: "GET",
        params,
        skipErrorHandler: true,
      }
    );
  },

  // Get log information
  async getLogs(tableId: number, params: QueryLogsProps, cancelToken: any) {
    return request<API.Res<LogsResponse>>(`/api/v1/tables/${tableId}/logs`, {
      cancelToken,
      method: "GET",
      params,
      skipErrorHandler: true,
    });
  },

  // Get a list of log stores
  async getTableList(did: number) {
    return request<API.Res<TablesResponse[]>>(
      `/api/v1/databases/${did}/tables`,
      {
        method: "GET",
      }
    );
  },

  // Create a log library
  async createdTable(did: number, data: CreatedLogLibraryRequest) {
    return request<API.Res<string>>(`/api/v1/databases/${did}/tables`, {
      method: "POST",
      data,
    });
  },

  // Deleting a Log Library
  async deletedTable(id: number) {
    return request<API.Res<string>>(`/api/v1/tables/${id}`, {
      method: "DELETE",
    });
  },

  // Get log library details
  async getTableInfo(id: number) {
    return request<API.Res<TableInfoResponse>>(`api/v1/tables/${id}`, {
      method: "GET",
    });
  },

  // Get a list of databases
  async getDatabaseList(payload: InstanceSelectedType | undefined) {
    return request<API.Res<DatabaseResponse[]>>(
      `/api/v1/instances/${payload?.iid || 0}/databases`,
      {
        method: "GET",
      }
    );
  },

  // Get index details
  async getIndexDetail(tid: number, id: number) {
    return request<API.Res<IndexDetail[]>>(
      `/api/v1/tables/${tid}/indexes/${id}`,
      {
        method: "GET",
      }
    );
  },

  // Add or modify index
  async setIndexes(tid: number, data: IndexRequest) {
    return request<API.Res<string>>(`/api/v1/tables/${tid}/indexes`, {
      method: "PATCH",
      data,
    });
  },

  // Get Index Edit List
  async getIndexes(tid: number) {
    return request<API.Res<IndexInfoType[]>>(`/api/v1/tables/${tid}/indexes`, {
      method: "GET",
    });
  },

  // Obtain log configuration rules
  async getViews(tid: number) {
    return request<API.Res<ViewResponse[]>>(`/api/v1/tables/${tid}/views`, {
      method: "GET",
    });
  },
  // Create a log configuration rule
  async createdView(tid: number, data: CreatedViewRequest) {
    return request<API.Res<string>>(`/api/v1/tables/${tid}/views`, {
      method: "POST",
      data,
    });
  },

  // Update log configuration rules
  async updatedView(id: number, data: CreatedViewRequest) {
    return request<API.Res<string>>(`/api/v1/views/${id}`, {
      method: "PATCH",
      data,
    });
  },

  async deletedView(id: number) {
    return request<API.Res<string>>(`/api/v1/views/${id}`, {
      method: "DELETE",
    });
  },

  // Obtain rule details
  async getViewInfo(id: number) {
    return request<API.Res<ViewInfoResponse>>(`/api/v1/views/${id}`, {
      method: "GET",
    });
  },
};
