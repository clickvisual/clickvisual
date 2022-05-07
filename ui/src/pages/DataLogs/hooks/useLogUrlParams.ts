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
import { useEffect } from "react";
import { TableInfoResponse } from "@/services/dataLogs";
import { BaseRes } from "@/hooks/useRequest/useRequest";
import { DefaultPane } from "@/models/datalogs/useLogPanes";
import { PaneType } from "@/models/datalogs/types";

interface UrlStateType {
  tid?: string;
  did?: string;
  instance?: string;
  database?: string;
  datasource?: string;
  table?: string;
  start: string | number;
  end: string | number;
  kw?: string;
  size: string | number;
  page: string | number;
  tab: string | number;
  index: string | number;
  queryType?: string;
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
  const {
    doGetLogsAndHighCharts,
    databaseList,
    currentDatabase,
    currentLogLibrary,
    getTableId,
    onChangeLogLibrary,
    onChangeCurrentDatabase,
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
  } = useModel("dataLogs");
  const { addLogPane } = logPanesHelper;
  const { activeQueryType } = statisticalChartsHelper;

  const handleResponse = (res: BaseRes<TableInfoResponse>, tid: number) => {
    if (res.data.database) {
      onChangeCurrentDatabase(res.data.database);
    }
    onChangeLogLibrary({
      id: tid,
      tableName: res.data.name,
      createType: res.data.createType,
    });

    const pane: PaneType = {
      ...DefaultPane,
      pane: res.data.name,
      paneId: tid.toString(),
      paneType: res.data.createType,
      start: parseInt(urlState.start),
      end: parseInt(urlState.end),
      keyword: urlState.kw,
      page: parseInt(urlState.page),
      pageSize: parseInt(urlState.size),
      activeTabKey: urlState.tab,
      activeIndex: parseInt(urlState.index),
      queryType: urlState.queryType,
    };

    switch (urlState.queryType) {
      case QueryTypeEnum.LOG:
        addLogPane(pane.paneId, pane);
        onChangeLogPane(pane);
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
            pane.logs = res.logs;
            pane.highCharts = res.highCharts;
            onChangeLogPane(pane);
          })
          .catch();
        doParseQuery(urlState.kw);
        break;
      case QueryTypeEnum.TABLE:
        break;
    }
  };

  const doSetUrlQuery = (tid: number) => {
    try {
      doGetLogLibrary.run(tid).then((res) => {
        if (res?.code !== 0) {
          return;
        }
        handleResponse(res, tid);
      });
    } catch (e) {
      console.log("【Error】: ", e);
    }
  };

  const setUrlQuery = useDebounceFn(
    () => {
      setUrlState({
        tid: currentLogLibrary?.id,
        did: currentDatabase?.id,
        start: startDateTime,
        end: endDateTime,
        page: currentPage,
        size: pageSize,
        kw: keywordInput,
        index: activeTimeOptionIndex,
        tab: activeTabKey,
        queryType: activeQueryType,
      });
    },
    { wait: DEBOUNCE_WAIT }
  );

  useEffect(() => {
    setUrlQuery.run();
  }, [
    currentLogLibrary,
    currentDatabase,
    startDateTime,
    endDateTime,
    currentPage,
    pageSize,
    keywordInput,
    activeTimeOptionIndex,
    activeTabKey,
    activeQueryType,
  ]);

  useEffect(() => {
    const tid = urlState.tid;

    if (tid) {
      doSetUrlQuery(parseInt(tid));
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
  }, []);

  useEffect(() => {
    const did = urlState.did;
    if (databaseList.length > 0 && did && !currentDatabase) {
      const database = databaseList.find((item) => parseInt(did) === item.id);
      onChangeCurrentDatabase(database);
    } else if (databaseList.length > 0 && !currentDatabase) {
      onChangeCurrentDatabase(databaseList[0]);
    }
  }, [databaseList, currentDatabase]);
}
