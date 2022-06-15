import LogItemDetailsContent from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemDetails/LogItemDetailsContent";
import LogContentParse from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogContentParse";
import { useMemo } from "react";

interface LogContentProps {
  isRawLog: boolean;
  regSpeFlag: boolean;
  content: any;
  keyItem: any;
  quickInsertLikeQuery: any;
  quickInsertLikeExclusion: any;
  onInsertQuery: any;
  onInsertExclusion: any;
  isIndexAndRawLogKey: boolean;
  highlightFlag: any;
  isNotTimeKey: boolean;
  newLog: any;
  secondaryIndexList: any[];
  foldingChecked?: boolean;
}
const LogContent = (props: LogContentProps) => {
  const {
    isRawLog,
    regSpeFlag,
    content,
    keyItem,
    quickInsertLikeQuery,
    quickInsertLikeExclusion,
    onInsertQuery,
    onInsertExclusion,
    isIndexAndRawLogKey,
    highlightFlag,
    isNotTimeKey,
    newLog,
    secondaryIndexList,
    foldingChecked,
  } = props;

  // 二级索引
  const jsonIndexKeys =
    useMemo(() => {
      if (secondaryIndexList.length <= 0) {
        return [];
      }
      return secondaryIndexList
        .filter((item) => item.parentKey === keyItem)
        .map((item) => ({
          ...item,
          childFields: Object.keys(newLog?.[item.parentKey] || {}),
        }));
    }, [secondaryIndexList, keyItem, newLog]) || [];

  return (
    <>
      {!isRawLog ? (
        regSpeFlag ? (
          <LogContentParse
            foldingChecked={foldingChecked}
            logContent={content.toString()}
            keyItem={keyItem}
            quickInsertLikeQuery={quickInsertLikeQuery}
            quickInsertLikeExclusion={quickInsertLikeExclusion}
          />
        ) : (
          <LogItemDetailsContent
            keyItem={keyItem}
            onInsertQuery={onInsertQuery}
            onInsertExclusion={onInsertExclusion}
            content={content}
            isIndexAndRawLogKey={isIndexAndRawLogKey}
            highlightFlag={highlightFlag}
            isNotTimeKey={isNotTimeKey}
          />
        )
      ) : (
        <LogContentParse
          foldingChecked={foldingChecked}
          secondaryIndexKeys={jsonIndexKeys}
          logContent={newLog[keyItem]}
          quickInsertLikeQuery={quickInsertLikeQuery}
          quickInsertLikeExclusion={quickInsertLikeExclusion}
        />
      )}
    </>
  );
};
export default LogContent;
