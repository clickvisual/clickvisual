import { FileTitleType } from "@/pages/DataAnalysis/components/FileTitle";
import WorkflowSql from "@/pages/DataAnalysis/components/SQLEditor";
import IntegratedConfiguration from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration";
import WorkflowBoard from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard";
import {
  PrimaryEnums,
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import { parseJsonObject } from "@/utils/string";
import { useModel } from "@umijs/max";
import { Empty, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "sql-formatter";
import { useIntl } from "umi";
// import { NodeInfo } from "@/services/dataAnalysis";
import { BoardCreateNodeInfo } from "@/models/dataanalysis/useWorkflowBoard";
import lodash from "lodash";

export interface WorkflowContentType {
  id: number;
  parentId?: number;
  node: any;
  currentPaneActiveKey: string;
}

const WorkflowContent = (props: WorkflowContentType) => {
  const { id, parentId, node, currentPaneActiveKey } = props;

  const i18n = useIntl();
  const [folderContent, setFolderContent] = useState<string>("");
  const [fileData, setFileData] = useState<any>({});

  const { doGetNodeInfo, doUpdateNode, doUnLockNode, doLockNode, manageNode } =
    useModel("dataAnalysis");

  const {
    getFolders,
    doMandatoryGetFileLock,
    doDeletedNode,
    doUpdatedNode,
    setNodes,
    setFolders,
  } = manageNode;

  // 是否修改
  const isUpdateStateFun = () => {
    return folderContent !== fileData?.content;
  };

  // 获取文件信息
  const onGetFolderInfo = (id: number) => {
    id &&
      doGetNodeInfo.run(id).then((res: any) => {
        if (res?.code === 0) {
          setFileData(res.data);
          setFolderContent(res.data.content);
        }
      });
  };

  /**文件夹标题*/

  // 锁定节点
  const handleLockFile = (nodeId: number) => {
    if (fileData?.lockAt == 0 && nodeId) {
      doLockNode.run(nodeId).then((res: any) => {
        if (res.code == 0) {
          onGetFolderInfo(nodeId);
        }
      });
    }
  };

  // 解锁节点
  const handleUnLockFile = (nodeId: number) => {
    if (isUpdateStateFun()) {
      message.warning(
        i18n.formatMessage({ id: "bigdata.models.dataAnalysis.unlockTips" })
      );
      return;
    }
    nodeId &&
      doUnLockNode.run(nodeId).then((res: any) => {
        if (res.code == 0) {
          onGetFolderInfo(nodeId);
        }
      });
  };

  const handleGrabLock = (file: any) => {
    doMandatoryGetFileLock.run(file?.id).then((res: any) => {
      if (res.code != 0) return;
      message.success(
        i18n.formatMessage({
          id: "bigdata.components.FileTitle.grabLockSuccessful",
        })
      );
      onGetFolderInfo(file?.id);
    });
  };

  // 保存编辑后的文件节点
  const handleSaveNode = () => {
    const data: any = {
      name: fileData?.name,
      content: folderContent,
      desc: fileData?.desc,
      folderId: parentId,
    };
    id &&
      doUpdateNode.run(id, data).then((res: any) => {
        if (res.code == 0) {
          message.success(
            i18n.formatMessage({ id: "log.index.manage.message.save.success" })
          );
          onGetFolderInfo(id);
        }
      });
  };

  /**
   * 看板
   */

  const [boardFile, setBoardFile] = useState<any>();
  const [boardEdges, setBoardEdges] = useState<any[]>([]);
  const [boardRef, setBoardRef] = useState<any>({ nodeList: [], edgeList: [] });
  const [boardNodeList, setBoardNodeList] = useState<any[]>([]);
  // const callbackRef = useRef<any>(null);
  const createNodeInfoRef = useRef<any>();
  // const [visibleNode, setVisibleNode] = useState<boolean>(false);
  // 是否是通过看板拖动的方式创建的节点
  // const [isBoardCreateNode, setIsBoardCreateNode] = useState<boolean>(false);
  // const [visibleFolder, setVisibleFolder] = useState<boolean>(false);
  // const [isEditNode, setIsEditNode] = useState<boolean>(false);
  // const [currentNode, setCurrentNode] = useState<any>();

  const doGetBoardFile = async (id: number) => {
    return doGetNodeInfo.run(id).then((res) => {
      if (res?.code !== 0) return;
      setBoardFile(res.data);
      return res;
    });
  };

  const doGetBoardNodes = (board: any, file?: any) => {
    getFolders
      .run({
        iid: board.iid,
        primary: board.primary,
        workflowId: board.workflowId,
      })
      .then((res) => {
        if (res?.code !== 0) return;
        const nodes = res.data.nodes.filter(
          (node) => node.secondary !== SecondaryEnums.board
        );
        const folders = res.data.children;
        const newNodes = getNodeList(folders, nodes);
        const content = parseJsonObject(file?.content);
        const newNodeList: any = [];
        newNodes.forEach((item) => {
          const nodeItem = content?.boardNodeList?.find(
            (nd: any) => nd.id === item.id
          );
          item.position = nodeItem?.position;
          newNodeList.push({
            position: nodeItem?.position,
            id: item.id,
            name: item.name,
            tertiary: item.tertiary,
            primary: item?.primary,
            secondary: item?.secondary,
            workflowId: item?.workflowId,
            sourceId: item?.sourceId,
          });
        });
        const startAndEnd =
          content?.boardNodeList?.filter(
            (item: any) =>
              item.id === TertiaryEnums.start || item.id === TertiaryEnums.end
          ) ?? [];
        if (startAndEnd.length > 0) {
          newNodeList.push(...startAndEnd.map((item: any) => item));
        }
        const newBoard: any = { nodeList: [], edgeList: [] };
        if (!!content && content?.boardEdges) {
          setBoardEdges?.(content.boardEdges);
          newBoard.edgeList = [...content.boardEdges];
        }
        newBoard.nodeList = [...newNodeList];
        setBoardRef(newBoard);
        setBoardNodeList(newNodeList);
      });
  };

  const getNodeList = useCallback((folders: any[], nodes: any[]) => {
    const list = nodes.filter(
      (node) => node.secondary !== SecondaryEnums.board
    );
    if (folders.length <= 0) {
      return list;
    }
    const folderNodes: any[] = folders
      .map((folder) => {
        if (folder.children.length > 0) {
          return getNodeList(folder.children, folder.nodes);
        }
        return folder.nodes;
      })
      .flat();
    return [...list, ...folderNodes];
  }, []);

  const doSetNodesAndFolders = useCallback(
    (params: { iid: number; primary: PrimaryEnums; workflowId: number }) => {
      getFolders.run(params).then((res) => {
        if (res?.code !== 0) return;
        setNodes((nodes) => [
          ...nodes.filter((item) => item.workflowId !== params.workflowId),
          ...res.data.nodes,
        ]);
        setFolders((folders) => [
          ...folders.filter((item) => item.workflowId !== params.workflowId),
          {
            folderList: res.data.children,
            workflowId: params.workflowId,
          },
        ]);
      });
    },
    []
  );

  const deleteNodeById = useCallback(
    (nodeId: number) => {
      const node = boardNodeList.find((item) => item.id === nodeId);
      if (
        node?.tertiary === TertiaryEnums.end ||
        node?.tertiary === TertiaryEnums.start
      ) {
        const temporaryBoardEdges = boardEdges.filter((item: any) => {
          return item.target != nodeId && item.source != nodeId;
        });
        setBoardEdges(temporaryBoardEdges);
        setBoardNodeList((nodeList) => {
          return nodeList.filter((node) => node.id !== nodeId);
        });
        return new Promise<any>((resolve) => resolve(true));
      } else {
        return doDeletedNode.run(nodeId).then((res) => {
          if (res?.code !== 0) return;
          const temporaryBoardEdges = boardEdges.filter((item: any) => {
            return item.target != nodeId && item.source != nodeId;
          });
          setBoardEdges(temporaryBoardEdges);
          setBoardNodeList((node) => node.filter((item) => item.id !== nodeId));
        });
      }
    },
    [boardNodeList]
  );

  const createBoardNode = (node: any) => {
    setBoardNodeList((boardNodeList) => {
      return [...boardNodeList, node];
    });
  };

  const onSaveBoardNodes = useCallback(
    (currentBoard: any) => {
      if (
        boardNodeList.filter((item) => item.tertiary === TertiaryEnums.end)
          .length !== 1 ||
        boardNodeList.filter((item) => item.tertiary === TertiaryEnums.start)
          .length !== 1
      ) {
        message.warning(
          i18n.formatMessage({
            id: "bigdata.models.dataAnalysis.useManageNodeAndFolder.saveBoardNodesTips",
          })
        );
        return;
      }
      setBoardRef({ nodeList: boardNodeList, edgeList: boardEdges });
      doUpdatedNode.run(currentBoard.id, {
        ...currentBoard,
        content: JSON.stringify({ boardNodeList, boardEdges }),
      });
    },
    [boardNodeList, boardEdges]
  );

  const isChangeBoard = useMemo(() => {
    return (
      !lodash.isEqual(boardNodeList, boardRef.nodeList) ||
      !lodash.isEqual(boardEdges, boardRef.edgeList)
    );
  }, [boardNodeList, boardEdges, boardRef]);

  const onChangeBoardNodes = (nodes: any[]) => {
    setBoardNodeList(nodes);
    setBoardRef((boardRef: any) => ({
      nodeList: nodes,
      edgeList: boardRef.boardEdges,
    }));
  };
  const updateBoardNode = (node: any) => {
    setBoardNodeList((boardNodeList) =>
      boardNodeList.map((item) => {
        if (item.id === node.id) {
          return node;
        }
        return item;
      })
    );
  };

  const connectEdge = (edge: any) => {
    setBoardEdges((boardEdges) => {
      // 禁止同一对node之间连接两次=>会出现新的bug 甚至包括绘图组件内部也会出问题 特别是连接两次的时候删一根线 组件直接懵了
      const newBoardEdges = boardEdges.filter((item: any) => {
        return item.id != `edge-${edge.source}-${edge.target}`;
      });
      return [
        ...newBoardEdges,
        { id: `edge-${edge.source}-${edge.target}`, ...edge },
      ];
    });
  };

  const deleteEdges = (edgeList: any[]) => {
    setBoardEdges((boardEdges) => [
      ...boardEdges.filter(
        (edge) => edgeList.findIndex((item) => item.id === edge.id) < 0
      ),
    ]);
  };

  const changeEdges = (edges: any[]) => {
    setBoardEdges(edges);
  };

  useEffect(() => {
    if (node?.secondary == SecondaryEnums.dataMining) {
      onGetFolderInfo(id);
    }
  }, []);

  const showCreateNode = (
    board: any,
    nodeInfo: BoardCreateNodeInfo,
    onChangeExtra: (params: any) => void,
    showNodeModal: (callback?: (params?: any) => void) => void,
    onOk: (params: any, nodeInfo: any) => void
  ) => {
    createNodeInfoRef.current = nodeInfo;
    onChangeExtra({
      iid: board.iid,
      primary: board.primary,
      secondary: nodeInfo.secondary,
      workflowId: board.workflowId,
      tertiary: nodeInfo.tertiary,
      folderId: board.folderId,
    });
    showNodeModal((data) => {
      createNodeInfoRef.current = { ...nodeInfo, node: data };
      onOk(data, nodeInfo);
    });
  };

  // const showNodeModal = (callback?: (params?: any) => void) => {
  //   callbackRef.current = callback;
  //   setVisibleNode(true);
  // };

  // const hideNodeModal = () => {
  //   setVisibleNode(false);
  //   setIsEditNode(false);
  // };

  // const showFolderModal = (callback?: () => void) => {
  //   callbackRef.current = callback;
  //   setVisibleFolder(true);
  // };

  // const hideFolderModal = () => {
  //   setVisibleFolder(false);
  //   setIsEditNode(false);
  // };

  // useEffect(() => {
  //   !visibleNode && setIsBoardCreateNode(false);
  // }, [visibleNode]);

  const Content = useMemo(() => {
    switch (node?.secondary) {
      case SecondaryEnums.dataIntegration:
        return (
          <IntegratedConfiguration
            currentNode={node}
            currentPaneActiveKey={currentPaneActiveKey}
          />
        );
      case SecondaryEnums.dataMining:
        return (
          <WorkflowSql
            isChange={isUpdateStateFun()}
            file={fileData}
            onSave={() => handleSaveNode()}
            onLock={() => handleLockFile(id as number)}
            onUnlock={() => handleUnLockFile(id as number)}
            type={FileTitleType.sql}
            onFormat={() => setFolderContent(format(folderContent))}
            onGrabLock={handleGrabLock}
            folderContent={folderContent}
            setFolderContent={setFolderContent}
            node={node}
            currentPaneActiveKey={currentPaneActiveKey}
          />
        );
      case SecondaryEnums.board:
        return (
          <WorkflowBoard
            currentBoard={node}
            currentPaneActiveKey={currentPaneActiveKey}
            boardFile={boardFile}
            doGetFile={doGetBoardFile}
            doGetNodes={doGetBoardNodes}
            doSetNodesAndFolders={doSetNodesAndFolders}
            deleteNodeById={deleteNodeById}
            createBoardNode={createBoardNode}
            isChangeBoard={isChangeBoard}
            setBoardEdges={setBoardEdges}
            onSaveBoardNodes={onSaveBoardNodes}
            boardNodeList={boardNodeList}
            onChangeBoardNodes={onChangeBoardNodes}
            updateBoardNode={updateBoardNode}
            connectEdge={connectEdge}
            deleteEdges={deleteEdges}
            changeEdges={changeEdges}
            boardEdges={boardEdges}
            showCreateNode={showCreateNode}
            // showNodeModal={showNodeModal}
            // hideNodeModal={hideNodeModal}
            // showFolderModal={showFolderModal}
            // hideFolderModal={hideFolderModal}
            // setIsBoardCreateNode={setIsBoardCreateNode}
            // setIsEditNode={setIsEditNode}
            // setCurrentNode={setCurrentNode}
            // isBoardCreateNode={isBoardCreateNode}
            // visibleFolder={visibleFolder}
            // isEditNode={isEditNode}
            // currentNode={currentNode}
          />
        );
      default:
        return (
          <Empty
            style={{ width: "100%", height: "100%" }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        );
    }
  }, [
    node,
    fileData,
    isUpdateStateFun(),
    folderContent,
    currentPaneActiveKey,
    boardFile,
    isChangeBoard,
    boardNodeList,
    boardEdges,
    // currentNode,
    // isEditNode,
    // visibleFolder,
    // isBoardCreateNode,
  ]);
  return <>{Content}</>;
};

export default WorkflowContent;
