import api from "@/services/alarm";
import { useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";
import { formatMessage } from "@@/plugin-locale/localeExports";

const useAlarmFormDraw = () => {
  const [visibleDraw, setVisibleDraw] = useState<boolean>(false);
  const [isEditor, setIsEditor] = useState<boolean>(false);

  const onChangeVisibleDraw = (visible: boolean) => {
    setVisibleDraw(visible);
  };

  const onChangeIsEditor = (flag: boolean) => {
    setIsEditor(flag);
  };

  const doGetAlarmInfo = useRequest(api.getAlarmInfo, { loadingText: false });

  const doCreatedAlarm = useRequest(api.createdAlarm, {
    loadingText: {
      loading: undefined,
      done: formatMessage({ id: "alarm.created" }),
    },
  });

  const doUpdatedAlarm = useRequest(api.updatedAlarm, {
    loadingText: {
      loading: undefined,
      done: formatMessage({ id: "alarm.updated" }),
    },
  });

  return {
    visibleDraw,
    isEditor,
    onChangeVisibleDraw,
    onChangeIsEditor,

    doGetAlarmInfo,
    doCreatedAlarm,
    doUpdatedAlarm,
  };
};
export default useAlarmFormDraw;
