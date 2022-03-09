import historyStyles from "@/pages/Alarm/Rules/components/AlarmHistory/index.less";
import { Empty, Progress } from "antd";
// import { Chart, Line, Point, Tooltip } from "bizcharts";
import { AlarmHistoryType } from "@/services/alarm";
import { useMemo } from "react";
// import moment from "moment";
import { useIntl } from "umi";

type HistoryBoardProps = {
  sucPublish: number;
  total: number;
  dataList: AlarmHistoryType[];
};
const HistoryBoard = ({ sucPublish, total, dataList }: HistoryBoardProps) => {
  const i18n = useIntl();

  const data = useMemo(() => {
    if (dataList?.length <= 0) return [];
    return dataList?.map((item) => {
      return {
        ctime: item.ctime,
        sucPublish: item.isPushed,
      };
    });
  }, [dataList]);

  return (
    <div className={historyStyles.board}>
      <div className={historyStyles.count}>
        <div className={historyStyles.content}>
          <div>
            <span className={historyStyles.title}>
              {i18n.formatMessage({ id: "alarm.rules.history.title.total" })}
              :&nbsp;
            </span>
            <span>{total}</span>
          </div>
          <div>
            <span className={historyStyles.title}>
              {i18n.formatMessage({
                id: "alarm.rules.history.title.sucPublish",
              })}
              :&nbsp;
            </span>
            <span>{sucPublish}</span>
          </div>
        </div>
        <div className={historyStyles.progress}>
          <Progress type="circle" percent={(sucPublish / total) * 100} />
        </div>
      </div>
      <div className={historyStyles.divider} />
      <div className={historyStyles.chart}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={"plan...."} />
        {/* todo: Alarm statistics line chart */}
        {/*<Chart*/}
        {/*  padding={[30, 20, 60, 40]}*/}
        {/*  autoFit*/}
        {/*  height={240}*/}
        {/*  data={data}*/}
        {/*  onLineClick={console.log}*/}
        {/*  scale={{*/}
        {/*    sucPublish: {*/}
        {/*      min: 0,*/}
        {/*      alias: "是否推送报警",*/}
        {/*      type: "linear-strict",*/}
        {/*    },*/}
        {/*    ctime: {*/}
        {/*      formatter: (v: number) => {*/}
        {/*        return moment(v, "X").format("YYYY/MM/DD");*/}
        {/*      },*/}
        {/*    },*/}
        {/*  }}*/}
        {/*>*/}
        {/*  <Line position="ctime*sucPublish" />*/}
        {/*  <Point position="ctime*sucPublish" />*/}
        {/*  <Tooltip showCrosshairs follow={false} />*/}
        {/*</Chart>*/}
      </div>
    </div>
  );
};
export default HistoryBoard;
