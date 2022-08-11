import { parseJsonObject } from "@/utils/string";
import { LogsResponse } from "@/services/dataLogs";
import lodash from "lodash";

const RawLogField = "_raw_log_";

/**
 * 处理单条日志格式
 * @param logs
 * @param log
 */
const LogItemDetail = (logs: LogsResponse | undefined, log: any) => {
  // 隐藏字段
  const hiddenFields: string[] =
    logs?.hiddenFields?.filter((key, index) => {
      const fields = logs?.hiddenFields || [];
      const preIdx = fields.indexOf(key);
      return preIdx < 0 || preIdx === index;
    }) || [];

  // 二级索引字段
  const secondaryIndexList: any = [];

  // log 中现有字段
  const fields = Object.keys(log).sort();

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

  // 系统字段，排除索引字段
  const systemFields = fields.filter(
    (key) => key !== RawLogField && !indexList.includes(key)
  );

  // 日志字段，过滤掉隐藏字段
  let logFields: string[] = fields.filter((key) => !hiddenFields.includes(key));

  // 存储 rawLog 非索引字段
  let rawLogFields: any[] = [];

  // 存储 rawLog 字段中的索引字段
  let rawLogIndexFields: any[] = [];
  // 初始化 log
  let resultLog: any = log;

  // 取出 rawLog 日志字段并转成 Json ，parseJsonObject 回参数 Json || false
  const rawLogJson = parseJsonObject(log[RawLogField]);

  // 如果 raw log 是 JSON
  if (!!rawLogJson) {
    // 拷贝 raw log Json
    const cloneRawLogJson = lodash.cloneDeep(rawLogJson);

    // raw log 的 Key
    const cloneRawLogFields = Object.keys(cloneRawLogJson).map((field) => {
      if (indexList.includes(field)) {
        rawLogIndexFields.push(field);
      }
      // 去重
      if (logFields.includes(field)) {
        cloneRawLogJson[`raw_log_${field}`] = cloneRawLogJson[field];
        if (indexList.includes(field)) {
          const index = indexList.indexOf(field);
          indexList[index] = `raw_log_${field}`;
          rawLogIndexFields.push(`raw_log_${field}`);
        }
        delete cloneRawLogJson[field];
        return `raw_log_${field}`;
      }
      return field;
    });

    // rawLog 中非索引字段
    rawLogFields = cloneRawLogFields.filter(
      (item) => !rawLogIndexFields.includes(item)
    );
    // 合并 JSON
    resultLog = { ...resultLog, ...cloneRawLogJson };

    // 合并 Key
    logFields = [...logFields, ...cloneRawLogFields];

    // 移除 _raw_log_ 字段
    delete resultLog._raw_log_;

    logFields = logFields.filter((field) => field !== RawLogField);
  }
  //去除隐藏字段
  logFields = logFields.filter((field) => !hiddenFields.includes(field));

  return {
    indexList,
    systemFields,
    secondaryIndexList,
    logFields: fields,
    resultLog,
    rawLogFields,
    rawLogIndexFields,
    hiddenFields,
  };
};

export default LogItemDetail;
