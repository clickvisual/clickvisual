import { useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";
import statisticalBoardApi from "@/services/statisticalBoard";

const useStatisticalBoard = () => {
  const [dashboardData, setDashboardData] = useState<any>({});

  const onChangeDashboardData = (obj: any) => {
    setDashboardData(obj);
  };

  const doGetDashboard = useRequest(statisticalBoardApi.getDashboard, {
    loadingText: false,
  });

  const doGetTaskList = useRequest(statisticalBoardApi.getTaskList, {
    loadingText: false,
  });

  return {
    dashboardData,
    onChangeDashboardData,
    doGetDashboard,
    doGetTaskList,
  };
};
export default useStatisticalBoard;
