import rawLogListStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/index.less";
import LogItem from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo } from "react";
import classNames from "classnames";
import useLogListScroll from "@/pages/DataLogs/hooks/useLogListScroll";

const RawLogList = () => {
  const { currentLogLibrary, onChangeHiddenHighChart, logs, logPanesHelper } =
    useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const containerProps = useLogListScroll();

  useEffect(() => {
    if (containerProps.ref.current && oldPane?.histogramChecked) {
      containerProps.ref.current.scrollTop = 0;
      onChangeHiddenHighChart(false);
    }
  }, [logs]);

  const list = logs?.logs || [];
  return (
    <div
      className={classNames(rawLogListStyles.rawLogListMain)}
      {...containerProps}
    >
      {list.map((logItem: any, index: number) => (
        <LogItem log={logItem} />
      ))}
    </div>
  );
};
export default RawLogList;
