import { FIRST_PAGE } from "@/config/config";
import { PaneType } from "@/models/datalogs/types";
import {
  DarkTimeContext,
  TimeUnit,
} from "@/pages/DataLogs/components/DateTimeSelected";
import darkTimeStyles from "@/pages/DataLogs/components/DateTimeSelected/index.less";
import { currentTimeStamp, timeStampFormat } from "@/utils/momentUtils";
import { useModel } from "@umijs/max";
import classNames from "classnames";
import moment from "moment";
import { useContext, useMemo, useState } from "react";

const RelativeTime = (props: { onChangeVisble: (flag: boolean) => void }) => {
  const {
    logPanesHelper,
    currentLogLibrary,
    startDateTime,
    endDateTime,
    activeTimeOptionIndex,
    onChangeCurrentLogPane,
    doGetLogsAndHighCharts,
    onChangeCurrentRelativeAmount,
    onChangeCurrentRelativeUnit,
    onChangeActiveTimeOptionIndex,
    resetLogPaneLogsAndHighCharts,
  } = useModel("dataLogs");
  const [startTime, setStartTime] = useState<number>(startDateTime as number);
  const [endTime, setEndTime] = useState<number>(endDateTime as number);
  const { timeOptions } = useContext(DarkTimeContext);
  const { logPanes } = logPanesHelper;
  const { onChangeVisble } = props;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const handleSelect = (
    relativeAmount: number,
    relativeUnit: TimeUnit,
    index: number
  ) => {
    if (!currentLogLibrary?.id) return;
    onChangeVisble(false);
    const start = moment().subtract(relativeAmount, relativeUnit).unix();
    const end = currentTimeStamp();
    const params = {
      st: start,
      et: end,
      page: FIRST_PAGE,
    };
    const pane: PaneType = {
      ...(oldPane as PaneType),
      start,
      end,
      page: FIRST_PAGE,
      activeIndex: index,
    };
    onChangeCurrentLogPane(pane);
    doGetLogsAndHighCharts(currentLogLibrary.id, { reqParams: params })
      .then((res) => {
        if (!res) {
          resetLogPaneLogsAndHighCharts(pane);
        } else {
          pane.logs = res.logs;
          pane.highCharts = res.highCharts;
          pane.logChart = { logs: [], isNeedSort: false, sortRule: ["*"] };
          onChangeCurrentLogPane(pane);
        }
      })
      .catch(() => resetLogPaneLogsAndHighCharts(pane));
  };

  const handleMouseEnter = (relativeAmount: number, relativeUnit: TimeUnit) => {
    setStartTime(moment().subtract(relativeAmount, relativeUnit).unix());
    setEndTime(currentTimeStamp());
  };

  const handleMouseLeave = () => {
    setStartTime(startDateTime as number);
    setEndTime(endDateTime as number);
  };

  return (
    <div className={darkTimeStyles.tabCard}>
      <div className={darkTimeStyles.defaultTime}>
        {timeStampFormat(startTime)} ~ {timeStampFormat(endTime)}
      </div>
      <div className={darkTimeStyles.row}>
        {timeOptions.map((option, index) => (
          <div
            key={index}
            onClick={() => {
              handleSelect(option.relativeAmount, option.relativeUnit, index);
              onChangeActiveTimeOptionIndex(index);
              onChangeCurrentRelativeAmount(option.relativeAmount);
              onChangeCurrentRelativeUnit(option.relativeUnit);
            }}
            className={classNames(darkTimeStyles.timeOption, {
              [darkTimeStyles.activeOption]: index === activeTimeOptionIndex,
            })}
            onMouseEnter={() =>
              handleMouseEnter(option.relativeAmount, option.relativeUnit)
            }
            onMouseLeave={() => handleMouseLeave()}
          >
            {option.title}
          </div>
        ))}
      </div>
    </div>
  );
};
export default RelativeTime;
