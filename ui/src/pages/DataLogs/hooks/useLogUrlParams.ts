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
import { useEffect, useState } from "react";
import { TableInfoResponse } from "@/services/dataLogs";
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
    // databaseList,
    // currentDatabase,
    currentLogLibrary,
    getTableId,
    onChangeLogLibrary,
    // onChangeCurrentDatabase,
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
    // onChangeVisibleDatabaseDraw,
  } = useModel("dataLogs");
  const { onChangeCurrentlyTableToIid, allTables } = useModel("instances");
  const { addLogPane } = logPanesHelper;
  const { activeQueryType, chartSql } = statisticalChartsHelper;
  const { onChangeDataLogsState, getLastDataLogsState, onSetLocalData } =
    useLocalStorages();

  const handleResponse = (
    res: BaseRes<TableInfoResponse>,
    tid: number,
    lastDataLogsState: LastDataLogsStateType
  ) => {
    // if (res.data.database) {
    // onChangeCurrentDatabase(res.data.database);
    // }
    onChangeLogLibrary({
      id: tid,
      tableName: res.data.name,
      createType: res.data.createType,
      desc: res.data.desc,
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
    };

    addLogPane(pane.paneId, pane);
    onChangeLogPane(pane);
    doParseQuery(urlState.kw);

    // 聚合告警模式调用这两接口会报错
    if (urlState?.mode == 1) {
      return;
    }

    doGetLogsAndHighCharts(tid, {
      reqParams: {
        st: pane.start,
        et: pane.end,
        kw: pane.keyword,
        page: pane.page,
        pageSize: pane.pageSize,
      },
    })
      .then((res) => {
        if (!res) return;
        pane.logs = {
          ...res.logs,
          query: res.logs.query,
        };
        pane.highCharts = res.highCharts;
        pane.logChart = { logs: [] };
        onChangeLogPane(pane);
      })
      .catch();
  };

  const doSetUrlQuery = (tid: number) => {
    try {
      doGetLogLibrary.run(tid).then((res) => {
        if (res?.code !== 0) {
          return;
        }
        onChangeCurrentlyTableToIid(res?.data?.database?.iid);
        handleResponse(res, tid, getLastDataLogsState());
      });
    } catch (e) {
      console.log("【Error】: ", e);
    }
  };

  const setUrlQuery = useDebounceFn(
    () => {
      const data = {
        tid: currentLogLibrary?.id,
        // did: currentDatabase?.id,
        start: startDateTime,
        end: endDateTime,
        page: currentPage,
        size: pageSize,
        kw: keywordInput,
        index: activeTimeOptionIndex,
        tab: activeTabKey,
        queryType: activeQueryType,
        // querySql: chartSql,
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
    };
    // 初始化的时候时不时会执行一次，无法稳定复现，于是排除初始化的情况
    !isEqual(data, defaultData) && setUrlQuery.run();
  }, [
    currentLogLibrary,
    // currentDatabase,
    startDateTime,
    endDateTime,
    currentPage,
    pageSize,
    keywordInput,
    activeTimeOptionIndex,
    activeTabKey,
    activeQueryType,
    chartSql,
  ]);

  useEffect(() => {
    const lastDataLogsState = getLastDataLogsState();
    setTid(urlState.tid || lastDataLogsState.tid);
  }, []);

  useEffect(() => {
    if (tid) {
      // 并且该tid在树中存在
      const currentTable = allTables.filter((item: any) => {
        return item.key == `table-${tid}`;
      });

      currentTable.length == 1 && doSetUrlQuery(parseInt(tid));
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

  // useEffect(() => {
  //   const lastDataLogsState: LastDataLogsStateType = getLastDataLogsState();
  //   const tid = urlState.tid || lastDataLogsState.tid;
  //   const did = urlState.did || lastDataLogsState.did;
  //   if (databaseList.length > 0 && did && !currentDatabase) {
  //     const database = databaseList.find((item) => parseInt(did) === item.id);
  //     // onChangeCurrentDatabase(database);
  //   } else if (!tid && !did && databaseList.length > 0 && !currentDatabase) {
  //     // onChangeCurrentDatabase(databaseList[0]);
  //     onChangeVisibleDatabaseDraw(true);
  //   }
  // }, [databaseList, currentDatabase, urlState.did, urlState.tid]);
}
