import api, { AlarmInfoType } from "@/services/alarm";
import { useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";
import { formatMessage } from "@@/plugin-locale/localeExports";

const useAlarmFormDraw = () => {
  const [visibleDraw, setVisibleDraw] = useState<boolean>(false);
  const [visibleInfo, setVisibleInfo] = useState<boolean>(false);
  const [isEditor, setIsEditor] = useState<boolean>(false);

  const [alarmInfo, setAlarmInfo] = useState<AlarmInfoType>();

  const onChangeVisibleDraw = (visible: boolean) => {
    setVisibleDraw(visible);
  };
  const onChangeVisibleInfo = (visible: boolean) => {
    setVisibleInfo(visible);
  };

  const onChangeIsEditor = (flag: boolean) => {
    setIsEditor(flag);
  };

  const doGetAlarmInfo = useRequest(api.getAlarmInfo, { loadingText: false });

  const doCreatedAlarm = useRequest(api.createdAlarm, {
    loadingText: {
      loading: undefined,
      done: formatMessage({ id: "alarm.rules.created" }),
    },
  });

  const doUpdatedAlarm = useRequest(api.updatedAlarm, {
    loadingText: false,
  });

  return {
    visibleDraw,
    visibleInfo,
    isEditor,
    alarmInfo,
    setAlarmInfo,
    onChangeVisibleDraw,
    onChangeVisibleInfo,
    onChangeIsEditor,

    doGetAlarmInfo,
    doCreatedAlarm,
    doUpdatedAlarm,
  };
};
export default useAlarmFormDraw;
