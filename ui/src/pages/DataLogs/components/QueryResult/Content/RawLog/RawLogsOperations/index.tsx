import { FIRST_PAGE } from "@/config/config";
import { PaneType } from "@/models/datalogs/types";
import rawLogsOperationsStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/index.less";
import HistogramSwitch from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft";
import { useModel } from "@umijs/max";
import { Pagination } from "antd";
import { useMemo } from "react";
import { useIntl } from "umi";

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

  const isLink =
    currentLogLibrary?.id &&
    logPanes[currentLogLibrary.id.toString()].logState == 1;

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
        <Pagination
          size={"small"}
          total={logCount}
          pageSize={pageSize}
          current={currentPage}
          pageSizeOptions={isLink ? [50, 100, 200] : undefined}
          showTotal={(total) => {
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
                    logChart: { logs: [], isNeedSort: false, sortRule: ["*"] },
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
