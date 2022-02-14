import classNames from "classnames";
import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { useModel } from "@@/plugin-model/useModel";
import JsonView from "@/components/JsonView";
import JsonStringValue from "@/components/JsonView/JsonStringValue";
import { Tag } from "antd";

type LogContentParseProps = {
  logContent: string;
};

const LogContentParse = ({ logContent }: LogContentParseProps) => {
  const { doUpdatedQuery, highlightKeywords } = useModel("dataLogs");
  const addQuery = (key: string) => {
    const currentSelected = `_raw_log_ like '%${key}%'`;
    doUpdatedQuery(currentSelected);
  };

  const isNullList = ["\n", "\r\n", "", " "];

  let content;
  try {
    const contentJson = JSON.parse(logContent);
    content = (
      <>
        <Tag color="#2db7f5">Json</Tag>
        <JsonView
          data={contentJson}
          onClickValue={addQuery}
          highLightValue={highlightKeywords}
        />
      </>
    );
  } catch (e) {
    console.log(logContent);
    if (isNullList.includes(logContent)) {
      content = "null";
    } else {
      content = (
        <>
          <Tag color="#2db7f5">Other</Tag>
          <JsonStringValue
            val={logContent}
            onClickValue={addQuery}
            highLightValue={highlightKeywords}
          />
        </>
      );
    }
  }
  return (
    <span className={classNames(logItemStyles.logContent)}>{content}</span>
  );
};
export default LogContentParse;
