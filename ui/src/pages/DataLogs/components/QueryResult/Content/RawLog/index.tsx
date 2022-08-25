import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import RawLogsIndexes from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes";
import { Spin } from "antd";
import classNames from "classnames";
import HighCharts from "@/pages/DataLogs/components/QueryResult/Content/RawLog/HighCharts";
import RawLogs from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogs";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import ManageIndexModal from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal";
import { useMemo } from "react";

const RawLogContent = (props: { tid: string }) => {
  const { tid } = props;
  const {
    currentLogLibrary,
    logsLoading,
    highChartLoading,
    isHiddenHighChart,
    logPanesHelper,
    lastLoadingTid,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const i18n = useIntl();

  return (
    <div className={queryResultStyles.content}>
      <RawLogsIndexes oldPane={oldPane} />
      <div className={queryResultStyles.queryDetail}>
        {oldPane?.histogramChecked && (
          <Spin
            spinning={
              lastLoadingTid == parseInt(tid) ? highChartLoading : false
            }
            tip={i18n.formatMessage({ id: "spin" })}
            wrapperClassName={classNames(
              queryResultStyles.querySpinning,
              isHiddenHighChart
                ? queryResultStyles.highChartsHidden
                : queryResultStyles.highCharts
            )}
          >
            <HighCharts oldPane={oldPane} />
          </Spin>
        )}
        <Spin
          spinning={lastLoadingTid == parseInt(tid) ? logsLoading : false}
          tip={i18n.formatMessage({ id: "spin" })}
          wrapperClassName={classNames(
            queryResultStyles.querySpinning,
            queryResultStyles.logs
          )}
        >
          <RawLogs oldPane={oldPane} />
        </Spin>
      </div>
      <ManageIndexModal />
    </div>
  );
};
export default RawLogContent;
