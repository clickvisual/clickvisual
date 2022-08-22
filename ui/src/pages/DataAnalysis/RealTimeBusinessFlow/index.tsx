import { BusinessEChart } from "@/pages/DataAnalysis/RealTimeBusinessFlow/components/BusinessChart";
import LibraryTree from "@/pages/DataAnalysis/RealTimeBusinessFlow/components/LibraryTree";
import TrafficStyles from "@/pages/DataAnalysis/RealTimeBusinessFlow/index.less";
import { useEffect, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";

const RealTimeTrafficFlow = () => {
  const [utime, setUtime] = useState<number>();
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
      setUtime(undefined);
    };
  }, []);

  return (
    <div className={TrafficStyles.realTimeTrafficMain}>
      <LibraryTree setUtime={setUtime} />
      <BusinessEChart utime={utime} />
    </div>
  );
};
export default RealTimeTrafficFlow;
