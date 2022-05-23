import LogItemDetailsContent from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemDetails/LogItemDetailsContent";
import LogContentParse from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogContentParse";

interface LogContentProps {
  isRawLog: boolean;
  regSpeFlag: boolean;
  content: any;
  keyItem: any;
  quickInsertLikeQuery: any;
  onInsertQuery: any;
  isIndexAndRawLogKey: boolean;
  highlightFlag: any;
  isNotTimeKey: boolean;
  newLog: any;
}
const LogContent = (props: LogContentProps) => {
  const {
    isRawLog,
    regSpeFlag,
    content,
    keyItem,
    quickInsertLikeQuery,
    onInsertQuery,
    isIndexAndRawLogKey,
    highlightFlag,
    isNotTimeKey,
    newLog,
  } = props;

  return (
    <>
      {!isRawLog ? (
        regSpeFlag ? (
          <LogContentParse
            logContent={content.toString()}
            keyItem={keyItem}
            quickInsertLikeQuery={quickInsertLikeQuery}
          />
        ) : (
          <LogItemDetailsContent
            keyItem={keyItem}
            onInsertQuery={onInsertQuery}
            content={content}
            isIndexAndRawLogKey={isIndexAndRawLogKey}
            highlightFlag={highlightFlag}
            isNotTimeKey={isNotTimeKey}
          />
        )
      ) : (
        <LogContentParse
          logContent={newLog[keyItem]}
          quickInsertLikeQuery={quickInsertLikeQuery}
        />
      )}
    </>
  );
};
export default LogContent;
