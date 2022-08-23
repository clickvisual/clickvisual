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

  // todo: logPanes[currentLogLibrary?.id || 0] 和 oldPane 是否是一样的？
  const performTime = useMemo(() => {
    return logPanes[currentLogLibrary?.id || 0]?.logs?.cost;
  }, [logPanes]);

  return (
    <div className={rawLogsOperationsStyles.rawLogsOperationsMain}>
      <div className={rawLogsOperationsStyles.operationsBtn}>
        <HistogramSwitch oldPane={oldPane} />
      </div>
      {performTime ? (
        <div style={{ flex: 1, textAlign: "right", marginRight: "20px" }}>
          {i18n.formatMessage({ id: "log.perform.time" })}：
          {/* todo: performTime 和 logPanes[currentLogLibrary?.id || 0]?.logs?.cost 不是一样的吗？*/}
          {logPanes[currentLogLibrary?.id || 0]?.logs?.cost}ms
        </div>
      ) : null}
      <div className={rawLogsOperationsStyles.pagination}>
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
      </div>
    </div>
  );
};
export default RawLogsOperations;
