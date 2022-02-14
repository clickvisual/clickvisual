import useAlarmOperations from "@/models/alarms/useAlarmOperations";

const Alarm = () => {
  const operations = useAlarmOperations();

  return {
    operations,
  };
};
export default Alarm;
