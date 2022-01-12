import { useEffect, useRef, useState } from "react";
import copy from "copy-to-clipboard";
import { message } from "antd";
import api, {
  DatabaseResponse,
  HighCharts,
  InstanceSelectedType,
  LogsResponse,
} from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";
import { currentTimeStamp } from "@/utils/momentUtils";
import {
  ACTIVE_TIME_INDEX,
  FIFTEEN_TIME,
  FIRST_PAGE,
  MINUTES_UNIT_TIME,
  PAGE_SIZE,
  TimeRangeType,
} from "@/config/config";
import moment from "moment";
import Request, { Canceler } from "umi-request";
import lodash from "lodash";

export type PaneType = {
  pane: string;
  start: number;
  end: number;
  keyword: string | undefined;
  activeTabKey: string;
  activeIndex: number;
  page: number;
  pageSize: number;
};

export type QueryParams = {
  logLibrary?: string;
  page?: number;
  pageSize?: number;
  st?: number;
  et?: number;
  kw?: string;
};

const DataLogsModel = () => {
  // 查询关键字
  const [keywordInput, setKeywordInput] = useState<string | undefined>();
  // 是否隐藏 Highcharts
  const [isHiddenHighChart, setIsHiddenHighChart] = useState<boolean>(false);
  // 海图数据列表
  const [highChartList, setHighChartList] = useState<HighCharts[]>([]);
  // 日志信息
  const [logs, setLogs] = useState<LogsResponse | undefined>();
  // 日志开始时间
  const [startDateTime, setStartDateTime] = useState<number>();
  // 日志结束时间
  const [endDateTime, setEndDateTime] = useState<number>();
  // 分页参数

  const [pageSize, setPageSize] = useState<number>();
  const [currentPage, setCurrentPage] = useState<number>();

  // 日志库列表
  const [logLibraryList, setLogLibraryList] = useState<string[]>([]);
  const [currentLogLibrary, setCurrentLogLibrary] = useState<
    string | undefined
  >();
  const [highlightKeywords, setHighlightKeywords] = useState<
    { key: string; value: string }[] | undefined
  >();
  // 数据库列表
  const [databaseList, setDataBaseList] = useState<DatabaseResponse[]>([]);
  const [currentDatabase, setCurrentDatabase] = useState<
    DatabaseResponse | undefined
  >();

  // 是否展示日志切换抽屉
  const [visibleDataBaseDraw, setVisibleDataBaseDraw] =
    useState<boolean>(false);

  // 时间选择器
  const [activeTabKey, setActiveTabKey] = useState<string>(
    TimeRangeType.Relative
  );
  const [activeTimeOptionIndex, setActiveTimeOptionIndex] = useState(2);

  // 日志 Tab 标签
  const [logPanes, setLogPanes] = useState<PaneType[]>([]);

  // 是否展示索引列表
  const [visibleIndexModal, setVisibleIndexModal] = useState<boolean>(false);

  // 用于关闭无效请求
  const cancelTokenHighChartsRef = useRef<Canceler | null>(null);
  const cancelTokenLogsRef = useRef<Canceler | null>(null);
  const CancelToken = Request.CancelToken;

  const onChangeHiddenHighChart = (flag: boolean) => {
    setIsHiddenHighChart(flag);
  };

  const onChangeKeywordInput = (value: string | undefined) => {
    setKeywordInput(value);
  };

  const onChangeStartDateTime = (TimeStamp: number) => {
    setStartDateTime(TimeStamp);
  };
  const onChangeEndDateTime = (TimeStamp: number) => {
    setEndDateTime(TimeStamp);
  };

  const onChangeCurrentDatabase = (database: DatabaseResponse | undefined) => {
    setCurrentDatabase(database);
  };

  const onChangeLogLibrary = (logLibrary: string | undefined) => {
    setCurrentLogLibrary(logLibrary);
  };

  const onChangeVisibleDatabaseDraw = (visible: boolean) => {
    setVisibleDataBaseDraw(visible);
  };

  const onChangeActiveTabKey = (key: string) => {
    setActiveTabKey(key);
  };

  const onChangeActiveTimeOptionIndex = (index: number) => {
    setActiveTimeOptionIndex(index);
  };

  const onChangeLogPanes = (panes: PaneType[]) => {
    setLogPanes(panes);
  };

  const onChangeVisibleIndexModal = (visible: boolean) => {
    setVisibleIndexModal(visible);
  };

  const onChangeLogPane = (newPane: PaneType) => {
    const currentLogPanes = lodash
      .cloneDeep(logPanes)
      .map((item) => (item.pane === newPane.pane ? newPane : item));
    onChangeLogPanes(currentLogPanes);
  };

  const onCopyRawLogDetails = (log: any) => {
    if (log) {
      copy(JSON.stringify(log));
      message.success("复制成功");
    } else {
      message.error("复制失败，请手动复制");
    }
  };

  const onChangeLogsPage = (current: number, size: number) => {
    if (size !== pageSize) {
      setPageSize(size);
      setCurrentPage(FIRST_PAGE);
    } else {
      setCurrentPage(current);
    }
  };

  const onChangeLogsPageByUrl = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const getLogs = useRequest(api.getLogs, {
    loadingText: false,
    onError: (e) => {
      if (Request.isCancel(e)) {
        return false;
      } else {
        setLogs(undefined);
        onChangeLogsPage(1, 10);
      }
      return;
    },
    onSuccess: (res) => setLogs(res.data),
  });

  const getHighCharts = useRequest(api.getHighCharts, {
    loadingText: false,
    onError: (e) => {
      if (Request.isCancel(e)) {
        return false;
      } else {
        setHighChartList([]);
        onChangeLogsPage(1, 10);
      }
      return;
    },
    onSuccess: (res) => setHighChartList(res.data?.histograms || []),
  });

  const getLogLibraries = useRequest(api.getTableList, {
    loadingText: false,
    onSuccess: (res) => setLogLibraryList(res.data || []),
  });
  const getDatabases = useRequest(api.getDatabaseList, {
    loadingText: false,
    onSuccess: (res) => setDataBaseList(res.data || []),
  });

  const settingIndexes = useRequest(api.setIndexes, {
    loadingText: { done: "保存成功" },
  });

  const getIndexList = useRequest(api.getIndexes, {
    loadingText: false,
  });

  const logsAndHighChartsPayload = (
    database: DatabaseResponse,
    params?: QueryParams
  ) => {
    return {
      dt: database.datasourceType,
      db: database.databaseName,
      in: database.instanceName,
      table: params?.logLibrary || (currentLogLibrary as string),
      st: params?.st || (startDateTime as number),
      et: params?.et || (endDateTime as number),
      query: params?.kw || keywordInput,
      pageSize: params?.pageSize || pageSize,
      page: params?.page || currentPage,
    };
  };

  const doGetLogs = (params?: QueryParams) => {
    if (currentDatabase) {
      cancelTokenLogsRef.current?.();
      getLogs.run(
        logsAndHighChartsPayload(currentDatabase, params),
        new CancelToken(function executor(c) {
          cancelTokenLogsRef.current = c;
        })
      );
    }
  };
  const doGetHighCharts = (params?: QueryParams) => {
    if (currentDatabase) {
      cancelTokenHighChartsRef.current?.();
      getHighCharts.run(
        logsAndHighChartsPayload(currentDatabase, params),
        new CancelToken(function executor(c) {
          cancelTokenHighChartsRef.current = c;
        })
      );
    }
  };

  const doGetLogLibraryList = () => {
    if (currentDatabase) {
      getLogLibraries.run({
        dt: currentDatabase.datasourceType,
        db: currentDatabase.databaseName,
        in: currentDatabase.instanceName,
      });
    }
  };

  const doGetDatabaseList = (
    selectedInstance?: InstanceSelectedType | undefined
  ) => {
    getDatabases.run(selectedInstance);
  };

  const doSelectedDatabase = (database: DatabaseResponse | undefined) => {
    onChangeCurrentDatabase(database);
  };

  const doParseQuery = (keyword?: string) => {
    const defaultInput =
      lodash.cloneDeep(keyword ? keyword : keywordInput) || "";
    const strReg = /(\w+)='([^']+)'/g;
    const allQuery = defaultInput.match(strReg)?.map((item) => {
      return {
        key: item.replaceAll("'", "").split("=")[0],
        value: item.replaceAll("'", "").split("=")[1],
      };
    });
    setHighlightKeywords(allQuery);
  };

  const resetLogs = () => {
    onChangeEndDateTime(currentTimeStamp());
    onChangeStartDateTime(
      moment().subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME).unix()
    );
    onChangeLogsPage(FIRST_PAGE, PAGE_SIZE);
    onChangeKeywordInput(undefined);
    onChangeActiveTabKey(TimeRangeType.Relative);
    onChangeActiveTimeOptionIndex(ACTIVE_TIME_INDEX);
  };

  const resetCurrentHighChart = () => {
    setLogs(undefined);
    setHighChartList([]);
    setIsHiddenHighChart(false);
  };

  const setChangeTabPane = (tabPane: PaneType) => {
    onChangeLogsPage(tabPane.page, tabPane.pageSize);
    onChangeActiveTabKey(tabPane.activeTabKey);
    onChangeActiveTimeOptionIndex(tabPane.activeIndex);
    onChangeStartDateTime(tabPane.start);
    onChangeEndDateTime(tabPane.end);
  };

  useEffect(() => {
    if (currentDatabase && currentLogLibrary) {
      cancelTokenLogsRef.current?.();
      cancelTokenHighChartsRef.current?.();
      getLogs.run(
        logsAndHighChartsPayload(currentDatabase, {
          logLibrary: currentLogLibrary,
        }),
        new CancelToken(function executor(c) {
          cancelTokenLogsRef.current = c;
        })
      );
      getHighCharts.run(
        logsAndHighChartsPayload(currentDatabase, {
          logLibrary: currentLogLibrary,
        }),
        new CancelToken(function executor(c) {
          cancelTokenHighChartsRef.current = c;
        })
      );
    }
  }, [pageSize, currentPage]);

  useEffect(() => {
    if (!currentDatabase) {
      setLogs(undefined);
      setHighChartList([]);
      setLogLibraryList([]);
      setCurrentLogLibrary(undefined);
    }
    doGetLogLibraryList();
  }, [currentDatabase]);

  useEffect(() => {
    if (databaseList.length > 0 && !currentDatabase) {
      onChangeCurrentDatabase(databaseList[0]);
    }
  }, [databaseList, currentDatabase]);

  return {
    keywordInput,
    isHiddenHighChart,
    highChartList,
    logLibraryList,
    currentLogLibrary,
    databaseList,
    currentDatabase,
    logs,
    startDateTime,
    endDateTime,
    pageSize,
    currentPage,
    logsLoading: getLogs.loading,
    highChartLoading: getHighCharts.loading,
    activeTabKey,
    activeTimeOptionIndex,
    highlightKeywords,
    logPanes,
    visibleDataBaseDraw,
    visibleIndexModal,

    doGetLogs,
    doGetHighCharts,
    doGetLogLibraryList,
    doGetDatabaseList,

    onChangeKeywordInput,
    onChangeCurrentDatabase,
    onChangeLogLibrary,
    onCopyRawLogDetails,
    onChangeStartDateTime,
    onChangeEndDateTime,
    onChangeLogsPage,
    onChangeLogsPageByUrl,
    onChangeActiveTabKey,
    onChangeActiveTimeOptionIndex,
    onChangeLogPanes,
    onChangeLogPane,
    onChangeVisibleDatabaseDraw,
    onChangeVisibleIndexModal,
    onChangeHiddenHighChart,

    doSelectedDatabase,
    doParseQuery,

    resetLogs,
    resetCurrentHighChart,
    setChangeTabPane,

    settingIndexes,
    getLogLibraries,
    getIndexList,
  };
};
export default DataLogsModel;
