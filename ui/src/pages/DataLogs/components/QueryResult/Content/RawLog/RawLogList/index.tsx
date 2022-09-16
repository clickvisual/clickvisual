import rawLogListStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/index.less";
import LogItem from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import { PaneType } from "@/models/datalogs/types";
import LinkItem from "./LinkItem";
import LinkItemTitle from "./LinkItemTitle";
import { useEffect, useMemo, useState } from "react";
import { notification } from "antd";
import { parseJsonObject } from "@/utils/string";
import { microsecondTimeStamp } from "@/utils/time";
import { useIntl } from "umi";

// 链路主题色，循环使用，可直接在末尾新增
const themeColor = [
  "#ee722e90",
  "#f5b84590",
  "#208aae90",
  "#de5b9690",
  "#ecb9cc90",
];

const RawLogList = ({ oldPane }: { oldPane: PaneType | undefined }) => {
  const i18n = useIntl();
  const { logs, linkLogs, logState } = useModel("dataLogs");
  const [isNotification, setIsNotification] = useState<boolean>(false);

  const list = useMemo(() => {
    if (
      logs?.isTrace == 1 &&
      oldPane?.logState == 1 &&
      linkLogs?.logs &&
      linkLogs?.logs?.length > 0
    ) {
      return linkLogs?.logs || [];
    }
    return logs?.logs || [];
  }, [logs?.logs, logs?.isTrace, oldPane, linkLogs?.logs]);

  const handleFindChild = (
    oneselfId: string,
    data: any,
    first: any,
    hierarchy: number,
    endTime: number,
    themeColorList: string[],
    startTime: number
  ) => {
    let dataList: any[] = [];
    data.map((item: any) => {
      if (
        oneselfId ==
        (item?.rawLogJson?.references &&
          item?.rawLogJson?.references[0]?.spanId)
      ) {
        dataList.push({
          title: (
            <LinkItemTitle
              title={
                <>
                  {item?.rawLogJson.process.serviceName} &nbsp;
                  <span style={{ color: "#9c9c9c" }}>
                    {item?.rawLogJson.operationName}
                  </span>
                </>
              }
              log={item}
              initial={startTime}
              totalLength={endTime - startTime}
              hierarchy={hierarchy}
              themeColor={
                themeColor[
                  themeColorList.indexOf(
                    item?.rawLogJson?.process?.serviceName
                  ) % themeColor.length
                ]
              }
            />
          ),
          key: item.rawLogJson.spanId,
          children: handleFindChild(
            item.rawLogJson.spanId,
            data,
            first,
            hierarchy + 1,
            endTime,
            themeColorList,
            startTime
          ),
          data: item,
        });
      }
    });

    return dataList;
  };

  const linkDataList = useMemo(() => {
    if (logs?.isTrace !== 1) {
      return [];
    }
    // 计算总长度
    const handleGetTotalLength = (
      list: any[],
      arr: any[],
      serviceNameList: string[]
    ) => {
      list.map((item: any) => {
        arr.push({
          et:
            item?.rawLogJson?.duration.slice(0, -1) * Math.pow(10, 6) +
            microsecondTimeStamp(item?.rawLogJson?.startTime),
          st: microsecondTimeStamp(item?.rawLogJson?.startTime),
        });
        // name对应主题色
        if (
          item?.rawLogJson?.process?.serviceName &&
          !serviceNameList.includes(item?.rawLogJson?.process?.serviceName)
        ) {
          serviceNameList.push(item?.rawLogJson?.process?.serviceName);
        }
      });
      return arr;
    };

    let keyList: string[] = [];
    let dataList: any = {};
    list.map((item: any) => {
      item.rawLogJson = parseJsonObject(item["_raw_log_"]);
      if (!keyList.includes(item._key)) {
        keyList.push(item._key);
        dataList = {
          ...dataList,
          [item._key]: [item],
        };
      } else {
        dataList[item._key].push(item);
      }
    });

    let treeDataList: any[] = [];
    Object.keys(dataList).map((key: string) => {
      let endTime: number = 0;
      let startTime: number = 0;
      let themeColorList: any[] = [];
      handleGetTotalLength(dataList[key], [], themeColorList).map(
        (item: any, index: number) => {
          if (item.et > endTime) {
            endTime = item.et;
          }
          if (index == 0 || item.st < startTime) {
            startTime = item.st;
          }
        }
      );

      dataList[key].map((item: any) => {
        if (!item.rawLogJson.references) {
          treeDataList.push({
            title: (
              <LinkItemTitle
                title={
                  <>
                    {item?.rawLogJson.process.serviceName} &nbsp;
                    <span style={{ color: "#9c9c9c" }}>
                      {item?.rawLogJson.operationName}
                    </span>
                  </>
                }
                log={item}
                initial={startTime}
                totalLength={endTime - startTime}
                hierarchy={1}
                themeColor={
                  themeColor[
                    themeColorList.indexOf(
                      item?.rawLogJson?.process?.serviceName
                    ) % themeColor.length
                  ]
                }
              />
            ),
            children: handleFindChild(
              item?.rawLogJson.spanId,
              dataList[key],
              item,
              2,
              endTime,
              themeColorList,
              startTime
            ),
            key: key,
            data: item,
          });
          return;
        }
      });
    });

    return treeDataList;
  }, [list, logs?.isTrace]);

  // 出现第二个_key的时候就需要提示输入赛选条件
  useEffect(() => {
    if (
      logs?.isTrace == 1 &&
      logState == 1 &&
      linkLogs?.limited == 100 &&
      linkDataList.length > 1 &&
      oldPane?.linkLogs &&
      !isNotification
    ) {
      setIsNotification(true);
      notification.info({
        message: i18n.formatMessage({ id: "tips" }),
        description: i18n.formatMessage({ id: "log.link.tips.description" }),
        duration: null,
        placement: "top",
        onClose: () => {
          setIsNotification(false);
        },
      });
    }
  }, [linkDataList]);

  return (
    <div className={classNames(rawLogListStyles.rawLogListMain)}>
      {logs?.isTrace == 0 || logState != 1
        ? list.map((logItem: any, index: number) => {
            return (
              <LogItem
                foldingChecked={oldPane?.foldingChecked}
                log={logItem}
                key={index}
              />
            );
          })
        : // 链路日志
          linkDataList.map((item: any) => {
            return <LinkItem key={item.key} log={item} />;
          })}
    </div>
  );
};
export default RawLogList;
