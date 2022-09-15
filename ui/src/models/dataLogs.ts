import { useRef, useState } from "react";
import copy from "copy-to-clipboard";
import { message } from "antd";
import api, {
  DatabaseResponse,
  HighCharts,
  IndexInfoType,
  LogsResponse,
  TablesResponse,
} from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";
import { currentTimeStamp } from "@/utils/momentUtils";
import {
  ACTIVE_TIME_INDEX,
  FIFTEEN_TIME,
  FIRST_PAGE,
  MINUTES_UNIT_TIME,
  PAGE_SIZE,
  QueryTypeEnum,
  TimeRangeType,
} from "@/config/config";
import moment from "moment";
import Request, { Canceler } from "umi-request";
import lodash from "lodash";
import { formatMessage } from "@@/plugin-locale/localeExports";
import useLogLibrary from "@/models/datalogs/useLogLibrary";
import useLogLibraryViews from "@/models/datalogs/useLogLibraryViews";
import useCollapseDatasourceMenu from "@/models/datalogs/useCollapseDatasourceMenu";
import useLogPanes from "@/models/datalogs/useLogPanes";
import { Extra, PaneType, QueryParams } from "@/models/datalogs/types";
import useStatisticalCharts from "@/models/datalogs/useStatisticalCharts";
import useLogOptions from "@/models/datalogs/useLogOptions";

const DataLogsModel = () => {
  // 查询关键字
  const [keywordInput, setKeywordInput] = useState<string | undefined>();
  // 查询关键词 2代
  // const [logInputKeywordArr, setLogInputKeywordArr] = useState<any[]>([]);
  // 是否隐藏 Highcharts
  const [isHiddenHighChart, setIsHiddenHighChart] = useState<boolean>(false);
  // 日志总条数
  const [logCount, setLogCount] = useState<number>(0);
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
  const [logLibraryList, setLogLibraryList] = useState<TablesResponse[]>([]);
  const [currentLogLibrary, setCurrentLogLibrary] = useState<
    TablesResponse | undefined
  >();
  const [highlightKeywords, setHighlightKeywords] = useState<
    { key: string; value: string }[] | undefined
  >();
  // 日志索引
  const [rawLogsIndexeList, setRawLogsIndexeList] = useState<IndexInfoType[]>();
  // 数据库列表
  const [databaseList, setDataBaseList] = useState<DatabaseResponse[]>([]);
  // 从数据库列表选择
  const [addLogToDatabase, setAddLogToDatabase] = useState<
    DatabaseResponse | undefined
  >();

  // 树中是否含有数据库
  const [isHasDatabase, setIsHasDatabase] = useState<boolean>(false);

  // 时间选择器
  const [activeTabKey, setActiveTabKey] = useState<string>(
    TimeRangeType.Relative
  );
  const [activeTimeOptionIndex, setActiveTimeOptionIndex] = useState(2);
  const [currentRelativeAmount, setCurrentRelativeAmount] =
    useState<number>(15);
  const [currentRelativeUnit, setCurrentRelativeUnit] =
    useState<string>("minutes");
  // 是否展示索引列表
  const [visibleIndexModal, setVisibleIndexModal] = useState<boolean>(false);

  // 日志表格导出数据
  const [logExcelData, setLogExcelData] = useState<any[]>([]);

  // 用于关闭无效请求
  const cancelTokenHighChartsRef = useRef<Canceler | null>(null);
  const cancelTokenLogsRef = useRef<Canceler | null>(null);
  const CancelToken = Request.CancelToken;

  // 最近一次正在加载的tid
  const [lastLoadingTid, setLastLoadingTid] = useState<number>(0);

  // 链路模式下日志的三种状态
  const [logState, setLogState] = useState<number>(0);

  // 链路的100条日志信息
  const [linkLogs, setLinkLogs] = useState<LogsResponse>();

  const {
    logLibraryCreatedModalVisible,
    logLibraryInfoDrawVisible,
    isAccessLogLibrary,
    isEditDatabase,
    isLogLibraryAllDatabase,
    currentEditDatabase,
    linkLinkLogLibraryTId,
    onChangeLogLibraryInfoDrawVisible,
    onChangeLinkLinkLogLibraryTId,
    onChangeLogLibraryCreatedModalVisible,
    onChangeIsAccessLogLibrary,
    onChangeIsLogLibraryAllDatabase,
    onChangeIsEditDatabase,
    onChangeCurrentEditDatabase,
    doCreatedLogLibraryAsString,
    doCreatedLogLibraryEachRow,
    doGetLogLibrary,
    doUpdateLogLibrary,
    updateLogLibraryLoading,
    getLogLibraryLoading,
    doDeletedLogLibrary,
    getLocalTables,
    getTableColumns,
    doCreatedLocalLogLibrary,
    doCreatedLocalLogLibraryBatch,
    doGetMappingJson,
  } = useLogLibrary();

  const {
    viewsVisibleDraw,
    onChangeViewsVisibleDraw,
    isModifyLog,
    onChangeIsModifyLog,
    isAssociatedLinkLogLibrary,
    onChangeIsAssociatedLinkLogLibrary,
    currentEditLogLibrary,
    onChangeCurrentEditLogLibrary,
    getViewList,
    viewList,
    viewVisibleModal,
    viewIsEdit,
    createdView,
    deletedView,
    updatedView,
    doGetViewInfo,
    editView,
    onChangeViewVisibleModal,
    onChangeViewIsEdit,
  } = useLogLibraryViews();

  const statisticalChartsHelper = useStatisticalCharts();

  const logPanesHelper = useLogPanes();

  const logOptionsHelper = useLogOptions();

  const {
    foldingState,
    onChangeFoldingState,
    resizeMenuWidth,
    onChangeResizeMenuWidth,
  } = useCollapseDatasourceMenu();

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

  const onChangeAddLogToDatabase = (database: DatabaseResponse | undefined) => {
    setAddLogToDatabase(database);
  };

  const onChangeLogLibrary = (logLibrary: TablesResponse | undefined) => {
    setCurrentLogLibrary(logLibrary);
  };

  const onChangeIsHasDatabase = (flag: boolean) => {
    setIsHasDatabase(flag);
  };

  const onChangeActiveTabKey = (key: string) => {
    setActiveTabKey(key);
  };

  const onChangeActiveTimeOptionIndex = (index: number) => {
    setActiveTimeOptionIndex(index);
  };

  const onChangeCurrentRelativeAmount = (amount: number) => {
    setCurrentRelativeAmount(amount);
  };

  const onChangeCurrentRelativeUnit = (unit: string) => {
    setCurrentRelativeUnit(unit);
  };

  const onChangeVisibleIndexModal = (visible: boolean) => {
    setVisibleIndexModal(visible);
  };

  const onChangeLastLoadingTid = (tid: number) => {
    setLastLoadingTid(tid);
  };

  const onChangeLogState = (num: number) => {
    setLogState(num);
  };

  const onChangeRawLogsIndexeList = (list?: IndexInfoType[]) => {
    setRawLogsIndexeList(list);
  };

  const onChangeLogPane = (tabPane: PaneType) => {
    onChangeLogLibrary({
      id: parseInt(tabPane.paneId),
      tableName: tabPane.pane,
      createType: tabPane.paneType,
      desc: tabPane.desc,
    });
    onChangeCurrentLogPane(tabPane);
  };

  const onChangeCurrentLogPane = (
    tabPane: PaneType,
    panes?: { [Key: string]: PaneType }
  ) => {
    onSetLogsPage(tabPane?.page as number, tabPane?.pageSize as number);
    onChangeEndDateTime(tabPane?.end as number);
    onChangeStartDateTime(tabPane?.start as number);
    onChangeKeywordInput(tabPane?.keyword as string);
    onChangeActiveTabKey(tabPane?.activeTabKey || TimeRangeType.Relative);
    onChangeActiveTimeOptionIndex(tabPane?.activeIndex ?? ACTIVE_TIME_INDEX);
    setLogs(tabPane.logs);
    onChangeRawLogsIndexeList(tabPane?.rawLogsIndexeList);
    setHighChartList(tabPane?.highCharts?.histograms ?? []);
    setLogCount(tabPane?.highCharts?.count || 0);
    logPanesHelper.updateLogPane(tabPane.paneId, tabPane, panes);
    statisticalChartsHelper.setActiveQueryType(
      tabPane?.queryType ?? QueryTypeEnum.LOG
    );
    statisticalChartsHelper.onChangeChartSql(
      tabPane?.logs?.query ?? tabPane?.querySql
    );
    statisticalChartsHelper.setLogChart(tabPane?.logChart || { logs: [] });
    doParseQuery(tabPane.logs?.where || keywordInput);
    setLinkLogs(tabPane?.linkLogs);
    setLogState(tabPane?.logState);
  };

  const onCopyRawLogDetails = (log: any) => {
    if (log) {
      copy(typeof log === "object" ? JSON.stringify(log) : log);
      message.success(formatMessage({ id: "log.item.copy.success" }));
    } else {
      message.error(formatMessage({ id: "log.item.copy.failed" }));
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
  const onSetLogsPage = (current: number, size: number) => {
    setPageSize(size);
    setCurrentPage(current);
  };

  const getTableId = useRequest(api.getTableId, { loadingText: false }).run;

  const getLogs = useRequest(api.getLogs, {
    loadingText: false,
    onError: (e) => {
      if (Request.isCancel(e)) {
        return false;
      } else {
        // setLogs(undefined);
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
        // setHighChartList([]);
      }
      return;
    },
    onSuccess: (res) => {
      setLogCount(res.data?.count);
      res &&
        res.data &&
        res.data.histograms &&
        setHighChartList(res.data?.histograms);
    },
  });

  const getLogLibraries = useRequest(api.getTableList, {
    loadingText: false,
    onSuccess: (res) => setLogLibraryList(res.data || []),
  });

  const getDatabases = useRequest(api.getDatabaseList, {
    loadingText: false,
    onSuccess: (res) => setDataBaseList(res.data || []),
  });

  const doGetAnalysisField = useRequest(api.getAnalysisField, {
    loadingText: false,
  });

  const doUpdateLinkLinkLogLibrary = useRequest(api.updateLinkLinkLogLibrary, {
    loadingText: false,
  });

  const settingIndexes = useRequest(api.setIndexes, {
    loadingText: false,
    onSuccess() {
      message.success(
        formatMessage({ id: "log.index.manage.message.save.success" })
      );
    },
  });

  const getIndexList = useRequest(api.getIndexes, {
    loadingText: false,
  });

  const logsAndHighChartsPayload = (params?: QueryParams) => {
    return {
      st: params?.st || (startDateTime as number),
      et: params?.et || (endDateTime as number),
      query: params?.kw ?? keywordInput,
      pageSize: params?.pageSize || pageSize,
      page: params?.page || currentPage,
    };
  };

  // const doGetLogs = (params?: QueryParams) => {
  //   if (currentLogLibrary) {
  //     cancelTokenLogsRef.current?.();
  //     getLogs.run(
  //       currentLogLibrary.id,
  //       logsAndHighChartsPayload(params),
  //       new CancelToken(function executor(c) {
  //         cancelTokenLogsRef.current = c;
  //       })
  //     );
  //   }
  // };
  const doGetHighCharts = async (params?: QueryParams) => {
    if (currentLogLibrary) {
      cancelTokenHighChartsRef.current?.();
      const highChartsRes = await getHighCharts.run(
        currentLogLibrary.id,
        logsAndHighChartsPayload(params),
        new CancelToken(function executor(c) {
          cancelTokenHighChartsRef.current = c;
        })
      );
      if (highChartsRes?.code === 0) {
        return {
          highCharts: highChartsRes?.data,
        };
      }
    }
    return;
  };

  const doGetLogsAndHighCharts = async (id: number, extra?: Extra) => {
    if (!id) return;
    cancelTokenLogsRef.current?.();
    cancelTokenHighChartsRef.current?.();
    const currentPane = logPanesHelper.logPanes[id.toString()];
    const histogramChecked = currentPane?.histogramChecked ?? true;
    onChangeLastLoadingTid(id);
    if (!!extra?.isPaging || !!extra?.isOnlyLog || !histogramChecked) {
      const logsRes = await getLogs.run(
        id,
        logsAndHighChartsPayload(extra?.reqParams),
        new CancelToken(function executor(c) {
          cancelTokenLogsRef.current = c;
        })
      );
      if ((extra?.isPaging || !histogramChecked) && logsRes?.code === 0) {
        return {
          logs: logsRes.data,
          highCharts: currentPane?.highCharts,
        };
      }
    } else {
      const [logsRes, highChartsRes] = await Promise.all([
        getLogs.run(
          id,
          logsAndHighChartsPayload(extra?.reqParams),
          new CancelToken(function executor(c) {
            cancelTokenLogsRef.current = c;
          })
        ),
        getHighCharts.run(
          id,
          logsAndHighChartsPayload(extra?.reqParams),
          new CancelToken(function executor(c) {
            cancelTokenHighChartsRef.current = c;
          })
        ),
      ]);
      if (logsRes?.code === 0 && highChartsRes?.code === 0) {
        return {
          logs: logsRes.data,
          highCharts: highChartsRes?.data,
        };
      }
    }
    return;
  };

  const doGetDatabaseList = (selectedInstance?: number) => {
    getDatabases.run(selectedInstance);
  };

  const doParseQuery = (keyword?: string) => {
    const defaultInput = lodash
      .cloneDeep(keyword ? keyword : keywordInput)
      ?.split(" and ") || [""];
    const strReg = /(`?\w|.+`?)(=|!=| like | not like )'?([^']+)'?/g;
    const allQuery: any[] = [];
    defaultInput.map((inputStr) =>
      Array.from(inputStr.replaceAll("`", "").matchAll(strReg))?.map((item) => {
        allQuery.push({
          key: item[1],
          value: item[3],
        });
      })
    );
    setHighlightKeywords(allQuery);
  };

  const doUpdatedQuery = (currentSelected: string) => {
    if (!currentLogLibrary?.id) return;
    if (currentSelected.endsWith("+08:00'")) {
      currentSelected = currentSelected.substring(
        0,
        currentSelected.length - 7
      );
      currentSelected += "'";
    }
    const defaultValueArr =
      lodash.cloneDeep(keywordInput)?.split(" and ") || [];
    if (defaultValueArr.length === 1 && defaultValueArr[0] === "") {
      defaultValueArr.pop();
    }
    var newValueArr: string[] = [];
    lodash.cloneDeep(defaultValueArr).map((item: string) => {
      newValueArr.push(item.replace(/(=|!=| like | not like )/gi, ""));
    });

    let currentKeyword = currentSelected
      .replace(/(=|!=| like | not like )/g, "")
      .trim();

    if (newValueArr?.includes(currentKeyword)) {
      defaultValueArr.splice(newValueArr.indexOf(currentKeyword), 1);
      newValueArr.splice(newValueArr.indexOf(currentKeyword), 1);
    }
    newValueArr.push(currentKeyword);
    defaultValueArr.push(currentSelected.trim());

    const kw = defaultValueArr.join(" and ");
    const pane = logPanesHelper.logPanes[currentLogLibrary.id.toString()];
    const newPane = Object.assign({}, pane, {
      keyword: kw,
      page: FIRST_PAGE,
    });
    onChangeCurrentLogPane(newPane);
    doGetLogsAndHighCharts(currentLogLibrary.id, {
      reqParams: {
        kw,
        page: FIRST_PAGE,
      },
    })
      .then((res) => {
        if (!res) {
          resetLogPaneLogsAndHighCharts(newPane);
        } else {
          newPane.logs = res.logs;
          newPane.highCharts = res.highCharts;
          newPane.rawLogsIndexeList = rawLogsIndexeList;
          if (res.logs.query !== pane.querySql) {
            newPane.logChart = { logs: [] };
          }
          onChangeCurrentLogPane(newPane);
        }
      })
      .catch(() => {
        resetLogPaneLogsAndHighCharts(newPane);
      });
    doParseQuery(kw);
  };

  const isJsonFun = (str: string | object) => {
    if (typeof str == "string") {
      try {
        var obj = JSON.parse(str);
        return !!(typeof obj == "object" && obj);
      } catch (e) {
        return false;
      }
    } else if (typeof str == "object") {
      return true;
    }
    return false;
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
    setLinkLogs(undefined);
    setHighChartList([]);
    setIsHiddenHighChart(false);
  };

  const resetLogPaneLogsAndHighCharts = (pane: PaneType) => {
    pane.logs = undefined;
    pane.highCharts = undefined;
    onChangeCurrentLogPane(pane);
  };

  const quickInsertLikeQuery = (
    value: string,
    extra?: { key?: string; isIndex?: boolean; indexKey?: string }
  ) => {
    let currentSelected: string;
    if (extra?.isIndex && extra?.indexKey) {
      currentSelected = `\`${extra.indexKey}\`='${value}'`;
    } else {
      currentSelected = `${
        extra?.key ? "`" + extra?.key + "`" : "_raw_log_"
      } like '%${value}%'`;
    }
    doUpdatedQuery(currentSelected);
  };

  const quickInsertLikeExclusion = (
    value: string,
    extra?: { key?: string; isIndex?: boolean; indexKey?: string }
  ) => {
    let currentSelected = "";
    if (extra?.isIndex && extra?.indexKey) {
      currentSelected = `\`${extra.indexKey}\`!='${value}'`;
    } else {
      currentSelected = `${
        extra?.key ? "`" + extra?.key + "`" : "_raw_log_"
      } not like '%${value}%'`;
    }
    doUpdatedQuery(currentSelected);
  };

  return {
    keywordInput,
    isHiddenHighChart,
    highChartList,
    logLibraryList,
    currentLogLibrary,
    databaseList,
    isHasDatabase,
    addLogToDatabase,
    logs,
    linkLogs,
    logCount,
    startDateTime,
    endDateTime,
    pageSize,
    currentPage,
    logsLoading: getLogs.loading,
    highChartLoading: getHighCharts.loading,
    activeTabKey,
    currentRelativeAmount,
    currentRelativeUnit,
    activeTimeOptionIndex,
    highlightKeywords,
    visibleIndexModal,
    isAccessLogLibrary,
    isEditDatabase,
    currentEditDatabase,
    currentEditLogLibrary,
    isLogLibraryAllDatabase,
    logState,

    // doGetLogs,
    doGetHighCharts,
    doGetLogsAndHighCharts,
    // doGetLogLibraryList,
    doGetDatabaseList,

    onChangeKeywordInput,
    onChangeIsHasDatabase,
    onChangeLogLibrary,
    onCopyRawLogDetails,
    onChangeStartDateTime,
    onChangeEndDateTime,
    onChangeLogsPage,
    onChangeActiveTabKey,
    onChangeActiveTimeOptionIndex,
    onChangeCurrentRelativeAmount,
    onChangeCurrentRelativeUnit,
    onChangeLogPane,
    onChangeVisibleIndexModal,
    onChangeHiddenHighChart,
    onChangeCurrentLogPane,
    onChangeAddLogToDatabase,
    onChangeIsAccessLogLibrary,
    onChangeIsLogLibraryAllDatabase,
    onChangeIsEditDatabase,
    onChangeCurrentEditDatabase,
    onChangeCurrentEditLogLibrary,
    onChangeLogState,

    doParseQuery,
    doUpdatedQuery,

    resetLogs,
    isJsonFun,
    resetCurrentHighChart,
    resetLogPaneLogsAndHighCharts,

    getTableId,
    settingIndexes,
    getLogLibraries,

    getIndexList,

    // hooks
    logLibraryCreatedModalVisible,
    logLibraryInfoDrawVisible,
    onChangeLogLibraryCreatedModalVisible,
    onChangeLogLibraryInfoDrawVisible,
    linkLinkLogLibraryTId,
    onChangeLinkLinkLogLibraryTId,
    doCreatedLogLibraryAsString,
    doCreatedLogLibraryEachRow,
    doDeletedLogLibrary,
    doGetLogLibrary,
    doUpdateLogLibrary,
    updateLogLibraryLoading,
    getLogLibraryLoading,
    getLocalTables,
    getTableColumns,
    doCreatedLocalLogLibrary,
    doCreatedLocalLogLibraryBatch,
    doGetMappingJson,
    doGetAnalysisField,
    doUpdateLinkLinkLogLibrary,

    viewsVisibleDraw,
    getViewList,
    viewList,
    viewIsEdit,
    createdView,
    deletedView,
    updatedView,
    viewVisibleModal,
    editView,
    isModifyLog,
    doGetViewInfo,
    lastLoadingTid,
    rawLogsIndexeList,
    isAssociatedLinkLogLibrary,
    onChangeIsAssociatedLinkLogLibrary,
    onChangeViewIsEdit,
    onChangeViewVisibleModal,
    onChangeViewsVisibleDraw,
    onChangeIsModifyLog,
    onChangeLastLoadingTid,
    onChangeRawLogsIndexeList,

    foldingState,
    onChangeFoldingState,
    resizeMenuWidth,
    onChangeResizeMenuWidth,

    logPanesHelper,
    logOptionsHelper,
    statisticalChartsHelper,
    quickInsertLikeQuery,
    quickInsertLikeExclusion,

    logExcelData,
    setLogExcelData,
  };
};
export default DataLogsModel;
