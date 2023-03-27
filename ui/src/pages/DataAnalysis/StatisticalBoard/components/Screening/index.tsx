import { Button, DatePicker } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useIntl } from "umi";
import styles from "./index.less";
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
  iid: number;
}) => {
  const { onGetList, iid } = props;
  const i18n = useIntl();
  const [timeState, setTimeState] = useState<string>("yesterday");
  const [isInCharge, setIsInCharge] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isFirst, setIsFirst] = useState<boolean>(true);

  const timeChange = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    onGetList({ start, end, isInCharge: Number(isInCharge) });
  };

  const timeList = useMemo(() => {
    return [
      {
        key: timeStateType.yesterday,
        title: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.yesterday",
        }),
        onClick: () => {
          const start = +dayjs().startOf("day").subtract(1, "d");
          const end = +dayjs().endOf("day").subtract(1, "d");
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
        title: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.beforeYesterday",
        }),
        onClick: () => {
          const start = +dayjs().startOf("day").subtract(2, "d");
          const end = +dayjs().endOf("day").subtract(2, "d");
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
        title: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.nearlyWeek",
        }),
        onClick: () => {
          const start = +dayjs().subtract(7, "d");
          const end = +dayjs();
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
          value={[dayjs(startTime / 1000, "X"), dayjs(endTime / 1000, "X")]}
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
            {i18n.formatMessage({
              id: "bigdata.models.dataAnalysis.useManageNodeAndFolder.all",
            })}
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
            {i18n.formatMessage({
              id: "bigdata.dataAnalysis.statisticalBoard.Screening.inCharge",
            })}
          </Button>
        </>
      </div>
    );
  }, [timeList, startTime, endTime]);

  useEffect(() => {
    if (isFirst) {
      const start = +dayjs().startOf("day").subtract(1, "d");
      const end = +dayjs().endOf("day").subtract(1, "d");
      timeChange(start, end);
      setIsFirst(false);
      return;
    }

    onGetList({
      end: endTime,
      start: startTime,
      isInCharge: Number(isInCharge),
    });
  }, [iid]);

  return <div className={styles.ScreeningBox}>{operation}</div>;
};
export default Screening;
