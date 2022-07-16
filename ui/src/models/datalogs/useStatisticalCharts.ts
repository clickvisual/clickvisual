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
  const [aggregationChartSql, setAggregationChartSql] = useState<string>("");

  const doGetStatisticalTable = useRequest(api.getStatisticalTable, {
    loadingText: false,
    onSuccess: (res) => setLogChart(res.data),
  });

  const onChangeChartSql = (sql: string | undefined) => {
    setChartSql(sql);
  };

  const onChangeAggregationChartSql = (str: string) => {
    setAggregationChartSql(str);
  };

  return {
    activeQueryType,
    setActiveQueryType,
    chartSql,
    onChangeChartSql,
    aggregationChartSql,
    onChangeAggregationChartSql,
    doGetStatisticalTable,
    logChart,
    setLogChart,
  };
};
export default useStatisticalCharts;
