import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import SearchBar from "@/pages/DataLogs/components/SearchBar";
import HighCharts from "@/pages/DataLogs/components/HighCharts";
import RawLogs from "@/pages/DataLogs/components/RawLogs";
import { useModel } from "@@/plugin-model/useModel";
import { Spin } from "antd";
import classNames from "classnames";
import RawLogsIndexes from "@/pages/DataLogs/components/RawLogsIndexes";
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
import useUrlState from "@ahooksjs/use-url-state";
import ManageIndexModal from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal";

type QueryResultProps = {};
const QueryResult = (props: QueryResultProps) => {
  const {} = props;
  const [urlState, setUrlState] = useUrlState();
  const {
    currentLogLibrary,
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
    logsLoading,
    highChartLoading,
  } = useModel("dataLogs");
  const isShare = document.location.pathname === "/share";

  const setUrlQuery = useDebounceFn(
    () => {
      setUrlState({
        db: currentDatabase?.databaseName,
        in: currentDatabase?.instanceName,
        dt: currentDatabase?.datasourceType,
        inId: currentDatabase?.instanceId,
        lb: currentLogLibrary,
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
      if (urlState.db && urlState.in && urlState.dt)
        onChangeCurrentDatabase({
          databaseName: urlState.db,
          instanceName: urlState.in,
          datasourceType: urlState.dt,
          instanceId: parseInt(urlState.inId),
        });
      onChangeLogLibrary(urlState?.lb);
      if (urlState.start && urlState.end) {
        onChangeStartDateTime(parseInt(urlState.start));
        onChangeEndDateTime(parseInt(urlState.end));
      }
      if (urlState.tab) {
        onChangeActiveTabKey(urlState.tab);
      }
      if (urlState.index) {
        onChangeActiveTimeOptionIndex(parseInt(urlState.index));
      }
      const panes = [];
      if (urlState.lb)
        panes.push({
          pane: urlState.lb,
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
      onChangeLogPanes(panes);
      onChangeKeywordInput(urlState.kw);
      onChangeLogsPageByUrl(
        parseInt(urlState.page) || FIRST_PAGE,
        parseInt(urlState.size) || PAGE_SIZE
      );
    } catch (e) {
      console.log("【Error】: ", e);
    }
  }, []);
  return (
    <div
      className={classNames(
        queryResultStyles.queryResultMain,
        isShare && queryResultStyles.shareMain
      )}
    >
      <SearchBar />
      <Spin
        spinning={logsLoading || highChartLoading}
        tip={"加载中..."}
        wrapperClassName={queryResultStyles.querySpinning}
      >
        <RawLogsIndexes />
        <div className={queryResultStyles.queryDetail}>
          <HighCharts />
          <RawLogs />
        </div>
      </Spin>
      <ManageIndexModal />
    </div>
  );
};
export default QueryResult;
