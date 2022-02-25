import darkTimeStyles from "@/pages/DataLogs/components/DateTimeSelected/index.less";
import { DatePicker } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import moment from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";
import { PaneType } from "@/models/dataLogs";
import { FIFTEEN_TIME, MINUTES_UNIT_TIME } from "@/config/config";

const { RangePicker } = DatePicker;

const CustomTimeInterval = () => {
  const {
    logPanes,
    currentLogLibrary,
    startDateTime,
    endDateTime,
    onChangeStartDateTime,
    onChangeEndDateTime,
    onChangeActiveTimeOptionIndex,
    onChangeLogPane,
  } = useModel("dataLogs");
  const oldPane = logPanes.find(
    (item) => item.paneId === currentLogLibrary?.id
  ) as PaneType;
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
            onChangeLogPane({ ...oldPane, start, end, activeIndex: -1 });
          } else {
            const start = moment()
              .subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME)
              .unix();
            const end = currentTimeStamp();
            onChangeActiveTimeOptionIndex(2);
            onChangeStartDateTime(start);
            onChangeEndDateTime(end);
            onChangeLogPane({ ...oldPane, start, end, activeIndex: 2 });
          }
        }}
      />
    </div>
  );
};
export default CustomTimeInterval;
