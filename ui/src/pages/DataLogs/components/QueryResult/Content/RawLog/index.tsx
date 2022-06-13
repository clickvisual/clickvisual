import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import RawLogsIndexes from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes";
import { Spin } from "antd";
import classNames from "classnames";
import HighCharts from "@/pages/DataLogs/components/QueryResult/Content/RawLog/HighCharts";
import RawLogs from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogs";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import ManageIndexModal from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal";
import CollapseMenu from "../../../CollapseAndExpandMenu/CollapseMenu";
import { useMemo } from "react";

const RawLogContent = () => {
  const {
    currentLogLibrary,
    logsLoading,
    highChartLoading,
    isHiddenHighChart,
    logPanesHelper,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const i18n = useIntl();

  return (
    <div className={queryResultStyles.content}>
      <RawLogsIndexes />
      <div className={queryResultStyles.queryDetail}>
        {oldPane?.histogramChecked && (
          <Spin
            spinning={highChartLoading}
            tip={i18n.formatMessage({ id: "spin" })}
            wrapperClassName={classNames(
              queryResultStyles.querySpinning,
              isHiddenHighChart
                ? queryResultStyles.highChartsHidden
                : queryResultStyles.highCharts
            )}
          >
            <HighCharts />
          </Spin>
        )}
        <Spin
          spinning={logsLoading}
          tip={i18n.formatMessage({ id: "spin" })}
          wrapperClassName={classNames(
            queryResultStyles.querySpinning,
            queryResultStyles.logs
          )}
        >
          <RawLogs />
        </Spin>
      </div>
      <ManageIndexModal />
      <CollapseMenu />
    </div>
  );
};
export default RawLogContent;
