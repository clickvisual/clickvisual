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
};

const LogContentParse = ({
  logContent,
  keyItem,
  secondaryIndexKeys,
  quickInsertLikeQuery,
}: LogContentParseProps) => {
  const { highlightKeywords } = useModel("dataLogs");

  const isNullList = ["\n", "\r\n", "", " "];

  let content;
  let logContents: any =
    "2022-05-27T11:48:04.782+0800: 604360.660: [GC pause (G1 Evacuation Pause) (young)\nDesired survivor size 301989888 bytes, new threshold 1 (max 1)\n- age 1: 238254864 bytes, 238254864 total\n 604360.660: [G1Ergonomics (CSet Construction) start choosing CSet, _pending_cards: 23914, predicted base time: 13.34 ms, remaining time: 36.66 ms, target pause time: 50.00 ms]\n 604360.660: [G1Ergonomics (CSet Construction) add young regions to CSet, eden: 122 regions, survivors: 17 regions, predicted young region time: 37.16 ms]\n 604360.660: [G1Ergonomics (CSet Construction) finish choosing CSet, eden: 122 regions, survivors: 17 regions, old: 0 regions, predicted pause time: 50.50 ms, target pause time: 50.00 ms]\n, 0.0696159 secs]\n [Parallel Time: 65.1 ms, GC Workers: 16]\n [GC Worker Start (ms): Min: 604360660.1, Avg: 604360660.2, Max: 604360660.2, Diff: 0.2]\n [Ext Root Scanning (ms): Min: 1.6, Avg: 1.8, Max: 2.8, Diff: 1.2, Sum: 28.8]\n [Update RS (ms): Min: 3.6, Avg: 4.2, Max: 5.0, Diff: 1.5, Sum: 67.5]\n [Processed Buffers: Min: 4, Avg: 9.6, Max: 19, Diff: 15, Sum: 154]\n [Scan RS (ms): Min: 0.0, Avg: 0.0, Max: 0.1, Diff: 0.1, Sum: 0.4]\n [Code Root Scanning (ms): Min: 0.0, Avg: 0.0, Max: 0.0, Diff: 0.0, Sum: 0.0]\n [Object Copy (ms): Min: 57.5, Avg: 58.4, Max: 59.0, Diff: 1.5, Sum: 934.8]\n [Termination (ms): Min: 0.0, Avg: 0.4, Max: 0.8, Diff: 0.8, Sum: 5.8]\n [Termination Attempts: Min: 1, Avg: 1.0, Max: 1, Diff: 0, Sum: 16]\n [GC Worker Other (ms): Min: 0.0, Avg: 0.0, Max: 0.1, Diff: 0.1, Sum: 0.6]\n [GC Worker Total (ms): Min: 64.8, Avg: 64.9, Max: 65.0, Diff: 0.2, Sum: 1037.9]\n [GC Worker End (ms): Min: 604360725.0, Avg: 604360725.0, Max: 604360725.1, Diff: 0.1]\n [Code Root Fixup: 0.0 ms]\n [Code Root Purge: 0.0 ms]\n [Clear CT: 0.5 ms]\n [Other: 4.0 ms]\n [Choose CSet: 0.0 ms]\n [Ref Proc: 2.3 ms]\n [Ref Enq: 0.2 ms]\n [Redirty Cards: 0.2 ms]\n [Humongous Regis";

  if (typeof logContents !== "object") {
    if (isNullList.includes(logContents)) {
      content = "";
    } else {
      content = (
        <JsonStringValue
          val={logContents.toString()}
          keyItem={keyItem}
          onClickValue={quickInsertLikeQuery}
          highLightValue={highlightKeywords}
        />
      );
    }
  } else if (logContents === null) {
    content = "";
  } else {
    content = (
      <>
        <JsonView
          secondaryIndexKeys={secondaryIndexKeys}
          data={logContents}
          onClickValue={quickInsertLikeQuery}
          highLightValue={highlightKeywords}
        />
      </>
    );
  }
  return (
    <span className={classNames(logItemStyles.logContent)}>
      {/* {JSON.stringify(content)} */}
      {content}
    </span>
  );
};
export default LogContentParse;
