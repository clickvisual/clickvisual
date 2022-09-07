import { nanosecondTimeUnitConversion } from "@/utils/time";
import styles from "../index.less";
const CalibrationRight = (props: { endTime: number; startTime: number }) => {
  const { endTime, startTime } = props;

  return (
    <div
      className={styles.calibrationRight}
      data-time={nanosecondTimeUnitConversion(((endTime - startTime) * 4) / 4)}
    >
      <span>
        {nanosecondTimeUnitConversion(((endTime - startTime) * 0) / 4)}
      </span>
      <span>
        {nanosecondTimeUnitConversion(((endTime - startTime) * 1) / 4)}
      </span>
      <span>
        {nanosecondTimeUnitConversion(((endTime - startTime) * 2) / 4)}
      </span>
      <span>
        {nanosecondTimeUnitConversion(((endTime - startTime) * 3) / 4)}
      </span>
    </div>
  );
};
export default CalibrationRight;
