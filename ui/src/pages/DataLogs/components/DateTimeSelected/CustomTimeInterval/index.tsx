import darkTimeStyles from "@/pages/DataLogs/components/DateTimeSelected/index.less";
import { DatePicker } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import moment from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";
import { FIFTEEN_TIME, MINUTES_UNIT_TIME } from "@/config/config";
import { PaneType } from "@/models/datalogs/useLogPanes";
import { useMemo } from "react";

const { RangePicker } = DatePicker;

const CustomTimeInterval = () => {
  const {
    logPanesHelper,
    currentLogLibrary,
    startDateTime,
    endDateTime,
    onChangeStartDateTime,
    onChangeEndDateTime,
    onChangeActiveTimeOptionIndex,
    onChangeCurrentLogPane,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  return (
    <div className={darkTimeStyles.tabCard}>
      <RangePicker
        showTime
        value={[moment(startDateTime, "X"), moment(endDateTime, "X")]}
        onChange={(dates) => {
          if (dates && dates[0] && dates[1]) {
            const start = dates[0].unix();
            const end = dates[1].unix();
            onChangeStartDateTime(start);
            onChangeEndDateTime(end);
            onChangeActiveTimeOptionIndex(-1);
            onChangeCurrentLogPane({
              ...(oldPane as PaneType),
              activeIndex: -1,
            });
          } else {
            const start = moment()
              .subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME)
              .unix();
            const end = currentTimeStamp();
            onChangeStartDateTime(start);
            onChangeEndDateTime(end);
            onChangeActiveTimeOptionIndex(2);
            onChangeCurrentLogPane({
              ...(oldPane as PaneType),
              activeIndex: 2,
            });
          }
        }}
      />
    </div>
  );
};
export default CustomTimeInterval;
