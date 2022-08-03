import offlineStyles from "@/pages/DataAnalysis/OfflineManager/index.less";
import RightMenu from "@/pages/DataAnalysis/components/RightMenu";
import { BigDataNavEnum } from "@/pages/DataAnalysis/service/enums";
import { Spin } from "antd";
import { useMemo } from "react";
import { useModel } from "umi";
import WorkflowContent from "../WorkflowContent";

const TabPaneItem = () => {
  const { navKey, currentInstances, doGetNodeInfo, doResultsList, openNodeId } =
    useModel("dataAnalysis");
  const { updateNode, getNodeInfo, doUnLockNode } = useModel(
    "dataAnalysis",
    (model) => ({
      updateNode: model.manageNode.doUpdatedNode,
      getNodeInfo: model.manageNode.doGetNodeInfo,
      doUnLockNode: model.manageNode.doUnLockNode,
    })
  );

  const rightMenu = useMemo(() => {
    if (
      currentInstances &&
      openNodeId &&
      (navKey == BigDataNavEnum.TemporaryQuery ||
        navKey == BigDataNavEnum.OfflineManage)
    ) {
      return <RightMenu />;
    }
    return <></>;
  }, [navKey, currentInstances, openNodeId]);
  return (
    <>
      <Spin
        spinning={
          doGetNodeInfo.loading ||
          doResultsList.loading ||
          getNodeInfo.loading ||
          doUnLockNode.loading ||
          updateNode.loading
        }
      >
        <div className={offlineStyles.contentMain}>
          <WorkflowContent />
          {rightMenu}
        </div>
      </Spin>
    </>
  );
};
export default TabPaneItem;
