import highChartsStyles from "@/pages/DataLogs/components/HighCharts/index.less";
import { Chart, Tooltip, Interval, Interaction } from "bizcharts";
import { Empty } from "antd";
import classNames from "classnames";
import { useModel } from "@@/plugin-model/useModel";
import { useMemo, useRef, useState } from "react";
import HighChartsTooltip from "@/pages/DataLogs/components/HighCharts/HighChartsTooltip";
import moment from "moment";
import { ACTIVE_TIME_NOT_INDEX, TimeRangeType } from "@/config/config";
import { useIntl } from "umi";
import { PaneType } from "@/models/datalogs/types";

const HighCharts = () => {
  const {
    currentLogLibrary,
    doGetLogsAndHighCharts,
    isHiddenHighChart,
    highChartList,
    onChangeLogPane,
    onChangeCurrentLogPane,
    currentRelativeUnit,
    logPanesHelper,
    resetLogPaneLogsAndHighCharts,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const [highChartPosition, setHighChartPosition] = useState<"left" | "right">(
    "left"
  );
  const downTime = useRef<number>();
  const isSelectRange = useRef<boolean>(false);

  const i18n = useIntl();

  const format = (timeStr: string | number, formatType: string) => {
    return moment(timeStr, "X").format(formatType);
  };

  const formatTimes = {
    minutes: "LTS",
    hours: "LT",
    days: "L",
    months: "L",
    years: "YYYY/MM",
  };

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const scale = {
    from: {
      type: "timeCat",
      tickCount: 8,
      formatter: (text: string) =>
        format(text, formatTimes[currentRelativeUnit]),
    },
    count: {
      type: "pow",
      exponent: 1,
      tickCount: 1,
      min: 0,
      formatter: (text: string) =>
        parseInt(text) > 10000 ? `${parseInt(text) / 1000}k` : parseInt(text),
    },
  };

  const getChartDate = (view: any, x: number, y: number) => {
    const dataList = view.getSnapRecords({ x, y });
    if (dataList && dataList.length) {
      return dataList[0]._origin;
    }
    return undefined;
  };
  const onChangePosition = (x: number) => {
    if (x < 240) {
      setHighChartPosition("right");
    } else {
      setHighChartPosition("left");
    }
  };

  const onPlotMousemove = ({ x }: any) => {
    if (isSelectRange.current) return;
    onChangePosition(x);
  };

  const onPlotMousedown = ({ view, x, y }: any) => {
    isSelectRange.current = true;
    const data = getChartDate(view, x, y);
    if (!data) return;
    downTime.current = data.from;
  };

  const onMouseup = ({ view, x, y }: any) => {
    if (isSelectRange.current) {
      onChangePosition(x);
      isSelectRange.current = false;
    }
    const data = getChartDate(view, x, y);
    if (downTime.current && data && currentLogLibrary?.id) {
      const start = downTime.current < data.to ? downTime.current : data.to;
      const end = downTime.current < data.to ? data.to : downTime.current;
      const pane = {
        ...(oldPane as PaneType),
        start,
        end,
        activeIndex: ACTIVE_TIME_NOT_INDEX,
        activeTabKey: TimeRangeType.Custom,
      };
      onChangeCurrentLogPane(pane);
      doGetLogsAndHighCharts(currentLogLibrary.id, {
        reqParams: { st: start, et: end },
      })
        .then((res) => {
          if (!res) {
            resetLogPaneLogsAndHighCharts(pane);
          } else {
            pane.logs = res.logs;
            pane.highCharts = res.highCharts;
            onChangeLogPane(pane);
          }
        })
        .catch(() => resetLogPaneLogsAndHighCharts(pane));
    }
  };

  return (
    <div
      className={classNames(
        isHiddenHighChart
          ? highChartsStyles.highCartMainHidden
          : highChartsStyles.highChartsMain
      )}
    >
      <Chart
        autoFit
        scale={scale}
        height={100}
        data={highChartList}
        interactions={["active-region"]}
        padding={"auto"}
        notCompareData={false}
        onPlotMousemove={onPlotMousemove}
        onPlotMousedown={onPlotMousedown}
        onMouseup={onMouseup}
        placeholder={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      >
        <Interval position="from*count" color={"hsl(21, 85%, 56%)"} />
        <Tooltip
          domStyles={{ "g2-tooltip": { background: "hsla(0,0%,0%,.8)" } }}
          shared
          position={highChartPosition}
          showTitle={false}
          region={null}
          offset={20}
        >
          {(title, items) => {
            if (!items) return <></>;
            const data = items[0].data;
            return (
              <HighChartsTooltip i18n={i18n} data={data} format={format} />
            );
          }}
        </Tooltip>
        <Interaction
          type={"brush-x"}
          config={{
            showEnable: [
              { trigger: "plot:mouseenter", action: ["cursor:pointer"] },
              { trigger: "plot:mouseleave", action: ["cursor:default"] },
            ],
            start: [
              {
                trigger: "plot:mousedown",
                action: ["x-rect-mask:start", "rect-mask:show"],
              },
            ],
            processing: [
              {
                trigger: "plot:mousemove",
                action: ["x-rect-mask:resize", "cursor:crosshair"],
              },
              {
                trigger: "plot:mouseleave",
                action: ["x-rect-mask:resize", "tooltip:hide"],
              },
            ],
            end: [
              {
                trigger: "mouseup",
                action: ["rect-mask:end", "rect-mask:hide"],
              },
            ],
          }}
        />
      </Chart>
    </div>
  );
};

export default HighCharts;
