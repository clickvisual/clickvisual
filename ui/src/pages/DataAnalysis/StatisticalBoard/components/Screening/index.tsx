import styles from "./index.less";
import { Button, DatePicker } from "antd";
import { useEffect, useMemo, useState } from "react";
import moment from "moment";
const { RangePicker } = DatePicker;

export enum timeStateType {
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

const Screening = (props: {
  onGetList: (data: {
    start?: number;
    end?: number;
    isInCharge?: number;
  }) => void;
}) => {
  const { onGetList } = props;
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

  useEffect(() => {
    const start = +moment().startOf("day").subtract(1, "d");
    const end = +moment().endOf("day").subtract(1, "d");
    timeChange(start, end);
  }, []);

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
  return <div className={styles.ScreeningBox}>{operation}</div>;
};
export default Screening;
