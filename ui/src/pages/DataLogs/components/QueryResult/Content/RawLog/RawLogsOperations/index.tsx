import rawLogsOperationsStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/index.less";
import { Pagination } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { FIRST_PAGE } from "@/config/config";
import { PaneType } from "@/models/datalogs/types";
import HistogramSwitch from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft";
import { useMemo } from "react";

const RawLogsOperations = ({ oldPane }: { oldPane: PaneType | undefined }) => {
  const {
    logCount,
    pageSize,
    currentPage,
    onChangeLogsPage,
    currentLogLibrary,
    doGetLogsAndHighCharts,
    onChangeLogPane,
    logPanesHelper,
    resetLogPaneLogsAndHighCharts,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const i18n = useIntl();

  const performTime = useMemo(() => {
    return logPanes[currentLogLibrary?.id || 0]?.logs?.cost;
  }, [logPanes]);

  return (
    <div className={rawLogsOperationsStyles.rawLogsOperationsMain}>
      <div className={rawLogsOperationsStyles.operationsBtn}>
        <HistogramSwitch oldPane={oldPane} />
      </div>
      {performTime ? (
        <div className={rawLogsOperationsStyles.duration}>
          {i18n.formatMessage({ id: "log.perform.time" })}:&nbsp;
          {performTime}ms
        </div>
      ) : null}
      <div className={rawLogsOperationsStyles.pagination}>
        {currentLogLibrary?.id &&
        logPanes[currentLogLibrary.id.toString()].logState == 1 ? (
          i18n.formatMessage(
            { id: "log.pagination.total" },
            { total: logCount }
          )
        ) : (
          <Pagination
            size={"small"}
            total={logCount}
            pageSize={pageSize}
            current={currentPage}
            showTotal={(total) => {
              if (!oldPane?.histogramChecked) {
                return false;
              }
              return i18n.formatMessage(
                { id: "log.pagination.total" },
                { total }
              );
            }}
            onChange={(current: number, size: number) => {
              onChangeLogsPage(current, size);
              const params = {
                page: size === pageSize ? current : FIRST_PAGE,
                pageSize: size,
              };
              doGetLogsAndHighCharts(currentLogLibrary?.id as number, {
                isPaging: true,
                reqParams: params,
              })
                .then((res) => {
                  if (!res) {
                    resetLogPaneLogsAndHighCharts({
                      ...(oldPane as PaneType),
                      page: size === pageSize ? current : FIRST_PAGE,
                      pageSize: size,
                    });
                  } else {
                    const pane: PaneType = {
                      ...(oldPane as PaneType),
                      page: size === pageSize ? current : FIRST_PAGE,
                      pageSize: size,
                      logs: res.logs,
                      highCharts: res.highCharts,
                      logChart: { logs: [] },
                    };
                    onChangeLogPane(pane);
                  }
                })
                .catch(() =>
                  resetLogPaneLogsAndHighCharts({
                    ...(oldPane as PaneType),
                    page: size === pageSize ? current : FIRST_PAGE,
                    pageSize: size,
                  })
                );
            }}
            showSizeChanger
          />
        )}
      </div>
    </div>
  );
};
export default RawLogsOperations;
