import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { useContext } from "react";
import { LogItemContext } from "@/pages/DataLogs/components/RawLogList";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import LogContentParse from "@/pages/DataLogs/components/RawLogList/LogItem/LogContentParse";

const LogItemDetails = () => {
  const { log } = useContext(LogItemContext);
  const { highlightKeywords, doUpdatedQuery, onCopyRawLogDetails } =
    useModel("dataLogs");
  const keys = Object.keys(log).sort();

  const quickInsertQuery = (keyItem: string) => {
    const currentSelected = `${keyItem}='${log[keyItem]}'`;
    doUpdatedQuery(currentSelected);
  };

  return (
    <div className={logItemStyles.details}>
      {keys.length > 0 &&
        keys.map((keyItem, index) => {
          let flag = false;
          if (highlightKeywords) {
            flag = !!highlightKeywords.find((item) => item.key === keyItem);
          }
          const isRawLog = keyItem === "_raw_log_";
          const notQuery = ["_trace_time_", "_timestamp_"].includes(keyItem);
          return (
            <div key={index} className={logItemStyles.logLine}>
              <div
                className={classNames(
                  logItemStyles.logKey,
                  isRawLog && logItemStyles.logKeyHover
                )}
                onClick={() => {
                  if (!isRawLog) return;
                  onCopyRawLogDetails(log[keyItem]);
                }}
              >
                <span>{keyItem}</span>:
              </div>
              {!isRawLog ? (
                <span
                  onClick={() => !notQuery && quickInsertQuery(keyItem)}
                  className={classNames(
                    logItemStyles.logContent,
                    flag && logItemStyles.logContentHighlight,
                    !["_trace_time_", "_timestamp_"].includes(keyItem) &&
                      logItemStyles.logHover
                  )}
                >
                  {log[keyItem]}
                </span>
              ) : (
                <LogContentParse logContent={log[keyItem]} />
              )}
            </div>
          );
        })}
    </div>
  );
};

export default LogItemDetails;
