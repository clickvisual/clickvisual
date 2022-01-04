import rawLogListStyles from '@/pages/DataLogs/components/RawLogList/index.less';
import LogItem from '@/pages/DataLogs/components/RawLogList/LogItem';
import { useModel } from '@@/plugin-model/useModel';
import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';

type RawLogListProps = {};
type LogItemContextType = {
  log: any;
};

export const LogItemContext = React.createContext<LogItemContextType>({ log: {} });
const RawLogList = (props: RawLogListProps) => {
  // 用于监听日志列表滚动
  const logListRef = useRef<HTMLDivElement | null>(null);
  const { onChangeHiddenHighChart, logs } = useModel('dataLogs');

  const onChangeScroll = () => {
    if (logListRef.current) {
      if (logListRef.current.scrollTop < 300) {
        onChangeHiddenHighChart(false);
      } else {
        onChangeHiddenHighChart(true);
      }
    } else {
      onChangeHiddenHighChart(true);
    }
  };

  const LogsBackToTop = () => {
    if (logListRef.current) {
      logListRef.current.scrollTop = 0;
      onChangeHiddenHighChart(false);
    }
  };

  useEffect(() => {
    LogsBackToTop();
  }, [logs]);

  const list = logs?.logs || [];
  return (
    <div
      className={classNames(rawLogListStyles.rawLogListMain)}
      ref={logListRef}
      onScrollCapture={onChangeScroll}
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
