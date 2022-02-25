import alarmStyles from "@/pages/Alarm/styles/index.less";
import classNames from "classnames";
import Operations from "@/pages/Alarm/components/Operations";
import AlarmTable from "@/pages/Alarm/components/AlarmTable";
import FormAlarmDraw from "@/pages/Alarm/components/FormAlarmDraw";
const Alarm = () => {
  return (
    <div className={classNames(alarmStyles.alarmMain)}>
      <Operations />
      <AlarmTable />
      <FormAlarmDraw />
    </div>
  );
};
export default Alarm;
