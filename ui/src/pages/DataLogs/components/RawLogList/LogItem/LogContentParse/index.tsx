import classNames from "classnames";
import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { useModel } from "@@/plugin-model/useModel";

type LogContentParseProps = {
  logContent: string;
};

const LogContentParse = ({ logContent }: LogContentParseProps) => {
  const { doUpdatedQuery, highlightKeywords } = useModel("dataLogs");
  const addQuery = (key: string) => {
    const currentSelected = `log~'%${key}%'`;
    doUpdatedQuery(currentSelected);
  };
  let content;
  try {
    const contentJson = JSON.parse(logContent);
    const contentKeys = Object.keys(contentJson);
    content = contentKeys.map((item, index) => {
      let flagItem = false;
      let flagContent = false;
      if (highlightKeywords) {
        flagItem = !!highlightKeywords.find(
          (keyItem) =>
            keyItem.key === "log" && keyItem.value.replaceAll("%", "") === item
        );
        flagContent = !!highlightKeywords.find(
          (keyItem) =>
            keyItem.key === "log" &&
            keyItem.value.replaceAll("%", "") === contentJson[item].toString()
        );
      }
      return (
        <span key={index}>
          {index === 0 && <span>&#123;</span>}
          <span
            onClick={() => addQuery(item)}
            className={classNames(
              logItemStyles.logHover,
              flagItem && logItemStyles.logContentHighlight
            )}
          >
            {item}
          </span>
          <span>:</span>
          <span>
            {typeof contentJson[item] === "object" ? (
              JSON.stringify(contentJson[item])
            ) : (
              <span
                onClick={() => addQuery(contentJson[item])}
                className={classNames(
                  logItemStyles.logHover,
                  flagContent && logItemStyles.logContentHighlight
                )}
              >
                {contentJson[item]}
              </span>
            )}
          </span>
          {index === contentKeys.length - 1 ? (
            <span>&#125;</span>
          ) : (
            <span>,&nbsp;</span>
          )}
        </span>
      );
    });
  } catch (e) {
    content = logContent;
  }

  return (
    <span className={classNames(logItemStyles.logContent)}>{content}</span>
  );
};
export default LogContentParse;
