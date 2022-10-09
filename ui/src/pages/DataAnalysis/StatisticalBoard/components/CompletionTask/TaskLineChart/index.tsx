import { Empty } from "antd";
import { Chart, LineAdvance } from "bizcharts";
import moment from "moment";
import { useMemo } from "react";
import { dashboardDataType } from "../../..";

const TaskLineChart = (props: { dataList: dashboardDataType["flows"] }) => {
  const { dataList } = props;
  const data = useMemo(() => {
    let newData: {
      time: string;
      type: string;
      num: number;
    }[] = [];
    if (dataList && dataList.length > 0) {
      dataList?.map(
        (item: {
          timestamp: number;
          unknown: number;
          failed: number;
          success: number;
        }) => {
          let arr: {
            time: string;
            type: string;
            num: number;
          }[] = [
            {
              time: moment(item.timestamp * 1000).format("MM-DD HH:mm:ss"),
              type: "failed",
              num: item.failed,
            },
            {
              time: moment(item.timestamp * 1000).format("MM-DD HH:mm:ss"),
              type: "success",
              num: item.success,
            },
            {
              time: moment(item.timestamp * 1000).format("MM-DD HH:mm:ss"),
              type: "unknown",
              num: item.unknown,
            },
          ];
          newData.push(...arr);
        }
      );
    }
    return newData;
  }, [dataList]);

  return (
    <>
      {data.length ? (
        <Chart
          padding={[10, 20, 50, 40]}
          autoFit
          height={"calc(100vh - 460px)"}
          data={data}
        >
          <LineAdvance
            shape="smooth"
            point
            area
            position="time*num"
            color={["type", ["#E95F3A", "#40E0D0", "#bfbfbf"]]}
          />
        </Chart>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "calc(100vh - 460px)",
          }}
        >
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )}
    </>
  );
};

export default TaskLineChart;
