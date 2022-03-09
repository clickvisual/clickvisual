import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { useContext, useMemo } from "react";
import { LogItemContext } from "@/pages/DataLogs/components/RawLogList";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import LogContentParse from "@/pages/DataLogs/components/RawLogList/LogItem/LogContentParse";
import { parseJsonObject } from "@/utils/string";
import lodash from "lodash";

const LogItemDetails = () => {
  const { log } = useContext(LogItemContext);
  const { logs, highlightKeywords, doUpdatedQuery, onCopyRawLogDetails } =
    useModel("dataLogs");

  const { keys, newLog, rawLogJson, rawLogKeys, indexRawLogKeys } =
    useMemo(() => {
      const hiddenFields = logs?.hiddenFields || [];
      const indexList =
        logs?.keys.map((item) => {
          return item.field;
        }) || [];

      let keys: string[] = Object.keys(log)
        .sort()
        .filter((key) => !hiddenFields.includes(key));
      let rawLogKeys: any[] = [];
      let indexRawLogKeys: any[] = [];
      const rawLogJson = parseJsonObject(log["_raw_log_"]);
      let newLog: any = log;

      if (!!rawLogJson) {
        indexRawLogKeys = Object.keys(rawLogJson).filter((item) =>
          indexList.includes(item)
        );

        rawLogKeys = Object.keys(rawLogJson).filter(
          (item) => !indexList.includes(item)
        );
        const oldLog = lodash.cloneDeep(log);
        const cloneRawLogJson = lodash.cloneDeep(rawLogJson);
        newLog = Object.assign(cloneRawLogJson, oldLog);

        keys = [...keys, ...rawLogKeys].filter((key, index) => {
          const preIdx = keys.indexOf(key);
          return preIdx < 0 || preIdx === index;
        });
        delete newLog._raw_log_;
        keys = keys.filter((key) => key !== "_raw_log_");
      }

      return { keys, newLog, rawLogJson, rawLogKeys, indexRawLogKeys };
    }, [logs, log]);

  const quickInsertQuery = (keyItem: string) => {
    const currentSelected = `${keyItem}='${log[keyItem]}'`;
    doUpdatedQuery(currentSelected);
  };

  const quickInsertLikeQuery = (key: string) => {
    const currentSelected = `_raw_log_ like '%${key}%'`;
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
          const isIndexAndRawLogKey =
            indexRawLogKeys.includes(keyItem) &&
            (!newLog[keyItem] || newLog[keyItem] === "") &&
            !!rawLogJson[keyItem];
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
                  onCopyRawLogDetails(
                    isIndexAndRawLogKey ? rawLogJson[keyItem] : newLog[keyItem]
                  );
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
                  onClick={() => {
                    if (notQuery || (!isIndexAndRawLogKey && !newLog[keyItem]))
                      return;
                    const insert = isIndexAndRawLogKey
                      ? quickInsertLikeQuery
                      : quickInsertQuery;
                    insert(keyItem);
                  }}
                  className={classNames(
                    logItemStyles.logContent,
                    flag && logItemStyles.logContentHighlight,

                    !["_time_nanosecond_"].includes(keyItem) &&
                      logItemStyles.logHover
                  )}
                >
                  {isIndexAndRawLogKey
                    ? rawLogJson[keyItem]
                    : newLog[keyItem]
                    ? newLog[keyItem]
                    : ""}
                </span>
              ) : (
                <LogContentParse
                  logContent={newLog[keyItem]}
                  quickInsertLikeQuery={quickInsertLikeQuery}
                />
              )}
            </div>
          );
        })}
    </div>
  );
};

export default LogItemDetails;
