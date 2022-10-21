import { microsecondsTimeUnitConversion } from "@/utils/time";
import styles from "../index.less";
const CalibrationRight = (props: { log: any }) => {
  const { log } = props;

  return (
    <div
      className={styles.calibrationRight}
      data-time={microsecondsTimeUnitConversion((log?.duration * 4) / 4)}
    >
      <span>{microsecondsTimeUnitConversion((log?.duration * 0) / 4)}</span>
      <span>{microsecondsTimeUnitConversion((log?.duration * 1) / 4)}</span>
      <span>{microsecondsTimeUnitConversion((log?.duration * 2) / 4)}</span>
      <span>{microsecondsTimeUnitConversion((log?.duration * 3) / 4)}</span>
    </div>
  );
};
export default CalibrationRight;
