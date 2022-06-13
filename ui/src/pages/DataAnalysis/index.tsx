import style from "./index.less";
import TemporaryQuery from "@/pages/DataAnalysis/TemporaryQuery";
import RealTimeTrafficFlow from "@/pages/DataAnalysis/RealTimeBusinessFlow";
import DataAnalysisNav from "@/pages/DataAnalysis/Nav";
import DataAnalysisScreening from "@/pages/DataAnalysis/Screening";
import { useModel } from "umi";

const DataAnalysis = () => {
  const { navKey } = useModel("dataAnalysis");

  const navContent = () => {
    switch (navKey) {
      case "TemporaryQuery":
        return <TemporaryQuery />;

      case "RealTimeTrafficFlow":
        return <RealTimeTrafficFlow />;

      default:
        return <></>;
    }
  };

  return (
    <div className={style.main}>
      <DataAnalysisScreening />
      <div className={style.contentBox}>
        <DataAnalysisNav />
        <div className={style.content}>{navContent()}</div>
      </div>
    </div>
  );
};

export default DataAnalysis;
