import classNames from "classnames";
import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";

type LogContentParseProps = {
  logContent: string;
};

const LogContentParse = ({ logContent }: LogContentParseProps) => {
  let content;
  try {
    const contentJson = JSON.parse(logContent);
    const contentKeys = Object.keys(contentJson);
    content = contentKeys.map((item, index) => (
      <span key={index}>
        {index === 0 && <span>&#123;</span>}
        <span>{item}</span>
        <span>:</span>
        <span>
          {typeof contentJson[item] === "object"
            ? JSON.stringify(contentJson[item])
            : contentJson[item]}
        </span>
        {index === contentKeys.length - 1 ? (
          <span>&#125;</span>
        ) : (
          <span>,&nbsp;</span>
        )}
      </span>
    ));
  } catch (e) {
    content = logContent;
  }

  return (
    <span className={classNames(logItemStyles.logContent)}>{content}</span>
  );
};
export default LogContentParse;
