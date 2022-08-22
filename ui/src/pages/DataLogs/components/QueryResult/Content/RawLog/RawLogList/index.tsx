import rawLogListStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/index.less";
import LogItem from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem";
import { useModel } from "@@/plugin-model/useModel";
import { useMemo } from "react";
import classNames from "classnames";

const RawLogList = () => {
  const { currentLogLibrary, logs, logPanesHelper } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const list = logs?.logs || [];
  return (
    <div className={classNames(rawLogListStyles.rawLogListMain)}>
      {list.map((logItem: any, index: number) => (
        <LogItem
          foldingChecked={oldPane?.foldingChecked}
          // TODO: 日志数据替换
          log={logItem}
          key={index}
        />
      ))}
    </div>
  );
};
export default RawLogList;
