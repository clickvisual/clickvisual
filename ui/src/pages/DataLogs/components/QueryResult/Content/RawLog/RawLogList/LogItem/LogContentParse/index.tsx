import classNames from "classnames";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { useModel } from "@@/plugin-model/useModel";
import JsonView from "@/components/JsonView";
import JsonStringValue from "@/components/JsonView/JsonStringValue";

type LogContentParseProps = {
  logContent: any;
  secondaryIndexKeys?: any[];
  keyItem?: string;
  quickInsertLikeQuery: (key: string) => void;
  quickInsertLikeExclusion: (key: string) => void;
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
  const { highlightKeywords, isJsonFun } = useModel("dataLogs");
  const isNullList = ["\n", "\r\n", "", " "];

  let content;
  if (!isJsonFun(logContent)) {
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
