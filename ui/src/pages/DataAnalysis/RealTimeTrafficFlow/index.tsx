import { TrafficEChart } from "@/pages/DataAnalysis/RealTimeTrafficFlow/components/TrafficChart";
import LibraryTree from "@/pages/DataAnalysis/RealTimeTrafficFlow/components/LibraryTree";
import TrafficStyles from "@/pages/DataAnalysis/RealTimeTrafficFlow/index.less";

const RealTimeTrafficFlow = () => {
  return (
    <div className={TrafficStyles.realTimeTrafficMain}>
      <LibraryTree />
      <TrafficEChart />
    </div>
  );
};
export default RealTimeTrafficFlow;
