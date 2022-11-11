import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import RawLogsIndexes from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes";
import { Spin } from "antd";
import classNames from "classnames";
import HighCharts from "@/pages/DataLogs/components/QueryResult/Content/RawLog/HighCharts";
import RawLogs from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogs";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import ManageIndexModal from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal";
import { useEffect, useMemo, useState } from "react";

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
    doGetColumns,
    columsList,
    onChangeColumsList,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const i18n = useIntl();

  useEffect(() => {
    tid &&
      doGetColumns.run(parseInt(tid)).then((res: any) => {
        if (res.code != 0) return;
        let arr: string[] = [];
        res.data.map((item: any) => {
          arr.push(item.name);
        });
        onChangeColumsList(arr);
      });
  }, [tid]);

  return (
    <div className={queryResultStyles.content}>
      <RawLogsIndexes oldPane={oldPane} />
      {columsList.length > 0 && (
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
      )}

      <ManageIndexModal />
    </div>
  );
};
export default RawLogContent;
