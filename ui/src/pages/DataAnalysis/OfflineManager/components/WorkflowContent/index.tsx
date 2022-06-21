import WorkflowSql from "@/pages/DataAnalysis/components/SQLEditor";
import { useModel } from "@@/plugin-model/useModel";
import { useMemo } from "react";
import { Empty } from "antd";
import { SecondaryEnums } from "@/pages/DataAnalysis/service/enums";
import IntegratedConfiguration from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration";

const WorkflowContent = () => {
  const { selectNode } = useModel("dataAnalysis", (model) => ({
    selectNode: model.manageNode.selectNode,
  }));

  const Content = useMemo(() => {
    switch (selectNode?.secondary) {
      case SecondaryEnums.dataIntegration:
        return <IntegratedConfiguration currentNode={selectNode} />;
      case SecondaryEnums.dataMining:
        return <WorkflowSql />;
      default:
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
  }, [selectNode]);
  return <>{Content}</>;
};

export default WorkflowContent;
