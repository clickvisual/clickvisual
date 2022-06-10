import { request } from "umi";
// import { TimeBaseType } from "@/services/systemSetting";

export default {
  // Get chart information
  async getFolderList() {
    return request<any>(
      process.env.PUBLIC_PATH + `api/v1/bigdata/short/folders`
    );
  },
};
