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

  const demo = {
    lv: "info",
    ts: 1642757192189,
    msg: "sdk event",
    demo1: [],
    demo: [
      { aaa: null, bbb: "cccc" },
      { aaa: null, bbb: "cccc" },
      { aaa: null, bbb: "cccc", cccc: [1, 2, 3, 4, 56, 6] },
    ],
    demo2: [
      { aaa: null, bbb: "cccc" },
      { aaa: null, bbb: "cccc" },
      { aaa: null, bbb: "cccc" },
    ],
    lname: "default.log",
    event: {
      kind: "collaborator",
      type: "",
      action: "enter",
      fileId: "xp0gMK1OrTWYlZq4",
      userId: "ZNWXo1bmYiLOYbK9",
      comment: ["xxxx", "xxxx", "ddddd"],
      discussion: null,
      mentionAt: null,
      fileContent: null,
      editors: null,
      rowChanges: null,
    },
  };

  let content;
  try {
    // const contentJson = JSON.parse(logContent);
    const contentJson = demo;
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
