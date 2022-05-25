import { useEffect, useRef, useState } from "react";
import copy from "copy-to-clipboard";
import { message } from "antd";
import api, {
  DatabaseResponse,
  HighCharts,
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

const DataLogsModel = () => {
  // 查询关键字
  const [keywordInput, setKeywordInput] = useState<string | undefined>();
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
  // 数据库列表
  const [databaseList, setDataBaseList] = useState<DatabaseResponse[]>([]);
  const [currentDatabase, setCurrentDatabase] = useState<
    DatabaseResponse | undefined
  >();
  // 从数据库列表选择
  const [addLogToDatabase, setAddLogToDatabase] = useState<
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
  const [currentRelativeAmount, setCurrentRelativeAmount] =
    useState<number>(15);
  const [currentRelativeUnit, setCurrentRelativeUnit] =
    useState<string>("minutes");
  // 是否展示索引列表
  const [visibleIndexModal, setVisibleIndexModal] = useState<boolean>(false);

  // 用于关闭无效请求
  const cancelTokenHighChartsRef = useRef<Canceler | null>(null);
  const cancelTokenLogsRef = useRef<Canceler | null>(null);
  const CancelToken = Request.CancelToken;

  const {
    logLibraryCreatedModalVisible,
    logLibraryInfoDrawVisible,
    isAccessLogLibrary,
    onChangeLogLibraryInfoDrawVisible,
    onChangeLogLibraryCreatedModalVisible,
    onChangeIsAccessLogLibrary,
    doCreatedLogLibrary,
    doGetLogLibrary,
    doDeletedLogLibrary,
    getLocalTables,
    getTableColumns,
    doCreatedLocalLogLibrary,
    doCreatedLocalLogLibraryBatch,
  } = useLogLibrary();

  const {
    viewsVisibleDraw,
    onChangeViewsVisibleDraw,
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

  const { foldingState, onChangeFoldingState } = useCollapseDatasourceMenu();

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

  const onChangeAddLogToDatabase = (database: DatabaseResponse | undefined) => {
    setAddLogToDatabase(database);
  };

  const onChangeLogLibrary = (logLibrary: TablesResponse | undefined) => {
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

  const onChangeCurrentRelativeAmount = (amount: number) => {
    setCurrentRelativeAmount(amount);
  };

  const onChangeCurrentRelativeUnit = (unit: string) => {
    setCurrentRelativeUnit(unit);
  };

  const onChangeVisibleIndexModal = (visible: boolean) => {
    setVisibleIndexModal(visible);
  };

  const onChangeLogPane = (tabPane: PaneType) => {
    onChangeLogLibrary({
      id: parseInt(tabPane.paneId),
      tableName: tabPane.pane,
      createType: tabPane.paneType,
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
    doParseQuery(tabPane?.keyword || keywordInput);
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

  const doGetLogs = (params?: QueryParams) => {
    if (currentLogLibrary) {
      cancelTokenLogsRef.current?.();
      getLogs.run(
        currentLogLibrary.id,
        logsAndHighChartsPayload(params),
        new CancelToken(function executor(c) {
          cancelTokenLogsRef.current = c;
        })
      );
    }
  };
  const doGetHighCharts = (params?: QueryParams) => {
    if (currentLogLibrary) {
      cancelTokenHighChartsRef.current?.();
      getHighCharts.run(
        currentLogLibrary.id,
        logsAndHighChartsPayload(params),
        new CancelToken(function executor(c) {
          cancelTokenHighChartsRef.current = c;
        })
      );
    }
  };

  const doGetLogsAndHighCharts = async (id: number, extra?: Extra) => {
    if (!id) return;
    cancelTokenLogsRef.current?.();
    cancelTokenHighChartsRef.current?.();
    if (!!extra?.isPaging) {
      const logsRes = await getLogs.run(
        id,
        logsAndHighChartsPayload(extra?.reqParams),
        new CancelToken(function executor(c) {
          cancelTokenLogsRef.current = c;
        })
      );
      if (extra?.isPaging && logsRes?.code === 0) {
        const currentPane = logPanesHelper.logPanes[id.toString()];
        return {
          logs: logsRes.data,
          highCharts: currentPane.highCharts,
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

  const doGetLogLibraryList = () => {
    if (currentDatabase) {
      getLogLibraries.run(currentDatabase.id);
    }
  };

  const doGetDatabaseList = (selectedInstance?: number) => {
    getDatabases.run(selectedInstance);
  };

  const doSelectedDatabase = (database: DatabaseResponse | undefined) => {
    onChangeCurrentDatabase(database);
  };

  const doParseQuery = (keyword?: string) => {
    const defaultInput = lodash
      .cloneDeep(keyword ? keyword : keywordInput)
      ?.split(" and ") || [""];
    const strReg = /(`?\w|.+`?)(=| like )'([^']+)'/g;
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
    defaultValueArr.push(currentSelected);

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

  const resetLogPaneLogsAndHighCharts = (pane: PaneType) => {
    pane.logs = undefined;
    pane.highCharts = undefined;
    onChangeCurrentLogPane(pane);
  };

  useEffect(() => {
    if (!currentDatabase) {
      setLogs(undefined);
      setHighChartList([]);
      setLogLibraryList([]);
      setCurrentLogLibrary(undefined);
    }
    if (currentDatabase) {
      doGetLogLibraryList();
    }
  }, [currentDatabase]);

  return {
    keywordInput,
    isHiddenHighChart,
    highChartList,
    logLibraryList,
    currentLogLibrary,
    databaseList,
    currentDatabase,
    addLogToDatabase,
    logs,
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
    visibleDataBaseDraw,
    visibleIndexModal,
    isAccessLogLibrary,

    doGetLogs,
    doGetHighCharts,
    doGetLogsAndHighCharts,
    doGetLogLibraryList,
    doGetDatabaseList,

    onChangeKeywordInput,
    onChangeCurrentDatabase,
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
    onChangeVisibleDatabaseDraw,
    onChangeVisibleIndexModal,
    onChangeHiddenHighChart,
    onChangeCurrentLogPane,
    onChangeAddLogToDatabase,
    onChangeIsAccessLogLibrary,

    doSelectedDatabase,
    doParseQuery,
    doUpdatedQuery,

    resetLogs,
    resetCurrentHighChart,
    resetLogPaneLogsAndHighCharts,

    getTableId,
    getDatabases,
    settingIndexes,
    getLogLibraries,

    getIndexList,

    // hooks
    logLibraryCreatedModalVisible,
    logLibraryInfoDrawVisible,
    onChangeLogLibraryCreatedModalVisible,
    onChangeLogLibraryInfoDrawVisible,
    doCreatedLogLibrary,
    doDeletedLogLibrary,
    doGetLogLibrary,
    getLocalTables,
    getTableColumns,
    doCreatedLocalLogLibrary,
    doCreatedLocalLogLibraryBatch,

    viewsVisibleDraw,
    getViewList,
    viewList,
    viewIsEdit,
    createdView,
    deletedView,
    updatedView,
    viewVisibleModal,
    editView,
    doGetViewInfo,
    onChangeViewIsEdit,
    onChangeViewVisibleModal,
    onChangeViewsVisibleDraw,
    foldingState,
    onChangeFoldingState,

    logPanesHelper,
    statisticalChartsHelper,
  };
};
export default DataLogsModel;
