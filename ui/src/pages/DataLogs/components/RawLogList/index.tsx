import rawLogListStyles from "@/pages/DataLogs/components/RawLogList/index.less";
import LogItem from "@/pages/DataLogs/components/RawLogList/LogItem";
import { useModel } from "@@/plugin-model/useModel";
import React, { useEffect } from "react";
import classNames from "classnames";
import useLogListScroll from "@/pages/DataLogs/hooks/useLogListScroll";

type LogItemContextType = {
  log: any;
};

export const LogItemContext = React.createContext<LogItemContextType>({
  log: {},
});
const RawLogList = () => {
  const { onChangeHiddenHighChart, logs } = useModel("dataLogs");
  const containerProps = useLogListScroll();

  useEffect(() => {
    if (containerProps.ref.current) {
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
        <LogItemContext.Provider key={index} value={{ log: logItem }}>
          <LogItem index={index} />
        </LogItemContext.Provider>
      ))}
    </div>
  );
};
export default RawLogList;
