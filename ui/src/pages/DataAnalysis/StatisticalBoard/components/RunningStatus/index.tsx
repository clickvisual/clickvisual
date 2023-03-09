import CustomCard from "@/components/CustomCard";
import { Axis, Chart, Coordinate, Interval, Tooltip } from "bizcharts";
import { useMemo } from "react";
import { useIntl } from "umi";
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
  const i18n = useIntl();
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
        item: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.failureInstance",
        }),
        percent:
          workerFailed / (workerFailed + workerSuccess + workerUnknown) || 0,
        value: workerFailed,
      },
      {
        item: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.successfulInstance",
        }),
        percent:
          workerSuccess / (workerFailed + workerSuccess + workerUnknown) || 0,
        value: workerSuccess,
      },
      {
        item: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.unknownInstance",
        }),
        percent:
          workerUnknown / (workerFailed + workerSuccess + workerUnknown) || 0,
        value: workerUnknown,
      },
    ];
  }, [workerFailed, workerSuccess, workerUnknown]);

  const pieData2 = useMemo(() => {
    return [
      {
        item: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.failureNode",
        }),
        percent: nodeFailed / (nodeFailed + nodeSuccess + nodeUnknown) || 0,
        value: nodeFailed,
      },
      {
        item: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.successfulNode",
        }),
        percent: nodeSuccess / (nodeFailed + nodeSuccess + nodeUnknown) || 0,
        value: nodeSuccess,
      },
      {
        item: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.unknownNode",
        }),
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
      title={i18n.formatMessage({
        id: "bigdata.dataAnalysis.statisticalBoard.RunningStatus.title",
      })}
      style={{ flex: 1, marginRight: "10px" }}
      content={content}
    />
  );
};
export default RunningStatus;
