import rawLogListStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/index.less";
import LogItem from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import { PaneType } from "@/models/datalogs/types";

const RawLogList = ({ oldPane }: { oldPane: PaneType | undefined }) => {
  const { logs } = useModel("dataLogs");

  const list = logs?.logs || [];
  return (
    <div className={classNames(rawLogListStyles.rawLogListMain)}>
      {list.map((logItem: any, index: number) => (
        <LogItem
          foldingChecked={oldPane?.foldingChecked}
          log={logItem}
          key={index}
        />
      ))}
    </div>
  );
};
export default RawLogList;
