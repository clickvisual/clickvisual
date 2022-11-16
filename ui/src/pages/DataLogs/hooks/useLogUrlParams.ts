import useUrlState from "@ahooksjs/use-url-state";
import { useModel } from "@@/plugin-model/useModel";
import { useDebounceFn } from "ahooks";
import {
  ACTIVE_TIME_INDEX,
  DEBOUNCE_WAIT,
  FIFTEEN_TIME,
  FIRST_PAGE,
  MINUTES_UNIT_TIME,
  PAGE_SIZE,
  QueryTypeEnum,
  TimeRangeType,
} from "@/config/config";
import moment from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";
import { useEffect, useMemo, useRef, useState } from "react";
import { IndexInfoType, TableInfoResponse } from "@/services/dataLogs";
import { BaseRes } from "@/hooks/useRequest/useRequest";
import { DefaultPane } from "@/models/datalogs/useLogPanes";
import { PaneType } from "@/models/datalogs/types";
import useLocalStorages, {
  LastDataLogsStateType,
  LocalModuleType,
} from "@/hooks/useLocalStorages";
import { isEqual } from "lodash";

export interface UrlStateType {
  tid?: string | number;
  did?: string | number;
  instance?: string | number;
  database?: string | number;
  datasource?: string;
  table?: string;
  start?: string | number;
  end?: string | number;
  kw?: string;
  size?: string | number;
  page?: string | number;
  tab: string | number;
  index: string | number;
  queryType?: string;
  mode?: number;
  logState?: number;
}

export const RestUrlStates = {
  tid: undefined,
  instance: undefined,
  database: undefined,
  datasource: undefined,
  table: undefined,
  start: undefined,
  end: undefined,
  page: undefined,
  size: undefined,
  tab: undefined,
  index: undefined,
  kw: undefined,
  queryType: undefined,
};

const SharePath = [
  process.env.PUBLIC_PATH + "share",
  process.env.PUBLIC_PATH + "share/",
];

export default function useLogUrlParams() {
  const [urlState, setUrlState] = useUrlState<UrlStateType>({
    start: moment().subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME).unix(),
    end: currentTimeStamp(),
    page: FIRST_PAGE,
    size: PAGE_SIZE,
    tab: TimeRangeType.Relative,
    index: ACTIVE_TIME_INDEX,
    queryType: QueryTypeEnum.LOG,
  });

  const [tid, setTid] = useState<any>();
  const {
    doGetLogsAndHighCharts,
    currentLogLibrary,
    getTableId,
    onChangeLogLibrary,
    startDateTime,
    endDateTime,
    currentPage,
    pageSize,
    keywordInput,
    activeTimeOptionIndex,
    activeTabKey,
    doParseQuery,
    doGetLogLibrary,
    onChangeLogPane,
    logPanesHelper,
    statisticalChartsHelper,
    rawLogsIndexeList,
    doGetAnalysisField,
    onChangeRawLogsIndexeList,
    onChangeCurrentLogPane,
    logState,
    linkLogs,
    onChangeTableInfo,
    doGetColumns,
    onChangeColumsList,
  } = useModel("dataLogs");
  const {
    onChangeCurrentlyTableToIid,
    allTables,
    isTidInitialize,
    onChangeIsTidInitialize,
  } = useModel("instances");
  const { addLogPane } = logPanesHelper;
  const { activeQueryType } = statisticalChartsHelper;
  const { onChangeDataLogsState, getLastDataLogsState, onSetLocalData } =
    useLocalStorages();
  const rawLogsIndexeListRef = useRef<IndexInfoType[] | undefined>(
    rawLogsIndexeList
  );

  const isShare = useMemo(
    () => SharePath.includes(document.location.pathname),
    [document.location.pathname]
  );

  rawLogsIndexeListRef.current = rawLogsIndexeList;
  const handleResponse = (
    res: BaseRes<TableInfoResponse>,
    tid: number,
    lastDataLogsState: LastDataLogsStateType
  ) => {
    onChangeLogLibrary({
      id: tid,
      tableName: res.data.name,
      createType: res.data.createType,
      desc: res.data.desc,
      relTraceTableId: res.data.traceTableId,
    });

    const dataLogsQuerySql = onSetLocalData(
      undefined,
      LocalModuleType.datalogsQuerySql
    );

    const pane: PaneType = {
      ...DefaultPane,
      pane: res.data.name,
      paneId: tid.toString(),
      paneType: res.data.createType,
      start: parseInt(urlState.start || lastDataLogsState.start),
      end: parseInt(urlState.end || lastDataLogsState.end),
      keyword: urlState.kw || lastDataLogsState.kw,
      page: parseInt(urlState.page || lastDataLogsState.page),
      pageSize: parseInt(urlState.size || lastDataLogsState.size),
      activeTabKey: urlState.tab || lastDataLogsState.tab,
      activeIndex: parseInt(urlState.index || lastDataLogsState.index),
      queryType: urlState.queryType || lastDataLogsState.queryType,
      querySql: dataLogsQuerySql[tid] || lastDataLogsState.querySql,
      desc: res.data.desc,
      mode: urlState?.mode, // 为1时：聚合报警详情页面过来的
      logState: parseInt(urlState?.logState || lastDataLogsState.logState),
      relTraceTableId: res.data.traceTableId,
    };

    addLogPane(pane.paneId, pane);
    onChangeLogPane(pane);
    doParseQuery(urlState.kw);

    // 聚合告警模式调用这两接口会报错
    if (urlState?.mode == 1) {
      return;
    }

    doGetColumns.run(tid).then((res: any) => {
      if (res.code != 0) return;
      let columsArr: string[] = [];
      res.data.map((item: any) => {
        columsArr.push(item.name);
      });
      onChangeColumsList(columsArr);

      doGetAnalysisField.run(tid).then((res: any) => {
        if (res.code != 0) return;
        onChangeRawLogsIndexeList(res.data?.keys);
        onChangeCurrentLogPane({
          ...(pane as PaneType),
          rawLogsIndexeList: res.data?.keys,
        });

        doGetLogsAndHighCharts(tid, {
          reqParams: {
            st: pane.start,
            et: pane.end,
            kw: pane.keyword,
            page: pane.page,
            pageSize: pane.pageSize,
          },
          analysisField: columsArr,
        })
          .then((res) => {
            if (!res) return;
            pane.logs = {
              ...res.logs,
              query: res.logs.query,
            };
            pane.highCharts = res.highCharts;
            pane.logChart = { logs: [], isNeedSort: false, sortRule: [] };
            pane.rawLogsIndexeList = rawLogsIndexeListRef.current;
            pane.columsList = columsArr;
            onChangeLogPane(pane);
          })
          .catch();
      });
    });
  };

  const doSetUrlQuery = (tid: number) => {
    try {
      doGetLogLibrary.run(tid).then((res) => {
        if (res?.code !== 0) {
          return;
        }
        onChangeCurrentlyTableToIid(res?.data?.database?.iid);
        handleResponse(res, tid, getLastDataLogsState());
        onChangeTableInfo(res.data);
      });
    } catch (e) {
      console.log("【Error】: ", e);
    }
  };

  const setUrlQuery = useDebounceFn(
    () => {
      const data = {
        tid: currentLogLibrary?.id,
        start: startDateTime,
        end: endDateTime,
        page: currentPage,
        size: pageSize,
        kw: keywordInput,
        index: activeTimeOptionIndex,
        tab: activeTabKey,
        queryType: activeQueryType,
        logState: logState,
      };

      setUrlState(data);
      onChangeDataLogsState(data);
    },
    { wait: DEBOUNCE_WAIT }
  );

  useEffect(() => {
    const data = {
      tid: currentLogLibrary?.id,
      start: startDateTime,
      end: endDateTime,
      page: currentPage,
      size: pageSize,
      kw: keywordInput,
      index: activeTimeOptionIndex,
      tab: activeTabKey,
      queryType: activeQueryType,
      logState: logState,
      linkLogs: linkLogs,
    };
    const defaultData = {
      end: undefined,
      index: 2,
      kw: undefined,
      page: undefined,
      queryType: QueryTypeEnum.LOG,
      size: undefined,
      start: undefined,
      tab: TimeRangeType.Relative,
      tid: undefined,
      logState: 0,
      linkLogs: undefined,
    };
    // 初始化的时候时不时会执行一次，无法稳定复现，于是排除初始化的情况
    !isEqual(data, defaultData) && setUrlQuery.run();
  }, [
    currentLogLibrary,
    startDateTime,
    endDateTime,
    currentPage,
    pageSize,
    keywordInput,
    activeTimeOptionIndex,
    activeTabKey,
    activeQueryType,
    logState,
    linkLogs,
  ]);

  useEffect(() => {
    const lastDataLogsState = getLastDataLogsState();
    setTid(urlState.tid || lastDataLogsState.tid);
  }, []);

  useEffect(() => {
    if (isShare && tid && !isTidInitialize) {
      doSetUrlQuery(parseInt(tid));
      onChangeIsTidInitialize(true);
    }
    if (tid && allTables.length > 0) {
      // 并且该tid在树中存在且为初始化时执行
      if (!isTidInitialize) {
        const currentTable = allTables.filter((item: any) => {
          return item.key == `table-${tid}`;
        });

        currentTable.length == 1 && doSetUrlQuery(parseInt(tid));
        onChangeIsTidInitialize(true);
      }
    } else if (
      urlState.instance &&
      urlState.database &&
      urlState.datasource &&
      urlState.table
    ) {
      getTableId({
        instance: urlState.instance,
        database: urlState.database,
        datasource: urlState.datasource,
        table: urlState.table,
      }).then((res) => {
        if (res?.code === 0) {
          doSetUrlQuery(res.data);
        }
      });
    }
  }, [tid, allTables]);
}
