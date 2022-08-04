import offlineStyles from "@/pages/DataAnalysis/OfflineManager/index.less";
import RightMenu from "@/pages/DataAnalysis/components/RightMenu";
import { BigDataNavEnum } from "@/pages/DataAnalysis/service/enums";
import { Spin } from "antd";
import { useMemo } from "react";
import { useModel } from "umi";
import WorkflowContent from "../WorkflowContent";

export interface TabPaneItemType {
  id: number;
  node: any;
  currentOfflinePaneActiveKey: string;
  parentId: number;
}

const TabPaneItem = (props: TabPaneItemType) => {
  const { id, node, currentOfflinePaneActiveKey, parentId } = props;
  const { navKey, currentInstances, doGetNodeInfo, doResultsList } =
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
      id &&
      (navKey == BigDataNavEnum.TemporaryQuery ||
        navKey == BigDataNavEnum.OfflineManage)
    ) {
      return (
        <RightMenu
          node={node}
          currentPaneActiveKey={currentOfflinePaneActiveKey}
        />
      );
    }
    return <></>;
  }, [navKey, currentInstances, id]);
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
          <WorkflowContent
            id={id}
            parentId={parentId}
            node={node}
            currentPaneActiveKey={currentOfflinePaneActiveKey}
          />
          {rightMenu}
        </div>
      </Spin>
    </>
  );
};
export default TabPaneItem;
