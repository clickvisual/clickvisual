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
      // 隐藏字段
      const hiddenFields = logs?.hiddenFields || [];

      // 索引字段
      const indexList =
        logs?.keys.map((item) => {
          return item.field;
        }) || [];

      // 原日志字段
      let keys: string[] = Object.keys(log)
        .sort()
        .filter((key) => !hiddenFields.includes(key));
      // 存储 rawLog 非索引字段
      let rawLogKeys: any[] = [];
      // 存储 rawLog 字段中的索引字段
      let indexRawLogKeys: any[] = [];
      // 取出 rawLog 日志字段并转成 Json ，parseJsonObject 回参数 Json || false
      const rawLogJson = parseJsonObject(log["_raw_log_"]);

      // 初始化新日志数组，初始化为 log
      let newLog: any = log;

      if (!!rawLogJson) {
        // 如果 rawLog 字段 Json 存在
        // rawLog 字段中的索引字段
        indexRawLogKeys = Object.keys(rawLogJson).filter((item) =>
          indexList.includes(item)
        );

        // rawLog 中非索引字段
        rawLogKeys = Object.keys(rawLogJson).filter(
          (item) => !indexList.includes(item)
        );

        // 拷贝原始 log
        const oldLog = lodash.cloneDeep(log);
        // 拷贝 rawLog Json
        const cloneRawLogJson = lodash.cloneDeep(rawLogJson);

        // old 覆盖 rawLog Json
        newLog = Object.assign(cloneRawLogJson, oldLog);

        // 合并 log 和 rawLog 的 key，并去重
        keys = [...keys, ...rawLogKeys].filter((key, index) => {
          const preIdx = keys.indexOf(key);
          return preIdx < 0 || preIdx === index;
        });

        // 删除 原日志中 raw log 字段
        delete newLog._raw_log_;

        // 去掉 keys 中的 raw log 字段
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

  const handleInsertQuery = (keyItem: string, isIndexAndRawLogKey: boolean) => {
    if (
      ["_time_nanosecond_"].includes(keyItem) ||
      (!isIndexAndRawLogKey && !newLog[keyItem])
    )
      return;
    const insert = isIndexAndRawLogKey
      ? quickInsertLikeQuery
      : quickInsertQuery;
    insert(keyItem);
  };

  const handleCopyLog = (
    keyItem: string,
    isRawLog: boolean,
    isIndexAndRawLogKey: boolean
  ) => {
    if (!isRawLog && !rawLogJson) return;
    onCopyRawLogDetails(
      isIndexAndRawLogKey ? rawLogJson[keyItem] : newLog[keyItem]
    );
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
          return (
            <div key={keyItem} className={logItemStyles.logLine}>
              <div
                className={classNames(
                  logItemStyles.logKey,
                  isRawLog && logItemStyles.logKeyHover
                )}
                onClick={() =>
                  handleCopyLog(keyItem, isRawLog, isIndexAndRawLogKey)
                }
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
                    handleInsertQuery(keyItem, isIndexAndRawLogKey)
                  }
                  className={classNames(
                    logItemStyles.logContent,
                    flag && logItemStyles.logContentHighlight,

                    !["_time_nanosecond_"].includes(keyItem) &&
                      logItemStyles.logHover
                  )}
                >
                  {isIndexAndRawLogKey
                    ? rawLogJson[keyItem]
                    : newLog.hasOwnProperty(keyItem)
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
