import { useState } from "react";
import { QueryTypeEnum } from "@/config/config";
import useRequest from "@/hooks/useRequest/useRequest";
import api, { StatisticalTableResponse } from "@/services/dataLogs";

const useStatisticalCharts = () => {
  const [activeQueryType, setActiveQueryType] = useState<string>(
    QueryTypeEnum.LOG
  );

  const [chartSql, setChartSql] = useState<string>();
  const [logChart, setLogChart] = useState<StatisticalTableResponse>({
    logs: [],
  });

  const doGetStatisticalTable = useRequest(api.getStatisticalTable, {
    loadingText: false,
    onSuccess: (res) => setLogChart(res.data),
  });

  const onChangeChartSql = (sql: string | undefined) => {
    setChartSql(sql);
  };

  return {
    activeQueryType,
    setActiveQueryType,
    chartSql,
    onChangeChartSql,
    doGetStatisticalTable,
    logChart,
  };
};
export default useStatisticalCharts;
