import styles from "../index.less";
const CalibrationRight = (props: { endTime: number; startTime: number }) => {
  const { endTime, startTime } = props;

  return (
    <div
      className={styles.calibrationRight}
      data-time={(((endTime - startTime) * 4) / 4).toFixed(2) + "us"}
    >
      <span>
        {(((endTime - startTime) * 0) / 4).toFixed(2)}
        us
      </span>
      <span>
        {(((endTime - startTime) * 1) / 4).toFixed(2)}
        us
      </span>
      <span>
        {(((endTime - startTime) * 2) / 4).toFixed(2)}
        us
      </span>
      <span>
        {(((endTime - startTime) * 3) / 4).toFixed(2)}
        us
      </span>
    </div>
  );
};
export default CalibrationRight;
