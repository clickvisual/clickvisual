import { LogItemContext } from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList";
import { useContext } from "react";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { Tag, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import useLogItemDetail from "@/pages/DataLogs/hooks/useLogItemDetail";

const LogItemFold = () => {
  const { logs } = useModel("dataLogs");
  const { log } = useContext(LogItemContext);

  const { indexList, secondaryIndexList, logFields, resultLog } =
    useLogItemDetail(logs, log);

  return (
    <div className={logItemStyles.logItemHideMain}>
      {(indexList.length > 0 || secondaryIndexList.length > 0) && (
        <div className={logItemStyles.logItemHideIndex}>
          {indexList.map(
            (field) =>
              resultLog[field] && (
                <Tooltip
                  overlayInnerStyle={{
                    maxHeight: 280,
                    overflowY: "auto",
                    color: "#41464beb",
                  }}
                  color={"#fff"}
                  key={field}
                  title={`${field}: ${resultLog[field]}`}
                >
                  <Tag color={"#fdebe1"} className={logItemStyles.tag}>
                    {resultLog[field]}
                  </Tag>
                </Tooltip>
              )
          )}
          {secondaryIndexList.map(
            (item: {
              parentKey: string | number;
              keyItem: string | number;
            }) => {
              const value = resultLog[item.parentKey]?.[item.keyItem];
              const content = value ? JSON.stringify(value) : undefined;
              return (
                content && (
                  <Tooltip
                    overlayInnerStyle={{
                      maxHeight: 280,
                      overflowY: "auto",
                      color: "#41464beb",
                    }}
                    color={"#fff"}
                    key={`${item.parentKey}.${item.keyItem}`}
                    title={`${item.parentKey}.${item.keyItem}: ${content}`}
                  >
                    <Tag color={"#fdebe1"} className={logItemStyles.tag}>
                      {content}
                    </Tag>
                  </Tooltip>
                )
              );
            }
          )}
          {logFields
            .filter((item) => !indexList.includes(item))
            .map((field) => {
              return (
                <span key={field}>
                  {field}:{` "${JSON.stringify(resultLog[field])}" `}
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
};
export default LogItemFold;
