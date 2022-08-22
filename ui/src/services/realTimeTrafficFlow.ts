import { request } from "umi";

interface BusinessChartRequest {
  databaseName: string;
  tableName: string;
}

export interface BusinessChartResponse {
  database: string;
  deps: string[];
  engine: string;
  table: string;
  totalBytes: number;
  totalRows: number;
}

export default {
  async getDataBaseList(iid: number) {
    return request<API.Res<string[]>>(
      process.env.PUBLIC_PATH +
        `api/v1/bigdata/mining/instances/${iid}/databases`,
      {
        method: "GET",
      }
    );
  },

  async getTableList(iid: number, params: { database: string }) {
    return request<API.Res<string[]>>(
      process.env.PUBLIC_PATH + `api/v1/bigdata/mining/instances/${iid}/tables`,
      {
        method: "GET",
        params,
      }
    );
  },

  async getBusinessChart(iid: number, params: BusinessChartRequest) {
    return request<API.Res<{ data: BusinessChartResponse[]; utime: number }>>(
      process.env.PUBLIC_PATH +
        // `api/v1/instances/${iid}/databases/${dn}/tables/${tn}/deps`,
        `api/v2/pandas/instances/${iid}/table-dependencies`,
      {
        method: "GET",
        params,
      }
    );
  },
};
