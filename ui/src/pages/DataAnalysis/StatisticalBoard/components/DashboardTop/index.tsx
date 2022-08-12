import { Button, DatePicker } from "antd";
import styles from "./index.less";
import CustomCard from "@/components/CustomCard";
import { useEffect, useMemo, useState } from "react";
import ItemCard from "./ItemCard";
import IconFont from "@/components/IconFont";
import { dashboardDataType } from "../..";
import moment from "moment";

const { RangePicker } = DatePicker;

enum timeStateType {
  /**
   * 昨天
   */
  yesterday = "yesterday",
  /**
   * 前天
   */
  beforeYesterday = "beforeYesterday",
  /**
   * 近七天
   */
  nearlyWeek = "nearlyWeek",
}

enum IconFontListType {
  /**
   * 失败实例
   */
  failureInstance = "failureInstance",
  /**
   * 成功实例
   */
  successfulInstance = "successfulInstance",
  /**
   * 未知实例
   */
  unknownInstance = "unknownInstance",
  /**
   * 失败节点
   */
  failureNode = "failureNode",
  /**
   * 成功节点
   */
  successfulNode = "successfulNode",
  /**
   * 未知节点
   */
  unknownNode = "unknownNode",
}

const title = <>重点关注</>;

const DashboardTop = (props: {
  dashboardData: dashboardDataType;
  onGetList: (data: {
    start?: number;
    end?: number;
    isInCharge?: number;
  }) => void;
}) => {
  const { dashboardData, onGetList } = props;
  const {
    nodeFailed,
    nodeSuccess,
    nodeUnknown,
    workerFailed,
    workerSuccess,
    workerUnknown,
  } = dashboardData;
  const [timeState, setTimeState] = useState<string>("yesterday");
  const [isInCharge, setIsInCharge] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  const timeChange = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    onGetList({ start, end, isInCharge: Number(isInCharge) });
  };

  const timeList = useMemo(() => {
    return [
      {
        key: timeStateType.yesterday,
        title: "昨天",
        onClick: () => {
          const start = +moment().startOf("day").subtract(1, "d");
          const end = +moment().endOf("day").subtract(1, "d");
          timeChange(start, end);
        },
        style: {
          color:
            timeState == timeStateType.yesterday
              ? "hsl(21, 85%, 56%)"
              : "#41464beb",
        },
      },
      {
        key: timeStateType.beforeYesterday,
        title: "前天",
        onClick: () => {
          const start = +moment().startOf("day").subtract(2, "d");
          const end = +moment().endOf("day").subtract(2, "d");
          timeChange(start, end);
        },
        style: {
          color:
            timeState == timeStateType.beforeYesterday
              ? "hsl(21, 85%, 56%)"
              : "#41464beb",
        },
      },
      {
        key: timeStateType.nearlyWeek,
        title: "近七天",
        onClick: () => {
          const start = +moment().subtract(7, "d");
          const end = +moment();
          timeChange(start, end);
        },
        style: {
          color:
            timeState == timeStateType.nearlyWeek
              ? "hsl(21, 85%, 56%)"
              : "#41464beb",
        },
      },
    ];
  }, [timeState, isInCharge]);

  const operation = useMemo(() => {
    return (
      <div className={styles.operation}>
        <>
          {timeList.map((item: any) => {
            return (
              <Button
                key={item.key}
                type="link"
                size="small"
                style={item.style}
                onClick={() => {
                  setTimeState(item.key);
                  item.onClick();
                }}
              >
                {item.title}
              </Button>
            );
          })}
        </>
        <RangePicker
          size="small"
          showTime
          value={[moment(startTime / 1000, "X"), moment(endTime / 1000, "X")]}
          onChange={(timeList: any) => {
            timeChange(+timeList[0], +timeList[1]);
            setTimeState("");
          }}
        />
        <>
          <Button
            type="link"
            size="small"
            style={{
              color: !isInCharge ? "hsl(21, 85%, 56%)" : "#41464beb",
            }}
            onClick={() => {
              if (isInCharge) {
                setIsInCharge(false);
                onGetList({
                  start: startTime,
                  isInCharge: 0,
                  end: endTime,
                });
              }
            }}
          >
            全部
          </Button>
          <Button
            type="link"
            size="small"
            style={{
              color: isInCharge ? "hsl(21, 85%, 56%)" : "#41464beb",
            }}
            onClick={() => {
              if (!isInCharge) {
                setIsInCharge(false);
                onGetList({
                  start: startTime,
                  isInCharge: 1,
                  end: endTime,
                });
              }
              setIsInCharge(true);
            }}
          >
            我负责的
          </Button>
        </>
      </div>
    );
  }, [timeList, startTime, endTime]);

  const iconList = useMemo(() => {
    return [
      {
        key: IconFontListType.failureInstance,
        name: "失败实例",
        icon: "icon-failure-instance",
        num: workerFailed,
      },
      {
        key: IconFontListType.successfulInstance,
        name: "成功实例",
        icon: "icon-successful-instance",
        num: workerSuccess,
      },
      {
        key: IconFontListType.unknownInstance,
        name: "未知实例",
        icon: "icon-unknown-instance",
        num: workerUnknown,
      },
      {
        key: IconFontListType.failureNode,
        name: "失败节点",
        icon: "icon-failure-node",
        num: nodeFailed,
      },
      {
        key: IconFontListType.successfulNode,
        name: "成功节点",
        icon: "icon-successful-node",
        num: nodeSuccess,
      },
      {
        key: IconFontListType.unknownNode,
        name: "未知节点",
        icon: "icon-unknown-node",
        num: nodeUnknown,
        style: { marginRight: 0 },
      },
    ];
  }, [
    workerFailed,
    workerSuccess,
    workerUnknown,
    nodeFailed,
    nodeSuccess,
    nodeUnknown,
  ]);

  const content = useMemo(() => {
    return (
      <div className={styles.iconList}>
        {iconList.map((item: any) => {
          return (
            <ItemCard
              key={item.key}
              icon={<IconFont style={{ fontSize: "50px" }} type={item.icon} />}
              num={item.num}
              name={item.name}
              style={item.style}
            />
          );
        })}
      </div>
    );
  }, [iconList]);

  useEffect(() => {
    const start = +moment().startOf("day").subtract(1, "d");
    const end = +moment().endOf("day").subtract(1, "d");
    timeChange(start, end);
  }, []);

  return <CustomCard title={title} operation={operation} content={content} />;
};

export default DashboardTop;
