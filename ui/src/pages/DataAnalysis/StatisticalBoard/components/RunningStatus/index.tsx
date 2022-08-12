import CustomCard from "@/components/CustomCard";
import { Chart, Axis, Tooltip, Coordinate, Interval } from "bizcharts";
import { useMemo } from "react";
import { dashboardDataType } from "../..";

export interface RunningStatusType {
  dashboardData: dashboardDataType;
}

const cols = {
  percent: {
    formatter: (val: any) => {
      return (val * 100).toFixed(2) + "%";
    },
  },
};

const RunningStatus = (props: RunningStatusType) => {
  const { dashboardData } = props;
  const {
    nodeFailed,
    nodeSuccess,
    nodeUnknown,
    workerFailed,
    workerSuccess,
    workerUnknown,
  } = dashboardData;

  const pieData = useMemo(() => {
    return [
      {
        item: "失败实例",
        percent:
          workerFailed / (workerFailed + workerSuccess + workerUnknown) || 0,
        value: workerFailed,
      },
      {
        item: "成功实例",
        percent:
          workerSuccess / (workerFailed + workerSuccess + workerUnknown) || 0,
        value: workerSuccess,
      },
      {
        item: "未知实例",
        percent:
          workerUnknown / (workerFailed + workerSuccess + workerUnknown) || 0,
        value: workerUnknown,
      },
    ];
  }, [workerFailed, workerSuccess, workerUnknown]);

  const pieData2 = useMemo(() => {
    return [
      {
        item: "失败节点",
        percent: nodeFailed / (nodeFailed + nodeSuccess + nodeUnknown) || 0,
        value: nodeFailed,
      },
      {
        item: "成功节点",
        percent: nodeSuccess / (nodeFailed + nodeSuccess + nodeUnknown) || 0,
        value: nodeSuccess,
      },
      {
        item: "未知节点",
        percent: nodeUnknown / (nodeFailed + nodeSuccess + nodeUnknown) || 0,
        value: nodeUnknown,
      },
    ];
  }, [nodeFailed, nodeSuccess, nodeUnknown]);

  const content = useMemo(() => {
    return (
      <div style={{ display: "flex" }}>
        <Chart
          height={"calc(100vh - 460px)"}
          width={"100%"}
          data={pieData}
          scale={cols}
          autoFit
          interactions={["element-single-selected"]}
        >
          <Coordinate type="theta" radius={0.75} innerRadius={0.7} />
          <Tooltip showTitle={false} />
          <Axis visible={false} />
          <Interval
            position="percent"
            adjust="stack"
            color={["item", ["#E95F3A", "#40E0D0", "#bfbfbf"]]}
            style={{
              lineWidth: 1,
              stroke: "#fff",
            }}
            label={[
              "*",
              {
                content: (data) => {
                  return data.value ? `${data.item}: ${data.value}` : "";
                },
              },
            ]}
          />
        </Chart>
        <Chart
          height={"calc(100vh - 460px)"}
          width={"100%"}
          data={pieData2}
          scale={cols}
          autoFit
          interactions={["element-single-selected"]}
        >
          <Coordinate type="theta" radius={0.75} innerRadius={0.7} />
          <Tooltip showTitle={false} />
          <Axis visible={false} />
          <Interval
            position="percent"
            adjust="stack"
            color={["item", ["#E95F3A", "#40E0D0", "#bfbfbf"]]}
            style={{
              lineWidth: 1,
              stroke: "#fff",
            }}
            label={[
              "*",
              {
                content: (data) => {
                  return data.value ? `${data.item}: ${data.value}` : "";
                },
              },
            ]}
          />
        </Chart>
      </div>
    );
  }, [pieData, pieData2]);

  return (
    <CustomCard
      title={"运行状态分布"}
      style={{ flex: 1, marginRight: "10px" }}
      content={content}
    />
  );
};
export default RunningStatus;
