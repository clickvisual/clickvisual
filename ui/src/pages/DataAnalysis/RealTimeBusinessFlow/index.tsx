import { BusinessEChart } from "@/pages/DataAnalysis/RealTimeBusinessFlow/components/BusinessChart";
import LibraryTree from "@/pages/DataAnalysis/RealTimeBusinessFlow/components/LibraryTree";
import TrafficStyles from "@/pages/DataAnalysis/RealTimeBusinessFlow/index.less";
import { useEffect } from "react";
import { useModel } from "@@/plugin-model/useModel";

const RealTimeTrafficFlow = () => {
  const { setBusinessChart, setEdges, setNodes } = useModel(
    "dataAnalysis",
    (model) => ({
      setEdges: model.realTimeTraffic.setEdges,
      setNodes: model.realTimeTraffic.setNodes,
      setBusinessChart: model.realTimeTraffic.setBusinessChart,
    })
  );
  useEffect(() => {
    return () => {
      setBusinessChart([]);
      setEdges([]);
      setNodes([]);
    };
  }, []);
  return (
    <div className={TrafficStyles.realTimeTrafficMain}>
      <LibraryTree />
      <BusinessEChart />
    </div>
  );
};
export default RealTimeTrafficFlow;
