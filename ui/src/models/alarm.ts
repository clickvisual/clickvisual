import useAlarmOperations from "@/models/alarms/useAlarmOperations";
import useAlarmFormDraw from "@/models/alarms/useAlarmFormDraw";
import useAlarm from "@/models/alarms/useAlarm";
import { useState } from "react";
import { AlarmType } from "@/services/alarm";
import useChannel from "@/models/alarms/useChannel";
import useChannelModal from "@/models/alarms/useChannelModal";

const Alarm = () => {
  const operations = useAlarmOperations();
  const alarmDraw = useAlarmFormDraw();

  const alarmChannel = useChannel();
  const alarmChannelModal = useChannelModal();

  const {
    alarmList,
    doGetAlarms,
    doDeletedAlarm,
    currentPagination,
    onChangePagination,
  } = useAlarm();

  const [currentRowAlarm, setCurrentRowAlarm] = useState<
    AlarmType | undefined
  >();

  const onChangeRowAlarm = (alarm: AlarmType | undefined) => {
    setCurrentRowAlarm(alarm);
  };

  return {
    currentRowAlarm,
    operations,
    alarmDraw,
    alarmChannel,
    alarmChannelModal,

    onChangeRowAlarm,

    alarmList,
    doGetAlarms,
    doDeletedAlarm,
    currentPagination,
    onChangePagination,
  };
};
export default Alarm;
