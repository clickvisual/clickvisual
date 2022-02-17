import useAlarmOperations from "@/models/alarms/useAlarmOperations";
import useAlarmFormDraw from "@/models/alarms/useAlarmFormDraw";

const Alarm = () => {
  const operations = useAlarmOperations();
  const alarmDraw = useAlarmFormDraw();

  return {
    operations,
    alarmDraw,
  };
};
export default Alarm;
