import rawLogsOperationsStyles from "@/pages/DataLogs/components/RawLogsOperations/index.less";
import { Pagination } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { FIRST_PAGE } from "@/config/config";
import { useMemo } from "react";
import { PaneType } from "@/models/datalogs/useLogPanes";

const RawLogsOperations = () => {
  const {
    logCount,
    pageSize,
    currentPage,
    onChangeLogsPage,
    currentLogLibrary,
    doGetLogsAndHighCharts,
    onChangeLogPane,
    logPanesHelper,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;
  const i18n = useIntl();

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  return (
    <div className={rawLogsOperationsStyles.rawLogsOperationsMain}>
      <div className={rawLogsOperationsStyles.operationsBtn} />
      <div className={rawLogsOperationsStyles.pagination}>
        <Pagination
          size={"small"}
          total={logCount}
          pageSize={pageSize}
          current={currentPage}
          showTotal={(total) =>
            i18n.formatMessage({ id: "log.pagination.total" }, { total })
          }
          onChange={(current: number, size: number) => {
            onChangeLogsPage(current, size);
            const params = {
              page: size === pageSize ? current : FIRST_PAGE,
              pageSize: size,
            };
            doGetLogsAndHighCharts(
              currentLogLibrary?.id as number,
              params
            ).then((res) => {
              if (!res) return;
              const pane: PaneType = {
                ...(oldPane as PaneType),
                page: size === pageSize ? current : FIRST_PAGE,
                pageSize: size,
                logs: res.logs,
                highCharts: res.highCharts,
              };
              onChangeLogPane(pane);
            });
          }}
          showSizeChanger
        />
      </div>
    </div>
  );
};
export default RawLogsOperations;
