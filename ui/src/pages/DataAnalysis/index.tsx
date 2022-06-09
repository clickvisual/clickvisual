import style from "./index.less";
import TemporaryQuery from "@/pages/DataAnalysis/TemporaryQuery";
import RealTimeTrafficFlow from "@/pages/DataAnalysis/RealTimeTrafficFlow";
import DataAnalysisNav from "@/pages/DataAnalysis/Nav";
import DataAnalysisScreening from "@/pages/DataAnalysis/Screening";
import { useModel } from "umi";

const DataAnalysis = () => {
  const { navKey } = useModel("dataAnalysis");

  return (
    <div className={style.main}>
      <DataAnalysisScreening />
      <div className={style.contentBox}>
        <DataAnalysisNav />
        <div className={style.content}>
          {navKey === "RealTimeTrafficFlow" && <RealTimeTrafficFlow />}
          {navKey === "TemporaryQuery" && <TemporaryQuery />}
        </div>
      </div>
    </div>
  );
};

export default DataAnalysis;
