import { request } from "umi";

interface TrafficChartRequest {
  iid: number;
  dn: string;
  tn: string;
}

export interface TrafficChartResponse {
  database: string;
  deps: string[];
  engine: string;
  table: string;
  totalBytes: bigint;
  totalRows: bigint;
}

export default {
  async getTrafficChart({ iid, dn, tn }: TrafficChartRequest) {
    return request<API.Res<TrafficChartResponse[]>>(
      process.env.PUBLIC_PATH +
        `api/v1/instances/${iid}/databases/${dn}/tables/${tn}/deps`,
      {
        method: "GET",
      }
    );
  },
};
