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
import { useIntl } from "umi";
import { cloneDeep } from "lodash";
import {
  compare,
  handleGetChildElementsNumber,
  handleGetTotalLength,
} from "@/utils/linkLog";
// import { useThrottleFn } from "ahooks";

// 链路主题色，循环使用，可直接在末尾新增
const themeColor = [
  "#ee722e90",
  "#f5b84590",
  "#208aae90",
  "#de5b9690",
  "#ecb9cc90",
];
// 折叠item的高度（item的最小高度）
// const foldingHeight = 69;

const RawLogList = ({ oldPane }: { oldPane: PaneType | undefined }) => {
  const i18n = useIntl();
  // const virtualRef: any = useRef<HTMLDivElement>(null);
  const { logs, logState, pageSize } = useModel("dataLogs");
  const [isNotification, setIsNotification] = useState<boolean>(false);
  const [isLinkLogs, setIsLinkLogs] = useState<boolean>(true);
  const [dataListLength, setDataListLength] = useState<number>(0);
  // const [start, setStart] = useState(0);
  // const [count, setCount] = useState(0);

  const list = useMemo(() => {
    const newLogs = cloneDeep(logs?.logs);
    // virtualRef.current && (virtualRef.current.scrollTop = 0);
    if (
      oldPane?.logState != 1 &&
      logs?.isTrace == 1 &&
      logs?.logs &&
      logs?.logs.length > pageSize
    ) {
      return newLogs?.splice(0, pageSize - 1) || [];
    }
    return logs?.logs || [];
  }, [logs?.logs, pageSize, oldPane?.logState]);

  // console.log(oldPane?.logState, "oldPane?.logState");

  /**
   * 链路切换为普通日志时的数据截取
   */
  // const virtualList = useMemo(() => {
  //   if (pageSize > 10) {
  //     return list.slice(0, 10);
  //   }
  //   return list;
  // }, [pageSize, list]);

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
        dataList.unshift({
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

    let keyList: string[] = [];
    let dataList: any = {};
    let isLink = true;
    list.map((item: any) => {
      item.rawLogJson = parseJsonObject(item["_raw_log_"]);
      if (!item.rawLogJson["traceId"]) {
        isLink = false;
        console.log("不合规链路日志", "没有traceId", item);
      }
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

    if (!isLink) {
      setIsLinkLogs(false);
      return [];
    }
    setDataListLength(Object.keys(dataList).length || 0);
    let treeDataList: any[] = [];
    Object.keys(dataList).map((key: string) => {
      let endTime: number = 0;
      let startTime: number = 0;
      let themeColorList: any[] = [];
      const { arr: totalLength, referencesSpanIdList } = handleGetTotalLength(
        dataList[key],
        [],
        themeColorList
      );
      totalLength.map((item: any, index: number) => {
        if (item.et > endTime) {
          endTime = item.et;
        }
        if (index == 0 || item.st < startTime) {
          startTime = item.st;
        }
      });

      // 新增假的根节点
      referencesSpanIdList.map((item: string) => {
        dataList[key] &&
          dataList[key].push({
            ...dataList[key][0],
            rawLogJson: {
              traceId: dataList[key][0].rawLogJson.traceId,
              spanId: item,
              operationName:
                "Virtual Root Span （由于找不到根结点而产生的虚拟节点）",
              startTime: dataList[key][0].rawLogJson.startTime,
              tags: [],
              process: {},
            },
          });
      });

      const newDataList = dataList[key].sort(compare());
      newDataList.map((item: any) => {
        if (!item.rawLogJson.references) {
          const children = handleFindChild(
            item?.rawLogJson.spanId,
            newDataList,
            item,
            2,
            endTime,
            themeColorList,
            startTime
          );
          treeDataList.filter(
            (newItem: any) => newItem.key == item?.rawLogJson?.spanId
          ).length == 0 &&
            treeDataList.unshift({
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
              children: children,
              key: item?.rawLogJson?.spanId,
              data: item,
              duration: endTime - startTime,
              services: themeColorList.length,
              totalSpans:
                children.length > 0
                  ? handleGetChildElementsNumber(children)
                  : 1,
            });
          return;
        }
      });
    });

    return treeDataList;
  }, [list, logs?.isTrace]);

  // const handleLogListScroll = useThrottleFn(
  //   () => {
  //     const { scrollTop } = virtualRef.current;
  //     const newStart = Math.floor(scrollTop / foldingHeight);
  //     setStart(newStart);
  //   },
  //   {
  //     wait: 100,
  //   }
  // );

  // useEffect(() => {
  //   setCount(Math.ceil(virtualRef.current.clientHeight / foldingHeight));
  // }, []);

  useEffect(() => {
    if (!isLinkLogs) {
      notification.info({
        message: i18n.formatMessage({ id: "tips" }),
        description: i18n.formatMessage({
          id: "log.link.tips.formatNotCompliant",
        }),
        duration: null,
        placement: "top",
        onClose: () => {
          setIsLinkLogs(true);
        },
      });
    }
  }, [isLinkLogs]);

  // 出现第二个_key的时候就需要提示输入筛选条件
  useEffect(() => {
    if (
      logs?.isTrace == 1 &&
      logState == 1 &&
      dataListLength > 1 &&
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

  // 日志列表
  const logList = useMemo(() => {
    return logs?.isTrace == 0 || logState != 1
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
        });
  }, [logs?.isTrace, logState, list, oldPane?.foldingChecked, linkDataList]);

  return (
    <div className={classNames(rawLogListStyles.rawLogListMain)}>{logList}</div>
  );
};
export default RawLogList;
