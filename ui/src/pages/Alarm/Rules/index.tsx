import alarmStyles from "@/pages/Alarm/Rules/styles/index.less";
import classNames from "classnames";
import Operations from "@/pages/Alarm/Rules/components/Operations";
import AlarmTable from "@/pages/Alarm/Rules/components/AlarmTable";
import FormAlarmDraw from "@/pages/Alarm/Rules/components/FormAlarmDraw";
import AlarmInfoDraw from "@/pages/Alarm/Rules/components/AlarmInfoDraw";
import AlarmHistory from "@/pages/Alarm/Rules/components/AlarmHistory";
const Alarm = () => {
  return (
    <div className={classNames(alarmStyles.alarmMain)}>
      <Operations />
      <AlarmTable />
      <FormAlarmDraw />
      <AlarmInfoDraw />
      <AlarmHistory />
    </div>
  );
};
export default Alarm;
