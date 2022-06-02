import { LogItemContext } from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList";
import { useCallback, useContext, useMemo } from "react";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { Tag, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import useLogItemDetail from "@/pages/DataLogs/hooks/useLogItemDetail";

const TagFieldContent = ({
  field,
  content,
  onClick,
}: {
  field: string;
  content: string;
  onClick: (field: string, value: string) => void;
}) => (
  <Tooltip
    overlayInnerStyle={{
      maxHeight: 280,
      overflowY: "auto",
      color: "#41464beb",
    }}
    color={"#fff"}
    key={field}
    title={`${field}: ${content}`}
  >
    <Tag
      onClick={(e) => {
        e.stopPropagation();
        onClick(field, content);
      }}
      color={"#fdebe1"}
      className={logItemStyles.tag}
    >
      {content}
    </Tag>
  </Tooltip>
);

interface LogItemFoldProps {
  onFoldClick: () => void;
}
const LogItemFold = ({ onFoldClick }: LogItemFoldProps) => {
  const { logs, doUpdatedQuery } = useModel("dataLogs");
  const { log } = useContext(LogItemContext);

  const { indexList, secondaryIndexList, logFields, resultLog, systemFields } =
    useLogItemDetail(logs, log);

  const handleClick = useCallback(
    (field: string, value: string) => {
      const currentSelected = `\`${field}\`='${value}'`;
      doUpdatedQuery(currentSelected);
    },
    [doUpdatedQuery]
  );

  const { tagFields }: { tagFields: { field: string; content: string }[] } =
    useMemo(() => {
      let tagFields: { field: string; content: string }[] = [];
      if (systemFields.length > 0) {
        systemFields.forEach(
          (field) =>
            resultLog[field] &&
            tagFields.push({ field, content: resultLog[field] })
        );
      }
      if (indexList.length > 0) {
        indexList.forEach(
          (field) =>
            resultLog[field] &&
            tagFields.push({ field, content: resultLog[field] })
        );
      }
      if (secondaryIndexList.length > 0) {
        secondaryIndexList.forEach(
          (item: { parentKey: string | number; keyItem: string | number }) => {
            const value = resultLog[item.parentKey]?.[item.keyItem];
            const content = value ? JSON.stringify(value) : undefined;
            content &&
              tagFields.push({
                field: `${item.parentKey}.${item.keyItem}`,
                content,
              });
          }
        );
      }
      return { tagFields };
    }, []);

  return (
    <div className={logItemStyles.logItemHideMain} onClick={onFoldClick}>
      {tagFields.length > 0 && (
        <div className={logItemStyles.logItemHideIndex}>
          {tagFields.map((item) => (
            <TagFieldContent {...item} onClick={handleClick} />
          ))}

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
