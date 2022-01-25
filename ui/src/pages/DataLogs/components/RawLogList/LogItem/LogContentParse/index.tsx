import classNames from "classnames";
import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { useModel } from "@@/plugin-model/useModel";
import JsonView from "@/components/JsonView";
import JsonStringValue from "@/components/JsonView/JsonStringValue";

type LogContentParseProps = {
  logContent: string;
};

const LogContentParse = ({ logContent }: LogContentParseProps) => {
  const { doUpdatedQuery, highlightKeywords } = useModel("dataLogs");
  const addQuery = (key: string) => {
    const currentSelected = `_raw_log_ like '%${key}%'`;
    doUpdatedQuery(currentSelected);
  };

  let content;
  try {
    const contentJson = JSON.parse(logContent);
    content = (
      <JsonView
        data={contentJson}
        onClickValue={addQuery}
        highLightValue={highlightKeywords}
      />
    );
  } catch (e) {
    content = (
      <JsonStringValue
        val={logContent}
        onClickValue={addQuery}
        highLightValue={highlightKeywords}
      />
    );
  }
  return (
    <span className={classNames(logItemStyles.logContent)}>{content}</span>
  );
};
export default LogContentParse;
