import rawLogsOperationsStyles from "@/pages/DataLogs/components/RawLogsOperations/index.less";
import { Pagination } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";

const RawLogsOperations = () => {
  const { logs, pageSize, currentPage, onChangeLogsPage } =
    useModel("dataLogs");
  const i18n = useIntl();

  return (
    <div className={rawLogsOperationsStyles.rawLogsOperationsMain}>
      <div className={rawLogsOperationsStyles.operationsBtn} />
      <div className={rawLogsOperationsStyles.pagination}>
        <Pagination
          size={"small"}
          total={logs?.count}
          pageSize={pageSize}
          current={currentPage}
          showTotal={(total) =>
            i18n.formatMessage({ id: "log.pagination.total" }, { total })
          }
          onChange={onChangeLogsPage}
          showSizeChanger
        />
      </div>
    </div>
  );
};
export default RawLogsOperations;
