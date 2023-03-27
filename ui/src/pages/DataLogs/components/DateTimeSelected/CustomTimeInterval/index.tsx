import { FIFTEEN_TIME } from "@/config/config";
import darkTimeStyles from "@/pages/DataLogs/components/DateTimeSelected/index.less";
import { currentTimeStamp } from "@/utils/momentUtils";
import { useModel } from "@umijs/max";
import { DatePicker } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const CustomTimeInterval = () => {
  const {
    startDateTime,
    endDateTime,
    onChangeStartDateTime,
    onChangeEndDateTime,
    onChangeActiveTimeOptionIndex,
  } = useModel("dataLogs");

  return (
    <div
      className={darkTimeStyles.tabCard}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <RangePicker
        showTime
        value={[dayjs(startDateTime, "X"), dayjs(endDateTime, "X")]}
        onChange={(dates) => {
          if (dates && dates[0] && dates[1]) {
            const start = dates[0].unix();
            const end = dates[1].unix();
            onChangeStartDateTime(start);
            onChangeEndDateTime(end);
            onChangeActiveTimeOptionIndex(-1);
          } else {
            const start = dayjs().subtract(FIFTEEN_TIME, "m").unix();
            const end = currentTimeStamp();
            onChangeStartDateTime(start);
            onChangeEndDateTime(end);
            onChangeActiveTimeOptionIndex(2);
          }
        }}
      />
    </div>
  );
};
export default CustomTimeInterval;
