import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import SearchBar from "@/pages/DataLogs/components/SearchBar";
import HighCharts from "@/pages/DataLogs/components/HighCharts";
import RawLogs from "@/pages/DataLogs/components/RawLogs";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import RawLogsIndexes from "@/pages/DataLogs/components/RawLogsIndexes";
import { SpinWrap } from "@/pages/DataLogs/components/QueryResult/SpinWrap";

const QueryResult = () => {
  const { logsLoading, highChartLoading, isHiddenHighChart } =
    useModel("dataLogs");
  const isShare = document.location.pathname === "/share" || "/share/";

  return (
    <div
      className={classNames(
        queryResultStyles.queryResultMain,
        isShare && queryResultStyles.shareMain
      )}
    >
      <SearchBar />
      <div className={queryResultStyles.content}>
        <RawLogsIndexes />
        <div className={queryResultStyles.queryDetail}>
          <SpinWrap
            loading={highChartLoading}
            className={classNames(
              isHiddenHighChart
                ? queryResultStyles.highChartsHidden
                : queryResultStyles.highCharts
            )}
          >
            <HighCharts />
          </SpinWrap>
          <SpinWrap loading={logsLoading} className={queryResultStyles.logs}>
            <RawLogs />
          </SpinWrap>
        </div>
      </div>
    </div>
  );
};

export default QueryResult;
