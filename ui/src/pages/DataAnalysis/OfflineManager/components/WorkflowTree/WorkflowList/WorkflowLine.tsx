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
import RightMenu from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/RightMenu";
import lodash from "lodash";

const WorkflowLine = ({ workflow }: { workflow: WorkflowInfo }) => {
  const i18n = useIntl();

  const workflowItem: any = useMemo(
    () => lodash.cloneDeep(workflow),
    [workflow]
  );

  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentNode, setCurrentNode] = useState<any>();
  const [clickSource, setClickSource] =
    useState<OfflineRightMenuClickSourceEnums>(
      OfflineRightMenuClickSourceEnums.workflowHeader
    );

  const {
    getFolders,
    currentInstances,
    setSelectNode,
    setSelectKeys,
    selectKeys,
    createdNode,
  } = useModel("dataAnalysis", (model) => ({
    setSelectNode: model.manageNode.setSelectNode,
    setSelectKeys: model.manageNode.setSelectKeys,
    selectKeys: model.manageNode.selectKeys,
    getFolders: model.manageNode.getFolders,
    createdNode: model.manageNode.doCreatedNode,
    currentInstances: model.currentInstances,
  }));

  useEffect(() => {
    if (!currentInstances || !workflow.id) return;
    getFolders
      .run({
        iid: currentInstances,
        primary: PrimaryEnums.mining,
        workflowId: workflow.id,
      })
      .then((res) => {
        if (res?.code !== 0) return;
        setNodes(res.data.nodes);
        setFolders(res.data.children);
      });

    getFolders
      .run({
        iid: currentInstances,
        primary: PrimaryEnums.mining,
        secondary: SecondaryEnums.board,
        workflowId: workflow.id,
      })
      .then((res) => {
        if (res?.code !== 0) return;
        if (res.data.nodes.length <= 0) {
          createdNode
            .run({
              primary: PrimaryEnums.mining,
              secondary: SecondaryEnums.board,
              iid: currentInstances,
              name: workflow.name,
              desc: workflow.desc,
              workflowId: workflow.id,
            })
            .then((res) => {
              if (res?.code !== 0) return;
              workflowItem.board = res.data;
            });
        } else {
          workflowItem.board = res.data.nodes[0];
        }
      });
  }, [workflow.id]);

  const handleRightClick = ({ node }: any) => {
    setCurrentNode(node.currentNode);
    setClickSource(node.source);
  };

  const handleCloseRightMenu = () => {
    setCurrentNode(undefined);
    setClickSource(OfflineRightMenuClickSourceEnums.workflowHeader);
  };

  const handleClickNode = (node: any) => {
    const { currentNode, nodeType } = node;
    setSelectKeys([node.key]);
    if (nodeType === NodeType.node) {
      setSelectNode(currentNode);
    }
  };

  const handleCloseModal = useCallback(() => {
    if (!currentInstances) return;
    getFolders
      .run({
        iid: currentInstances,
        primary: PrimaryEnums.mining,
        workflowId: workflow.id,
      })
      .then((res) => {
        if (res?.code !== 0) return;
        setNodes(res.data.nodes);
        setFolders(res.data.children);
      });
  }, [currentInstances]);

  const folderTree = (
    folderList: any[],
    nodeList: any[],
    secondary: SecondaryEnums
  ) => {
    const result: any[] =
      folderList
        .filter(
          (folder: any) =>
            folder.primary === PrimaryEnums.mining &&
            folder.secondary === secondary
        )
        .map((folder: any) => ({
          currentNode: { ...folder, workflowId: workflow.id },
          key: `${workflow.id}-${folder.id}-${folder.name}`,
          title: folder.name,
          icon: <TreeNodeTypeIcon type={TreeNodeTypeEnums.closeFolder} />,
          nodeType: NodeType.folder,
          source: OfflineRightMenuClickSourceEnums.folder,
          children: folderTree(
            folder.children || [],
            folder.nodes || [],
            secondary
          ),
        })) || [];

    result.push(
      ...nodeList
        .filter(
          (node: any) =>
            node.workflowId === workflow.id &&
            node.primary === PrimaryEnums.mining &&
            node.secondary === secondary
        )
        .map((node: any) => ({
          currentNode: { ...node, workflowId: workflow.id },
          key: `${workflow.id}-${node.id}-${node.name}`,
          title: node.name,
          icon: (
            <TreeNodeTypeIcon
              type={
                secondary === SecondaryEnums.dataMining
                  ? TreeNodeTypeEnums.sql
                  : TreeNodeTypeEnums.node
              }
            />
          ),
          nodeType: NodeType.node,
          source: OfflineRightMenuClickSourceEnums.node,
        }))
    );
    return result;
  };

  const treeData: any[] = useMemo(() => {
    return [
      {
        key: workflow.id,
        title: workflow.name,
        icon: <TreeNodeTypeIcon type={TreeNodeTypeEnums.workflow} />,
        currentNode: workflowItem,
        source: OfflineRightMenuClickSourceEnums.workflowItem,
        nodeType: NodeType.folder,
        children: [
          {
            key: `${workflow.id}-${OfflineRightMenuClickSourceEnums.dataIntegration}`,
            title: i18n.formatMessage({
              id: "bigdata.workflow.dataIntegration",
            }),
            source: OfflineRightMenuClickSourceEnums.dataIntegration,
            currentNode: {
              ...workflowItem,
              primary: PrimaryEnums.mining,
              secondary: SecondaryEnums.dataIntegration,
            },
            nodeType: NodeType.folder,
            children: folderTree(
              folders,
              nodes,
              SecondaryEnums.dataIntegration
            ),
          },
          {
            key: `${workflow.id}-${OfflineRightMenuClickSourceEnums.dataDevelopment}`,
            title: i18n.formatMessage({
              id: "bigdata.workflow.dataDevelopment",
            }),
            source: OfflineRightMenuClickSourceEnums.dataDevelopment,
            currentNode: {
              ...workflowItem,
              primary: PrimaryEnums.mining,
              secondary: SecondaryEnums.dataMining,
            },
            nodeType: NodeType.folder,
            children: folderTree(folders, nodes, SecondaryEnums.dataMining),
          },
        ],
      },
    ];
  }, [nodes, folders, workflowItem]);

  return (
    <>
      <NodeTreeItem
        menus={
          <RightMenu
            handleCloseNodeModal={handleCloseModal}
            clickSource={clickSource}
            currentNode={currentNode}
          />
        }
        onMenuClose={handleCloseRightMenu}
      >
        <CustomTree
          onSelectNode={handleClickNode}
          treeData={treeData}
          selectKeys={selectKeys}
          onRightClick={handleRightClick}
        />
      </NodeTreeItem>
    </>
  );
};

export default WorkflowLine;
