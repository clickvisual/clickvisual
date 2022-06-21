import { WorkflowInfo } from "@/services/bigDataWorkflow";
import { useIntl } from "umi";
import {
  OfflineRightMenuClickSourceEnums,
  PrimaryEnums,
  SecondaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import TreeNodeTypeIcon, {
  TreeNodeTypeEnums,
} from "@/components/TreeNodeTypeIcon";
import NodeTreeItem from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/NodeTreeItem";
import CustomTree, { NodeType } from "@/components/CustomTree";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { NodeInfo } from "@/services/dataAnalysis";

const WorkflowLine = ({ workflow }: { workflow: WorkflowInfo }) => {
  const i18n = useIntl();

  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentNode, setCurrentNode] = useState<any>();
  const [clickSource, setClickSource] =
    useState<OfflineRightMenuClickSourceEnums>(
      OfflineRightMenuClickSourceEnums.workflowHeader
    );

  const { getFolders, currentInstances } = useModel(
    "dataAnalysis",
    (model) => ({
      getFolders: model.manageNode.getFolders,
      currentInstances: model.currentInstances,
    })
  );

  useEffect(() => {
    if (!currentInstances) return;
    getFolders
      .run({
        iid: currentInstances,
        primary: PrimaryEnums.offline,
        workflowId: workflow.id,
      })
      .then((res) => {
        if (res?.code !== 0) return;
        setNodes(res.data.nodes);
        setFolders(res.data.children);
      });
  }, [currentInstances]);

  const handleRightClick = ({ node }: any) => {
    setCurrentNode(node.currentNode);
    setClickSource(node.source);
  };

  const handleCloseRightMenu = () => {
    setCurrentNode(undefined);
    setClickSource(OfflineRightMenuClickSourceEnums.workflowHeader);
  };

  const handleClickNode = (node: any) => {
    // todo: 处理点击树节点逻辑
  };

  const handleCloseModal = useCallback(() => {
    if (!currentInstances) return;
    getFolders
      .run({
        iid: currentInstances,
        primary: PrimaryEnums.offline,
        workflowId: workflow.id,
      })
      .then((res) => {
        if (res?.code !== 0) return;
        setNodes(res.data.nodes);
        setFolders(res.data.children);
      });
  }, [currentInstances]);

  const treeData: any[] = useMemo(() => {
    return [
      {
        key: workflow.id,
        title: workflow.name,
        icon: <TreeNodeTypeIcon type={TreeNodeTypeEnums.workflow} />,
        currentNode: workflow,
        source: OfflineRightMenuClickSourceEnums.workflowItem,
        nodeType: NodeType.folder,
        children: [
          {
            key: `${workflow.id}-${OfflineRightMenuClickSourceEnums.dataIntegration}`,
            title: i18n.formatMessage({
              id: "bigdata.workflow.dataIntegration",
            }),
            source: OfflineRightMenuClickSourceEnums.dataIntegration,
            currentNode: workflow,
            nodeType: NodeType.folder,
            children: [
              ...nodes
                .filter(
                  (node) =>
                    node.workflowId === workflow.id &&
                    node.primary === PrimaryEnums.offline &&
                    node.secondary === SecondaryEnums.dataIntegration
                )
                .map((node) => ({
                  currentNode: node,
                  key: node.id,
                  title: node.name,
                  nodeType: NodeType.node,
                  source: OfflineRightMenuClickSourceEnums.node,
                })),
              ...folders.map((folder) => ({
                currentNode: folder,
                key: folder.id,
                title: folder.name,
                nodeType: NodeType.folder,
                source: OfflineRightMenuClickSourceEnums.folder,
              })),
            ],
          },
          {
            key: `${workflow.id}-${OfflineRightMenuClickSourceEnums.dataDevelopment}`,
            title: i18n.formatMessage({
              id: "bigdata.workflow.dataDevelopment",
            }),
            source: OfflineRightMenuClickSourceEnums.dataDevelopment,
            currentNode: workflow,
            nodeType: NodeType.folder,
            children: nodes
              .filter(
                (node) =>
                  node.workflowId === workflow.id &&
                  node.primary === PrimaryEnums.offline &&
                  node.secondary === SecondaryEnums.dataMining
              )
              .map((node) => ({
                currentNode: node,
                key: node.id,
                title: node.name,
                nodeType: NodeType.node,
                source: OfflineRightMenuClickSourceEnums.node,
              })),
          },
        ],
      },
    ];
  }, [nodes]);

  return (
    <>
      <NodeTreeItem
        handleCloseNodeModal={handleCloseModal}
        currentNode={currentNode}
        source={clickSource}
        onMenuClose={handleCloseRightMenu}
      >
        <CustomTree
          onSelectNode={handleClickNode}
          treeData={treeData}
          onRightClick={handleRightClick}
        />
      </NodeTreeItem>
    </>
  );
};

export default WorkflowLine;
