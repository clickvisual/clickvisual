import { request } from "umi";

interface BusinessChartRequest {
  iid: number;
  dn: string;
  tn: string;
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
  async getBusinessChart({ iid, dn, tn }: BusinessChartRequest) {
    return request<API.Res<BusinessChartResponse[]>>(
      process.env.PUBLIC_PATH +
        `api/v1/instances/${iid}/databases/${dn}/tables/${tn}/deps`,
      {
        method: "GET",
      }
    );
  },
};
