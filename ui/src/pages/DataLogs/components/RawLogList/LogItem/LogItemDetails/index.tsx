import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { useContext } from "react";
import { LogItemContext } from "@/pages/DataLogs/components/RawLogList";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import LogContentParse from "@/pages/DataLogs/components/RawLogList/LogItem/LogContentParse";
import { parseJsonObject } from "@/utils/string";

const LogItemDetails = () => {
  const { log } = useContext(LogItemContext);
  const { logs, highlightKeywords, doUpdatedQuery, onCopyRawLogDetails } =
    useModel("dataLogs");

  const hiddenFields = logs?.hiddenFields || [];

  const indexList =
    logs?.keys.map((item) => {
      return item.field;
    }) || [];

  let keys: string[] = Object.keys(log).sort();
  let rawLogKeys: any[] = [];
  const rowLogJson = parseJsonObject(log["_raw_log_"]);
  let newLogs: any = log;

  if (!!rowLogJson) {
    rawLogKeys = Object.keys(rowLogJson).filter(
      (item) => !indexList.includes(item)
    );
    newLogs = Object.assign(rowLogJson, log);

    keys = [...keys, ...rawLogKeys]
      .filter((key, index) => {
        const preIdx = keys.indexOf(key);
        return preIdx < 0 || preIdx === index;
      })
      .filter((key) => !hiddenFields.includes(key));
    delete newLogs._raw_log_;
    keys = keys.filter((key) => key !== "_raw_log_");
  }

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
          const isRawLog =
            (rowLogJson && rawLogKeys.includes(keyItem)) ||
            keyItem === "_row_log_";
          const notQuery = ["_time_nanosecond_"].includes(keyItem);
          return (
            <div key={index} className={logItemStyles.logLine}>
              <div
                className={classNames(
                  logItemStyles.logKey,
                  isRawLog && logItemStyles.logKeyHover
                )}
                onClick={() => {
                  if (!isRawLog && !rowLogJson) return;
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
                    !notQuery && !!newLogs[keyItem] && quickInsertQuery(keyItem)
                  }
                  className={classNames(
                    logItemStyles.logContent,
                    flag && logItemStyles.logContentHighlight,

                    !["_time_nanosecond_"].includes(keyItem) &&
                      logItemStyles.logHover
                  )}
                >
                  {newLogs[keyItem] ? newLogs[keyItem] : ""}
                </span>
              ) : (
                <LogContentParse logContent={newLogs[keyItem]} />
              )}
            </div>
          );
        })}
    </div>
  );
};

export default LogItemDetails;
