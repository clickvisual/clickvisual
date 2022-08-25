import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { useMemo } from "react";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import { parseJsonObject } from "@/utils/string";
import lodash from "lodash";
import { REG_SEPARATORS } from "@/components/JsonView/JsonStringValue";
import LogContent from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogContent";

interface LogItemDetailsProps {
  log: any;
  foldingChecked?: boolean;
}

const LogItemDetails = ({ log, foldingChecked }: LogItemDetailsProps) => {
  const {
    logs,
    highlightKeywords,
    doUpdatedQuery,
    onCopyRawLogDetails,
    quickInsertLikeQuery,
    quickInsertLikeExclusion,
  } = useModel("dataLogs");

  const {
    keys,
    newLog,
    rawLogJson,
    rawLogKeys,
    indexRawLogKeys,
    indexList,
    secondaryIndexList,
  } = useMemo(() => {
    // 隐藏字段
    const hiddenFields: string[] =
      logs?.hiddenFields?.filter((key, index) => {
        const fields = logs?.hiddenFields || [];
        const preIdx = fields.indexOf(key);
        return preIdx < 0 || preIdx === index;
      }) || [];

    // Json 索引
    const secondaryIndexList: any = [];
    // 索引字段
    const indexList =
      logs?.keys.map((item) => {
        if (item?.rootName && item?.rootName !== "") {
          secondaryIndexList.push({
            parentKey: item?.rootName,
            keyItem: item.field,
          });

          return `${item?.rootName}.${item.field}`;
        }
        return item.field;
      }) || [];

    // 原日志字段
    let keys: string[] = Object.keys(log).sort();

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
      keys = [...keys, ...indexRawLogKeys, ...rawLogKeys].filter(
        (key, index) => {
          const preIdx = keys.indexOf(key);
          return preIdx < 0 || preIdx === index;
        }
      );

      // 删除 原日志中 raw log 字段
      delete newLog._raw_log_;

      // 去掉 keys 中的 raw log 字段
      keys = keys.filter((key) => key !== "_raw_log_");
    }
    //去除隐藏字段
    keys = keys.filter((key) => !hiddenFields.includes(key));

    return {
      keys,
      newLog,
      indexList,
      rawLogJson,
      rawLogKeys,
      indexRawLogKeys,
      secondaryIndexList,
    };
  }, [logs, logs?.keys, log]);

  const quickInsertQuery = (keyItem: string) => {
    const currentSelected = "`" + keyItem + "`" + "=" + `'${newLog[keyItem]}'`;
    doUpdatedQuery(currentSelected);
  };

  const quickInsertExclusion = (keyItem: string) => {
    const currentSelected = "`" + keyItem + "`" + "!=" + `'${newLog[keyItem]}'`;
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

  const handleInsertExclusion = (
    keyItem: string,
    isIndexAndRawLogKey: boolean
  ) => {
    if (
      ["_time_nanosecond_"].includes(keyItem) ||
      (!isIndexAndRawLogKey && !newLog[keyItem])
    )
      return;
    const insert = isIndexAndRawLogKey
      ? quickInsertLikeExclusion
      : quickInsertExclusion;
    insert(keyItem);
  };

  const handleCopyLog = (keyItem: string) => {
    onCopyRawLogDetails(keyItem);
  };

  const logItemList = useMemo(() => {
    if (keys.length <= 0) return [];
    return keys.map((keyItem) => {
      let highlightFlag = false;
      if (highlightKeywords) {
        highlightFlag = !!highlightKeywords.find(
          (item) => item.key === keyItem
        );
      }

      const isIndexAndRawLogKey =
        indexRawLogKeys.includes(keyItem) &&
        (!newLog[keyItem] || newLog[keyItem] === "") &&
        !!rawLogJson[keyItem];

      const isRawLog =
        (rawLogJson && rawLogKeys.includes(keyItem)) || keyItem === "_raw_log_";

      const isNotTimeKey = !["_time_nanosecond_", "_time_second_"].includes(
        keyItem
      );

      let content = "";
      if (isIndexAndRawLogKey && !!parseJsonObject(rawLogJson[keyItem])) {
        content = JSON.stringify(rawLogJson[keyItem]);
      }

      if (isIndexAndRawLogKey && !parseJsonObject(rawLogJson[keyItem])) {
        content = rawLogJson[keyItem];
      }

      if (!isIndexAndRawLogKey && newLog.hasOwnProperty(keyItem)) {
        content = newLog[keyItem];
      }

      let regSpeFlag = false;

      if (!isRawLog) {
        REG_SEPARATORS.forEach((item) => {
          if (content?.toString().includes(item)) {
            regSpeFlag = content?.toString().includes(item);
          }
        });
      }

      return {
        highlightFlag,
        isIndexAndRawLogKey,
        isRawLog,
        key: keyItem,
        content,
        isNotTimeKey,
        regSpeFlag,
      };
    });
  }, [
    keys,
    newLog,
    rawLogJson,
    rawLogKeys,
    indexRawLogKeys,
    logs,
    logs?.keys,
    log,
  ]);

  return (
    <div className={logItemStyles.details}>
      {logItemList.length > 0 &&
        logItemList.map(
          ({
            regSpeFlag,
            highlightFlag,
            isIndexAndRawLogKey,
            isRawLog,
            key,
            content,
            isNotTimeKey,
          }) => (
            <div key={key} className={logItemStyles.logLine}>
              <div
                className={classNames(
                  logItemStyles.logKey,
                  logItemStyles.logKeyHover
                )}
                onClick={() => handleCopyLog(key)}
              >
                <span
                  className={classNames(
                    rawLogKeys.includes(key) &&
                      !indexList.includes(key) &&
                      logItemStyles.notIndexContent
                  )}
                >
                  {key}
                </span>
                :
              </div>
              <LogContent
                foldingChecked={foldingChecked}
                isRawLog={isRawLog}
                regSpeFlag={regSpeFlag}
                content={content}
                keyItem={key}
                secondaryIndexList={secondaryIndexList}
                quickInsertLikeQuery={quickInsertLikeQuery}
                quickInsertLikeExclusion={quickInsertLikeExclusion}
                onInsertQuery={handleInsertQuery}
                onInsertExclusion={handleInsertExclusion}
                isIndexAndRawLogKey={isIndexAndRawLogKey}
                highlightFlag={highlightFlag}
                isNotTimeKey={isNotTimeKey}
                newLog={newLog}
              />
            </div>
          )
        )}
    </div>
  );
};

export default LogItemDetails;
