import { useState } from "react";
import { AlarmInfoType } from "@/services/alarm";
import api from "@/services/alarm";
import useRequest from "@/hooks/useRequest/useRequest";
import { FIRST_PAGE } from "@/config/config";

const useAlarmHistory = () => {
  const [currentAlarm, setCurrentAlarm] = useState<AlarmInfoType>();
  const [historyVisible, setHistoryVisible] = useState<boolean>(false);
  const [currentPagination, setCurrentPagination] = useState<API.Pagination>({
    current: FIRST_PAGE,
    pageSize: 5,
    total: 0,
  });

  const doGetAlarmHistoryList = useRequest(api.getAlarmHistories, {
    loadingText: false,
  });

  return {
    historyVisible,
    setHistoryVisible,
    currentAlarm,
    setCurrentAlarm,
    currentPagination,
    setCurrentPagination,
    doGetAlarmHistoryList,
  };
};
export default useAlarmHistory;
