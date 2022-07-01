import classNames from "classnames";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { useModel } from "@@/plugin-model/useModel";
import JsonView from "@/components/JsonView";
import JsonStringValue from "@/components/JsonView/JsonStringValue";

type LogContentParseProps = {
  logContent: any;
  secondaryIndexKeys?: any[];
  keyItem?: string;
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
  secondaryIndexKeys,
  quickInsertLikeQuery,
  quickInsertLikeExclusion,
  foldingChecked,
}: LogContentParseProps) => {
  const { highlightKeywords } = useModel("dataLogs");
  const isNullList = ["\n", "\r\n", "", " "];

  let content;
  // todo: 这里不应该判断是否可以转json，此时应该是已经有了确定的数据结构
  if (typeof logContent !== "object") {
    if (isNullList.includes(logContent)) {
      content = "";
    } else {
      content = (
        <JsonStringValue
          val={logContent.toString()}
          keyItem={keyItem}
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
        />
      </>
    );
  }
  return (
    <span className={classNames(logItemStyles.logContent)}>{content}</span>
  );
};
export default LogContentParse;
