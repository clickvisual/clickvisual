import { useState } from "react";
import { AlarmHistoryRequest, AlarmInfoType } from "@/services/alarm";
import api from "@/services/alarm";
import useRequest from "@/hooks/useRequest/useRequest";
import { FIRST_PAGE } from "@/config/config";

export const ALARM_HISTORY_PATH =
  process.env.PUBLIC_PATH + "alarm/rules/history?id=";

const useAlarmHistory = () => {
  const [currentAlarm, setCurrentAlarm] = useState<AlarmInfoType>();
  const [query, setQuery] = useState<AlarmHistoryRequest>();
  const [currentPagination, setCurrentPagination] = useState<API.Pagination>({
    current: FIRST_PAGE,
    pageSize: 5,
    total: 0,
  });

  const doGetAlarmHistoryList = useRequest(api.getAlarmHistories, {
    loadingText: false,
  });

  return {
    query,
    setQuery,
    currentAlarm,
    setCurrentAlarm,
    currentPagination,
    setCurrentPagination,
    doGetAlarmHistoryList,
  };
};
export default useAlarmHistory;
