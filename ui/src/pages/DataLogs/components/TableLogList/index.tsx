import tableLogStyles from "@/pages/DataLogs/components/TableLogList/index.less";
import { useModel } from "@@/plugin-model/useModel";
import useLogListScroll from "@/pages/DataLogs/hooks/useLogListScroll";
import { useEffect } from "react";

type TableLogListProps = {};
const TableLogList = (props: TableLogListProps) => {
  const { onChangeHiddenHighChart, logs } = useModel("dataLogs");
  const containerProps = useLogListScroll();

  useEffect(() => {
    if (containerProps.ref.current) {
      containerProps.ref.current.scrollTop = 0;
      onChangeHiddenHighChart(false);
    }
  }, [logs]);

  return (
    <div {...containerProps} className={tableLogStyles.tableLogListMain} />
  );
};
export default TableLogList;
