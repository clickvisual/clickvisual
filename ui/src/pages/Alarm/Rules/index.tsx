import alarmStyles from "@/pages/Alarm/Rules/styles/index.less";
import classNames from "classnames";
import Operations from "@/pages/Alarm/Rules/components/Operations";
import AlarmTable from "@/pages/Alarm/Rules/components/AlarmTable";
import FormAlarmDraw from "@/pages/Alarm/Rules/components/FormAlarmDraw";
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
