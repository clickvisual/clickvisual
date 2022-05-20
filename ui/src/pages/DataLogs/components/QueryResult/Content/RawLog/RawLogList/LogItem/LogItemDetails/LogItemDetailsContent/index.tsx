import { Button } from "antd";
import { useState } from "react";
import classNames from "classnames";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { LOGMAXTEXTLENGTH } from "@/config/config";

interface onInsertQuery {
  onInsertQuery: any;
  content: any;
  keyItem: string;
  isIndexAndRawLogKey: any;
  highlightFlag: any;
  isNotTimeKey: any;
}

const LogItemDetailsContent = (props: onInsertQuery) => {
  const [isHidden, setisHidden] = useState<boolean>(true);
  const {
    onInsertQuery,
    content,
    keyItem,
    isIndexAndRawLogKey,
    highlightFlag,
    isNotTimeKey,
  } = props;

  return (
    <>
      {content && content.length > LOGMAXTEXTLENGTH && (
        <Button
          type="primary"
          style={{
            height: "18px",
            alignItems: "center",
            display: "inline-flex",
            marginRight: "5px",
          }}
          shape="round"
          size="small"
          onClick={() => setisHidden(!isHidden)}
        >
          {isHidden ? "展开" : "收缩"}
        </Button>
      )}
      <span
        onClick={() => onInsertQuery(keyItem, isIndexAndRawLogKey)}
        className={classNames(
          logItemStyles.logContent,
          highlightFlag && logItemStyles.logContentHighlight,
          isNotTimeKey && logItemStyles.logHover
        )}
      >
        {isHidden
          ? content && content.length > LOGMAXTEXTLENGTH
            ? content && content.substring(0, LOGMAXTEXTLENGTH) + "..."
            : content
          : content}
      </span>
    </>
  );
};
export default LogItemDetailsContent;
