import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { useContext, useMemo } from "react";
import { LogItemContext } from "@/pages/DataLogs/components/RawLogList";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import LogContentParse from "@/pages/DataLogs/components/RawLogList/LogItem/LogContentParse";
import { parseJsonObject } from "@/utils/string";

const LogItemDetails = () => {
  const { log } = useContext(LogItemContext);
  const { logs, highlightKeywords, doUpdatedQuery, onCopyRawLogDetails } =
    useModel("dataLogs");

  const { keys, newLog, rawLogJson, rawLogKeys } = useMemo(() => {
    const hiddenFields = logs?.hiddenFields || [];
    const indexList =
      logs?.keys.map((item) => {
        return item.field;
      }) || [];

    let keys: string[] = Object.keys(log)
      .sort()
      .filter((key) => !hiddenFields.includes(key));
    let rawLogKeys: any[] = [];
    const rawLogJson = parseJsonObject(log["_raw_log_"]);
    let newLog: any = log;

    if (!!rawLogJson) {
      rawLogKeys = Object.keys(rawLogJson).filter(
        (item) => !indexList.includes(item)
      );
      newLog = Object.assign(rawLogJson, log);

      keys = [...keys, ...rawLogKeys].filter((key, index) => {
        const preIdx = keys.indexOf(key);
        return preIdx < 0 || preIdx === index;
      });
      delete newLog._raw_log_;
      keys = keys.filter((key) => key !== "_raw_log_");
    }

    return { keys, newLog, rawLogJson, rawLogKeys };
  }, [logs, log]);

  const quickInsertQuery = (keyItem: string) => {
    const currentSelected = `${keyItem}='${log[keyItem]}'`;
    doUpdatedQuery(currentSelected);
  };

  return (
    <div className={logItemStyles.details}>
      {keys.length > 0 &&
        keys.map((keyItem) => {
          let flag = false;
          if (highlightKeywords) {
            flag = !!highlightKeywords.find((item) => item.key === keyItem);
          }
          const isRawLog =
            (rawLogJson && rawLogKeys.includes(keyItem)) ||
            keyItem === "_raw_log_";
          const notQuery = ["_time_nanosecond_"].includes(keyItem);
          return (
            <div key={keyItem} className={logItemStyles.logLine}>
              <div
                className={classNames(
                  logItemStyles.logKey,
                  isRawLog && logItemStyles.logKeyHover
                )}
                onClick={() => {
                  if (!isRawLog && !rawLogJson) return;
                  onCopyRawLogDetails(log[keyItem]);
                }}
              >
                <span
                  className={classNames(
                    rawLogKeys.includes(keyItem) &&
                      logItemStyles.notIndexContent
                  )}
                >
                  {keyItem}
                </span>
                :
              </div>
              {!isRawLog ? (
                <span
                  onClick={() =>
                    !notQuery && !!newLog[keyItem] && quickInsertQuery(keyItem)
                  }
                  className={classNames(
                    logItemStyles.logContent,
                    flag && logItemStyles.logContentHighlight,

                    !["_time_nanosecond_"].includes(keyItem) &&
                      logItemStyles.logHover
                  )}
                >
                  {newLog[keyItem] ? newLog[keyItem] : ""}
                </span>
              ) : (
                <LogContentParse logContent={newLog[keyItem]} />
              )}
            </div>
          );
        })}
    </div>
  );
};

export default LogItemDetails;
