import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { useContext } from "react";
import { LogItemContext } from "@/pages/DataLogs/components/RawLogList";
import { useModel } from "@@/plugin-model/useModel";
import lodash from "lodash";
import classNames from "classnames";

type LogItemDetailsProps = {};
const LogItemDetails = (props: LogItemDetailsProps) => {
  const { log } = useContext(LogItemContext);
  const {
    keywordInput,
    onChangeKeywordInput,
    doGetLogs,
    doGetHighCharts,
    highlightKeywords,
    doParseQuery,
  } = useModel("dataLogs");
  const keys = Object.keys(log).sort();

  const quickInsertQuery = (keyItem: string) => {
    const currentSelected = `${keyItem}='${log[keyItem]}'`;
    const defaultValueArr =
      lodash.cloneDeep(keywordInput)?.split(" and ") || [];
    if (defaultValueArr.length === 1 && defaultValueArr[0] === "")
      defaultValueArr.pop();
    defaultValueArr.push(currentSelected);
    const kw = defaultValueArr.join(" and ");
    onChangeKeywordInput(kw);
    doGetLogs({ kw });
    doGetHighCharts({ kw });
    doParseQuery(kw);
  };

  return (
    <div className={logItemStyles.details}>
      {keys.length > 0 &&
        keys.map((keyItem, index) => {
          let flag = false;
          if (highlightKeywords) {
            flag = !!highlightKeywords.find((item) => item.key === keyItem);
          }
          return (
            <div key={index} className={logItemStyles.logLine}>
              <div className={logItemStyles.logKey}>
                <span>{keyItem}</span>
              </div>
              :
              <span
                onClick={() => quickInsertQuery(keyItem)}
                className={classNames(
                  logItemStyles.logContent,
                  flag && logItemStyles.logContentHighlight
                )}
              >
                {log[keyItem]}
              </span>
            </div>
          );
        })}
    </div>
  );
};

export default LogItemDetails;
