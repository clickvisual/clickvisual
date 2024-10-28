import JsonView from "@/components/JsonView";
import JsonStringValue from "@/components/JsonView/JsonStringValue";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { useModel } from "@umijs/max";
import classNames from "classnames";

type LogContentParseProps = {
  logContent: any;
  secondaryIndexKeys?: any[];
  keyItem?: string;
  rowKeyItem?: string;
  quickInsertLikeQuery?: (
    key: string,
    extra?: { key?: string; isIndex?: boolean; indexKey?: string }
  ) => void;
  quickInsertLikeExclusion?: (
    key: string,
    extra?: { key?: string; isIndex?: boolean; indexKey?: string }
  ) => void;
  foldingChecked?: boolean;
};

const LogContentParse = ({
  logContent,
  keyItem,
  rowKeyItem,
  secondaryIndexKeys,
  quickInsertLikeQuery,
  quickInsertLikeExclusion,
  foldingChecked,
}: LogContentParseProps) => {
  const { highlightKeywords } = useModel("dataLogs");
  const isNullList = ["\n", "\r\n", "", " "];

  let content;
  if (typeof logContent !== "object") {
    if (isNullList.includes(logContent)) {
      content = "";
    } else {
      content = (
        <JsonStringValue
          val={logContent.toString()}
          keyItem={keyItem}
          rowKeyItem={rowKeyItem}
          onClickValue={quickInsertLikeQuery}
          quickInsertLikeExclusion={quickInsertLikeExclusion}
          highLightValue={highlightKeywords}
        />
      );
    }
  } else if (logContent === null) {
    content = "";
  } else {
    content = (
      <>
        <JsonView
          secondaryIndexKeys={secondaryIndexKeys}
          data={logContent}
          onClickValue={quickInsertLikeQuery}
          quickInsertLikeExclusion={quickInsertLikeExclusion}
          highLightValue={highlightKeywords}
          foldingChecked={foldingChecked}
          hierarchy={1}
        />
      </>
    );
  }
  return (
    <span className={classNames(logItemStyles.logContent)}>{content}</span>
  );
};
export default LogContentParse;
