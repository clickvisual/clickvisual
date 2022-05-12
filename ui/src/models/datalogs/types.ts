import {
  HighChartsResponse,
  LogsResponse,
  StatisticalTableResponse,
  TablesResponse,
} from "@/services/dataLogs";
import { QueryTypeEnum } from "@/config/config";

export interface QueryParams {
  logLibrary?: TablesResponse;
  page?: number;
  pageSize?: number;
  st?: number;
  et?: number;
  kw?: string;
}

export type PaneType = {
  pane: string;
  paneId: string;
  paneType: number;
  start?: number;
  end?: number;
  keyword?: string;
  activeTabKey?: string;
  activeIndex?: number;
  queryType?: string;
  page?: number;
  pageSize?: number;
  logs: LogsResponse | undefined;
  highCharts: HighChartsResponse | undefined;
  querySql?: string;
  logChart?: StatisticalTableResponse;
};

export enum hashType {
  siphash = 1,
  urlhash = 2,
}

export interface Extra {
  isPaging?: boolean; // 是否是切换页面
  reqParams?: QueryParams; // 请求参数
}

export const QueryTypeMenuItems = [
  {
    key: QueryTypeEnum.LOG,
    labelId: `log.queryType.menuItem.${QueryTypeEnum.LOG}`,
  },
  {
    key: QueryTypeEnum.TABLE,
    labelId: `log.queryType.menuItem.${QueryTypeEnum.TABLE}`,
  },
];
