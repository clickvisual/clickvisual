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
  TimeRangeType,
} from "@/config/config";
import moment from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";
import { useEffect } from "react";

export default function useLogUrlParams() {
  const [urlState, setUrlState] = useUrlState();
  const {
    currentLogLibrary,
    getDatabases,
    currentDatabase,
    onChangeLogLibrary,
    onChangeCurrentDatabase,
    startDateTime,
    endDateTime,
    currentPage,
    pageSize,
    keywordInput,
    activeTimeOptionIndex,
    activeTabKey,
    onChangeKeywordInput,
    onChangeLogsPageByUrl,
    onChangeStartDateTime,
    onChangeEndDateTime,
    onChangeActiveTabKey,
    onChangeActiveTimeOptionIndex,
    onChangeLogPanes,
    doParseQuery,
  } = useModel("dataLogs");

  const setUrlQuery = useDebounceFn(
    () => {
      setUrlState({
        databaseId: currentDatabase?.id,
        iid: currentDatabase?.iid,
        tid: currentLogLibrary?.id,
        tableName: currentLogLibrary?.tableName,
        start: startDateTime,
        end: endDateTime,
        page: currentPage,
        size: pageSize,
        kw: keywordInput,
        index: activeTimeOptionIndex,
        tab: activeTabKey,
      });
    },
    { wait: DEBOUNCE_WAIT }
  );

  useEffect(() => {
    setUrlQuery.run();
  }, [
    currentLogLibrary,
    startDateTime,
    endDateTime,
    currentPage,
    currentDatabase,
    pageSize,
    keywordInput,
    activeTimeOptionIndex,
    activeTabKey,
  ]);

  useEffect(() => {
    try {
      if (urlState.databaseId && urlState.iid)
        getDatabases.run({ iid: parseInt(urlState.iid) }).then((res) => {
          if (res?.code === 0) {
            const database = res.data.find(
              (item) => item.id === parseInt(urlState.databaseId)
            );
            if (database) {
              onChangeCurrentDatabase(database);

              const panes = [];
              if (urlState.tid && urlState.tableName) {
                onChangeLogLibrary({
                  id: parseInt(urlState.tid),
                  tableName: urlState.tableName,
                });
                panes.push({
                  pane: urlState.tableName,
                  paneId: parseInt(urlState.tid),
                  start:
                    parseInt(urlState.start) ||
                    moment().subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME).unix(),
                  end: parseInt(urlState.end) || currentTimeStamp(),
                  keyword: urlState.kw || undefined,
                  page: parseInt(urlState.page) || FIRST_PAGE,
                  pageSize: parseInt(urlState.size) || PAGE_SIZE,
                  activeTabKey: urlState.tab || TimeRangeType.Relative,
                  activeIndex: parseInt(urlState.index) || ACTIVE_TIME_INDEX,
                });
              }
              onChangeLogPanes(panes);
              onChangeStartDateTime(
                parseInt(urlState.start) ||
                  moment().subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME).unix()
              );
              onChangeEndDateTime(parseInt(urlState.end) || currentTimeStamp());
              if (urlState.tab) {
                onChangeActiveTabKey(urlState.tab);
              }
              if (urlState.index) {
                onChangeActiveTimeOptionIndex(parseInt(urlState.index));
              }
              onChangeKeywordInput(urlState.kw);
              onChangeLogsPageByUrl(
                parseInt(urlState.page) || FIRST_PAGE,
                parseInt(urlState.size) || PAGE_SIZE
              );
              doParseQuery(urlState.kw);
            }
          }
        });
    } catch (e) {
      console.log("【Error】: ", e);
    }
  }, []);
}
