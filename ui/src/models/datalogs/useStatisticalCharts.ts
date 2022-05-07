import { useState } from "react";

const useStatisticalCharts = () => {
  const [activeQueryType, setActiveQueryType] = useState<string>("rawLog");

  const [chartSql, setChartSql] = useState<string>();
  const onChangeChartSql = (sql: string | undefined) => {
    setChartSql(sql);
  };

  return {
    activeQueryType,
    setActiveQueryType,
    chartSql,
    onChangeChartSql,
  };
};
export default useStatisticalCharts;
