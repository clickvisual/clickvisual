import rawLogsOperationsStyles from "@/pages/DataLogs/components/RawLogsOperations/index.less";
import { Pagination } from "antd";
import { useModel } from "@@/plugin-model/useModel";

type RawLogsPaginationProps = {};

const RawLogsOperations = (props: RawLogsPaginationProps) => {
  const {
    // activeTableLog,
    logs,
    pageSize,
    currentPage,
    onChangeLogsPage,
    // onChangeActiveTableLog,
  } = useModel("dataLogs");

  // const debounceActiveTable = useDebounceFn(
  //   () => {
  //     onChangeActiveTableLog(!activeTableLog);
  //   },
  //   { wait: DEBOUNCE_WAIT }
  // ).run;
  return (
    <div className={rawLogsOperationsStyles.rawLogsOperationsMain}>
      <div className={rawLogsOperationsStyles.operationsBtn}>
        {/*<Tooltip title={"表格"}>*/}
        {/*  <div*/}
        {/*    className={rawLogsOperationsStyles.tableBtn}*/}
        {/*    onClick={debounceActiveTable}*/}
        {/*  >*/}
        {/*    <IconFont*/}
        {/*      type={activeTableLog ? "icon-active-table" : "icon-table"}*/}
        {/*    />*/}
        {/*  </div>*/}
        {/*</Tooltip>*/}
      </div>
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
