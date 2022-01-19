import rawLogsOperationsStyles from "@/pages/DataLogs/components/RawLogsOperations/index.less";
import { Pagination } from "antd";
import { useModel } from "@@/plugin-model/useModel";

type RawLogsPaginationProps = {};

const RawLogsOperations = (props: RawLogsPaginationProps) => {
  const { logs, pageSize, currentPage, onChangeLogsPage } =
    useModel("dataLogs");

  return (
    <div className={rawLogsOperationsStyles.rawLogsOperationsMain}>
      <div className={rawLogsOperationsStyles.operationsBtn} />
      <div className={rawLogsOperationsStyles.pagination}>
        <Pagination
          size={"small"}
          total={logs?.count}
          pageSize={pageSize}
          current={currentPage}
          showTotal={(total) => `日志总条数 ${total}`}
          onChange={onChangeLogsPage}
          showSizeChanger
        />
      </div>
    </div>
  );
};
export default RawLogsOperations;
