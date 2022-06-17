import rawLogListStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/index.less";
import LogItem from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo } from "react";
import classNames from "classnames";
import useLogListScroll from "@/pages/DataLogs/hooks/useLogListScroll";

const RawLogList = () => {
  const { currentLogLibrary, onChangeHiddenHighChart, logs, logPanesHelper } =
    useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const containerProps = useLogListScroll();

  useEffect(() => {
    if (containerProps.ref.current && oldPane?.histogramChecked) {
      containerProps.ref.current.scrollTop = 0;
      onChangeHiddenHighChart(false);
    }
  }, [logs]);

  const list = logs?.logs || [];
  return (
    <div
      className={classNames(rawLogListStyles.rawLogListMain)}
      {...containerProps}
    >
      {list.map((logItem: any, index: number) => (
        <LogItem
          foldingChecked={oldPane?.foldingChecked}
          log={{
            _raw_log_: {
              level: "info",
              logtime: "2022-06-17T05:39:02.191Z",
              zapmsg: "gotrack",
              catetory: "front_end_track",
              user_agent:
                "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x6307001e)",
              remote_address: "106.83.130.43",
              guid: "054cOSb3ZashshrB",
              body: {
                clientId: "44c79968-8773-4850-ad2f-15d3036775ff",
                guid: "054cOSb3ZashshrB",
                items: [
                  {
                    data: { acceptCommit: true, newChange: true },
                    index: 259,
                    message: "canHandleChangesRightNow",
                    time: "2022-06-17T05:38:59.785Z",
                  },
                  {
                    data: [
                      {
                        clientId: "92c60027-8cd5-45cd-8ddb-8ec097108560",
                        rev: 47230,
                      },
                    ],
                    index: 260,
                    message: "applyChangesToBase",
                    time: "2022-06-17T05:38:59.785Z",
                  },
                  {
                    data: {},
                    index: 261,
                    message: "saveStatus changed to serverChangeApplied",
                    time: "2022-06-17T05:38:59.786Z",
                  },
                  {
                    data: { acceptCommit: true, newChange: true },
                    index: 262,
                    message: "canHandleChangesRightNow",
                    time: "2022-06-17T05:38:59.786Z",
                  },
                ],
                tag: "collab_reporter",
              },
            },
          }}
          key={index}
        />
      ))}
    </div>
  );
};
export default RawLogList;
