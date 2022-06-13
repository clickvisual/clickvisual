import { BusinessEChart } from "@/pages/DataAnalysis/RealTimeBusinessFlow/components/BusinessChart";
import LibraryTree from "@/pages/DataAnalysis/RealTimeBusinessFlow/components/LibraryTree";
import TrafficStyles from "@/pages/DataAnalysis/RealTimeBusinessFlow/index.less";

const RealTimeTrafficFlow = () => {
  return (
    <div className={TrafficStyles.realTimeTrafficMain}>
      <LibraryTree />
      <BusinessEChart />
    </div>
  );
};
export default RealTimeTrafficFlow;
