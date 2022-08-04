import { WorkflowInfo } from "@/services/bigDataWorkflow";
import { useIntl } from "umi";
import {
  OfflineRightMenuClickSourceEnums,
  PrimaryEnums,
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import TreeNodeTypeIcon, {
  TreeNodeTypeEnums,
} from "@/components/TreeNodeTypeIcon";
import NodeTreeItem from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/NodeTreeItem";
import CustomTree, { NodeType } from "@/components/CustomTree";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import RightMenu from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/RightMenu";
import lodash, { cloneDeep } from "lodash";

const folderTree = (
  workflow: any,
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
          workflow,
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
      .map((node: any) => {
        const type = () => {
          switch (node.tertiary) {
            case TertiaryEnums.realtime:
              return TreeNodeTypeEnums.realtime;
            case TertiaryEnums.offline:
              return TreeNodeTypeEnums.offline;
            case TertiaryEnums.mysql:
              return TreeNodeTypeEnums.mysql;
            case TertiaryEnums.clickhouse:
              return TreeNodeTypeEnums.clickhouse;
            default:
              return null;
          }
        };
        return {
          currentNode: { ...node, workflowId: workflow.id },
          key: `${workflow.id}-${node.id}-${node.name}`,
          title: node.name,
          icon: <TreeNodeTypeIcon type={type()} />,
          nodeType: NodeType.node,
          source: OfflineRightMenuClickSourceEnums.node,
        };
      })
  );
  return result;
};

const WorkflowLine = ({ workflow }: { workflow: WorkflowInfo }) => {
  const i18n = useIntl();

  const workflowItem: any = useMemo(
    () => lodash.cloneDeep(workflow),
    [workflow]
  );

  const [treeData, setTreeData] = useState<any[]>([]);
  const [currentNode, setCurrentNode] = useState<any>();
  const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<any[]>([]);
  const [clickSource, setClickSource] =
    useState<OfflineRightMenuClickSourceEnums>(
      OfflineRightMenuClickSourceEnums.workflowHeader
    );

  const {
    nodes,
    folders,
    getFolders,
    currentInstances,
    setSelectNode,
    setSelectKeys,
    selectKeys,
    createdNode,
    boardNodeList,
    updateBoardNode,
    createBoardNode,
    doSetNodesAndFolders,
    onGetFolderInfo,

    cancelTokenTargetListRef,
    cancelTokenSourceListRef,
    cancelTokenTargetRef,
    cancelTokenSourceRef,
    cancelTokenTargetTableRef,
    cancelTokenSourceTableRef,
    cancelTokenTargetColumnsRef,
    cancelTokenSourceColumnsRef,
    setSourceColumns,
    setTargetColumns,

    offlinePaneList,
    onChangeOfflinePaneList,
    onChangeCurrentOfflinePaneActiveKey,
    changeOpenNodeId,
  } = useModel("dataAnalysis", (model) => ({
    setSelectNode: model.manageNode.setSelectNode,
    setSelectKeys: model.manageNode.setSelectKeys,
    selectKeys: model.manageNode.selectKeys,
    getFolders: model.manageNode.getFolders,
    createdNode: model.manageNode.doCreatedNode,
    currentInstances: model.currentInstances,
    nodes: model.manageNode.nodes,
    folders: model.manageNode.folders,
    boardNodeList: model.manageNode.boardNodeList,
    updateBoardNode: model.manageNode.updateBoardNode,
    createBoardNode: model.manageNode.createBoardNode,
    doSetNodesAndFolders: model.manageNode.doSetNodesAndFolders,
    onGetFolderInfo: model.onGetFolderInfo,

    cancelTokenTargetListRef: model.dataSourceManage.cancelTokenTargetListRef,
    cancelTokenSourceListRef: model.dataSourceManage.cancelTokenSourceListRef,
    cancelTokenTargetRef: model.integratedConfigs.cancelTokenTargetRef,
    cancelTokenSourceRef: model.integratedConfigs.cancelTokenSourceRef,
    cancelTokenTargetTableRef:
      model.integratedConfigs.cancelTokenTargetTableRef,
    cancelTokenSourceTableRef:
      model.integratedConfigs.cancelTokenSourceTableRef,
    cancelTokenTargetColumnsRef:
      model.integratedConfigs.cancelTokenTargetColumnsRef,
    cancelTokenSourceColumnsRef:
      model.integratedConfigs.cancelTokenSourceColumnsRef,
    setSourceColumns: model.integratedConfigs.setSourceColumns,
    setTargetColumns: model.integratedConfigs.setTargetColumns,
    offlinePaneList: model.filePane.offlinePaneList,
    onChangeOfflinePaneList: model.filePane.onChangeOfflinePaneList,
    onChangeCurrentOfflinePaneActiveKey:
      model.filePane.onChangeCurrentOfflinePaneActiveKey,
    changeOpenNodeId: model.changeOpenNodeId,
  }));

  const handleRightClick = ({ node }: any) => {
    setCurrentNode(node.currentNode);
    setClickSource(node.source);
  };

  const handleCloseRightMenu = () => {
    setCurrentNode(undefined);
    setClickSource(OfflineRightMenuClickSourceEnums.workflowHeader);
  };

  const handleClickNode = (node: any) => {
    cancelTokenSourceColumnsRef.current?.();
    cancelTokenTargetColumnsRef.current?.();
    cancelTokenSourceTableRef.current?.();
    cancelTokenTargetTableRef.current?.();
    cancelTokenSourceRef.current?.();
    cancelTokenTargetRef.current?.();
    cancelTokenSourceListRef.current?.();
    cancelTokenSourceRef.current?.();
    cancelTokenTargetListRef.current?.();
    cancelTokenTargetRef.current?.();
    setSourceColumns([]);
    setTargetColumns([]);

    const { currentNode, nodeType } = node;
    setSelectKeys([node.key]);
    if (nodeType === NodeType.node) {
      const id = parseInt(node?.currentNode?.id);
      const folderId = parseInt(node?.currentNode?.folderId);
      const clonePaneList = cloneDeep(offlinePaneList);
      if (clonePaneList.filter((item: any) => item.key == id).length == 0) {
        onChangeOfflinePaneList([
          ...clonePaneList,
          {
            key: id.toString(),
            title: node?.currentNode?.name || "not name",
            parentId: folderId,
            node: node?.currentNode,
          },
        ]);
        onGetFolderInfo(id);
      }
      onChangeCurrentOfflinePaneActiveKey(`${id}`);
      changeOpenNodeId(id);

      setSelectNode(currentNode);
      currentNode.secondary == SecondaryEnums.dataMining &&
        onGetFolderInfo(currentNode.id);
    } else if (nodeType === NodeType.board) {
      setSelectNode(currentNode.board);
    }
  };

  const handleCloseModal = useCallback(
    (params?: any) => {
      if (!currentInstances) return;
      if (params) {
        const isUpdate =
          boardNodeList.findIndex((item) => item.id === params.id) > -1;
        isUpdate ? updateBoardNode(params) : createBoardNode(params);
      }
      doSetNodesAndFolders({
        iid: currentInstances,
        primary: PrimaryEnums.mining,
        workflowId: workflow.id,
      });
    },
    [currentInstances]
  );

  useEffect(() => {
    if (!currentInstances || !workflow.id) return;
    doSetNodesAndFolders({
      iid: currentInstances,
      primary: PrimaryEnums.mining,
      workflowId: workflow.id,
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
  }, [workflow, workflow?.id]);

  useMemo(() => {
    const folderList =
      folders.find((item) => item.workflowId === workflowItem.id)?.folderList ||
      [];
    const nodeTree = [
      {
        key: workflow.id,
        title: workflow.name,
        icon: <TreeNodeTypeIcon type={TreeNodeTypeEnums.workflow} />,
        currentNode: workflowItem,
        source: OfflineRightMenuClickSourceEnums.workflowItem,
        nodeType: NodeType.folder,
        children: [
          {
            key: `${workflow.id}-${workflowItem.board?.id}-${workflowItem.board?.name}`,
            title: i18n.formatMessage({
              id: "bigdata.workflow.board",
            }),
            currentNode: {
              ...workflowItem,
              primary: PrimaryEnums.mining,
              secondary: SecondaryEnums.dataIntegration,
            },
            source: OfflineRightMenuClickSourceEnums.board,
            nodeType: NodeType.board,
          },
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
              workflowItem,
              folderList,
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
            children: folderTree(
              workflowItem,
              folders,
              nodes,
              SecondaryEnums.dataMining
            ),
          },
        ],
      },
    ];

    const handleAutoExpandParent = (arr: any[]) => {
      let expandKey: any[] = [];
      arr.map((item: any) => {
        if (item.nodeType == NodeType.folder) {
          expandKey.push(item.key);
        }
        if (item?.children?.length > 0) {
          expandKey = [...expandKey, ...handleAutoExpandParent(item.children)];
        }
      });
      return expandKey;
    };
    setDefaultExpandedKeys(handleAutoExpandParent(nodeTree));
    setTreeData(nodeTree);
  }, [nodes, folders, workflowItem, workflowItem?.board]);

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
          defaultExpandedKeys={defaultExpandedKeys}
          onRightClick={handleRightClick}
        />
      </NodeTreeItem>
    </>
  );
};

export default WorkflowLine;
