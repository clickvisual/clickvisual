import api from "@/services/alarm";
import { useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";
import { FIRST_PAGE, PAGE_SIZE } from "@/config/config";
const useAlarm = () => {
  const [alarmList, setAlarmList] = useState<any[]>([]);
  const [currentPagination, setPagination] = useState<API.Pagination>({
    current: FIRST_PAGE,
    pageSize: PAGE_SIZE,
    total: 0,
  });

  const doGetAlarms = useRequest(api.getAlarmList, {
    loadingText: false,
    onSuccess: (res) => {
      setAlarmList(res.data);
      if (res.pagination) onChangePagination(res.pagination);
    },
  });

  const doDeletedAlarm = useRequest(api.deletedAlarm, { loadingText: false });

  const onChangePagination = (pagination: API.Pagination) => {
    setPagination(pagination);
  };

  return {
    alarmList,
    doGetAlarms,
    doDeletedAlarm,
    currentPagination,
    onChangePagination,
  };
};
export default useAlarm;
