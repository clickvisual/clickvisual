import alarmStyles from "@/pages/Alarm/styles/index.less";
import classNames from "classnames";
import Operations from "@/pages/Alarm/components/Operations";
const Alarm = () => {
  return (
    <div className={classNames(alarmStyles.alarmMain)}>
      <Operations />
    </div>
  );
};
export default Alarm;
