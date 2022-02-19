import classNames from "classnames";
import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { useModel } from "@@/plugin-model/useModel";
import JsonView from "@/components/JsonView";
import JsonStringValue from "@/components/JsonView/JsonStringValue";

type LogContentParseProps = {
  logContent: any;
};

const LogContentParse = ({ logContent }: LogContentParseProps) => {
  const { doUpdatedQuery, highlightKeywords } = useModel("dataLogs");
  const addQuery = (key: string) => {
    const currentSelected = `_raw_log_ like '%${key}%'`;
    doUpdatedQuery(currentSelected);
  };

  const isNullList = ["\n", "\r\n", "", " "];

  let content;
  if (typeof logContent !== "object") {
    if (isNullList.includes(logContent)) {
      content = "";
    } else {
      content = (
        <JsonStringValue
          val={logContent.toString()}
          onClickValue={addQuery}
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
          data={logContent}
          onClickValue={addQuery}
          highLightValue={highlightKeywords}
        />
      </>
    );
  }
  return (
    <span className={classNames(logItemStyles.logContent)}>{content}</span>
  );
};
export default LogContentParse;
