import useAlarmOperations from "@/models/alarms/useAlarmOperations";
import useAlarmFormDraw from "@/models/alarms/useAlarmFormDraw";
import useAlarm from "@/models/alarms/useAlarm";
import { useState } from "react";
import { AlarmType } from "@/services/alarm";
import useChannel from "@/models/alarms/useChannel";
import useChannelModal from "@/models/alarms/useChannelModal";
import useAlarmHistory from "@/models/alarms/useAlarmHistory";

const Alarm = () => {
  const AlarmStatus = [
    {
      status: 1,
      label: "未开启",
      color: "#f50",
    },
    {
      status: 2,
      label: "已开启",
      color: "#87d068",
    },
    {
      status: 3,
      label: "正在报警",
      color: "#108ee9",
    },
  ];

  const operations = useAlarmOperations();
  const alarmDraw = useAlarmFormDraw();

  const alarmChannel = useChannel();
  const alarmChannelModal = useChannelModal();
  const alarmHistory = useAlarmHistory();

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
    alarmHistory,

    onChangeRowAlarm,

    alarmList,
    doGetAlarms,
    doDeletedAlarm,
    currentPagination,
    onChangePagination,

    AlarmStatus,
  };
};
export default Alarm;
