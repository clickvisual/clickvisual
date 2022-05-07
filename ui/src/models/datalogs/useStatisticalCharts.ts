import { useState } from "react";
import { QueryTypeEnum } from "@/config/config";

const useStatisticalCharts = () => {
  const [activeQueryType, setActiveQueryType] = useState<string>(
    QueryTypeEnum.LOG
  );

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
