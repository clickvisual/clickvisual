import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import RawLogsIndexes from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes";
import { Spin } from "antd";
import classNames from "classnames";
import HighCharts from "@/pages/DataLogs/components/QueryResult/Content/RawLog/HighCharts";
import RawLogs from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogs";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import ManageIndexModal from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal";
import { useMemo, useState } from "react";

export enum IndexType {
  /**
   * 基础字段
   */
  baseField = 1,
  /**
   * 日志字段
   */
  logField = 2,
}

const RawLogContent = (props: { tid: string }) => {
  const { tid } = props;
  const {
    currentLogLibrary,
    logsLoading,
    highChartLoading,
    isHiddenHighChart,
    logPanesHelper,
    lastLoadingTid,
    doGetAnalysisField,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;
  const [baseActiveKey, setBaseActiveKey] = useState<string[]>([]);
  const [logActiveKey, setLogActiveKey] = useState<string[]>([]);

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const i18n = useIntl();

  return (
    <div className={queryResultStyles.content}>
      <div className={queryResultStyles.indexList}>
        <RawLogsIndexes
          oldPane={oldPane}
          indexType={IndexType.baseField}
          baseActiveKey={baseActiveKey}
          logActiveKey={logActiveKey}
          setLogActiveKey={setLogActiveKey}
          setBaseActiveKey={setBaseActiveKey}
        />
        <RawLogsIndexes
          oldPane={oldPane}
          indexType={IndexType.logField}
          baseActiveKey={baseActiveKey}
          logActiveKey={logActiveKey}
          setLogActiveKey={setLogActiveKey}
          setBaseActiveKey={setBaseActiveKey}
        />
      </div>
      <div className={queryResultStyles.queryDetail}>
        {oldPane?.histogramChecked && (
          <Spin
            spinning={
              lastLoadingTid == parseInt(tid)
                ? highChartLoading || doGetAnalysisField.loading
                : false
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
          spinning={
            lastLoadingTid == parseInt(tid)
              ? logsLoading || doGetAnalysisField.loading
              : false
          }
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
