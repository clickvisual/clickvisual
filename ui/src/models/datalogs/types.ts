import {
  HighChartsResponse,
  IndexInfoType,
  LogsResponse,
  StatisticalTableResponse,
  TablesResponse,
} from "@/services/dataLogs";

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
  desc: string;
  histogramChecked: boolean;
  foldingChecked: boolean;
  mode?: number;
  rawLogsIndexeList?: IndexInfoType[];
  isTrace: number;
};

export enum hashType {
  noneSet = 0,
  siphash = 1,
  urlhash = 2,
}

export interface Extra {
  isPaging?: boolean; // 是否是切换页面
  isOnlyLog?: boolean;
  reqParams?: QueryParams; // 请求参数
}
