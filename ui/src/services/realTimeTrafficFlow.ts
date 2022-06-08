import { request } from "umi";

interface TrafficChartRequest {
  iid: number;
  dn: string;
  tn: string;
}

export default {
  async getTrafficChart({ iid, dn, tn }: TrafficChartRequest) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH +
        `api/v1/instances/${iid}/databases/${dn}/tables/${tn}/deps`,
      {
        method: "GET",
      }
    );
  },
};
