import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PrimaryEnums,
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import useRequest from "@/hooks/useRequest/useRequest";
import dataAnalysisApi, { NodeInfo } from "@/services/dataAnalysis";
import { parseJsonObject } from "@/utils/string";
import { formatMessage } from "@@/plugin-locale/localeExports";
import lodash from "lodash";
import { message } from "antd";

export const PrimaryList = [
  {
    id: PrimaryEnums.mining,
    title: "数据开发",
    enum: PrimaryEnums.mining,
  },

  {
    id: PrimaryEnums.short,
    title: "临时查询",
    enum: PrimaryEnums.short,
  },
];

export const SecondaryList = [
  {
    id: SecondaryEnums.all,
    title: "全部",
    enum: SecondaryEnums.all,
  },
  {
    id: SecondaryEnums.database,
    title: "数据库",
    enum: SecondaryEnums.database,
  },
  {
    id: SecondaryEnums.dataIntegration,
    title: "数据集成",
    enum: SecondaryEnums.dataIntegration,
  },
  {
    id: SecondaryEnums.dataMining,
    title: "数据开发",
    enum: SecondaryEnums.dataMining,
  },
];

export enum NodeBoardIdEnums {
  start = -1,
  end = -2,
}

export const TertiaryList = [
  {
    id: TertiaryEnums.clickhouse,
    title: "ClickHouse",
    enum: TertiaryEnums.clickhouse,
    types: [
      SecondaryEnums.database,
      SecondaryEnums.dataMining,
      SecondaryEnums.all,
      SecondaryEnums.board,
    ],
  },
  {
    id: TertiaryEnums.mysql,
    title: "MySQL",
    enum: TertiaryEnums.mysql,
    types: [
      SecondaryEnums.dataMining,
      SecondaryEnums.all,
      SecondaryEnums.board,
    ],
  },
  {
    id: TertiaryEnums.start,
    title: "输入节点",
    enum: TertiaryEnums.start,
    types: [SecondaryEnums.universal, SecondaryEnums.all, SecondaryEnums.board],
  },
  {
    id: TertiaryEnums.end,
    title: "输出节点",
    enum: TertiaryEnums.end,
    types: [SecondaryEnums.universal, SecondaryEnums.all, SecondaryEnums.board],
  },
  {
    id: TertiaryEnums.realtime,
    title: "实时同步",
    enum: TertiaryEnums.realtime,
    types: [
      SecondaryEnums.dataIntegration,
      SecondaryEnums.all,
      SecondaryEnums.board,
    ],
  },
  {
    id: TertiaryEnums.offline,
    title: "离线同步",
    enum: TertiaryEnums.offline,
    types: [
      SecondaryEnums.dataIntegration,
      SecondaryEnums.all,
      SecondaryEnums.board,
    ],
  },
];

const useManageNodeAndFolder = () => {
  const [visibleNode, setVisibleNode] = useState<boolean>(false);
  // 是否是通过看板拖动的方式创建的节点
  const [isBoardCreateNode, setIsBoardCreateNode] = useState<boolean>(false);
  const [visibleFolder, setVisibleFolder] = useState<boolean>(false);
  const [isEditNode, setIsEditNode] = useState<boolean>(false);
  // 当前需要修改的节点
  const [currentNode, setCurrentNode] = useState<any>();
  const [extra, setExtra] = useState<any>();
  const callbackRef = useRef<any>(null);

  // 节点树节点和文件夹
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  // 当前选中的 节点
  const [selectNode, setSelectNode] = useState<any>();
  const [selectKeys, setSelectKeys] = useState<string[]>([]);

  const [boardFile, setBoardFile] = useState<any>();
  const [boardNodeList, setBoardNodeList] = useState<any[]>([]);
  const [boardEdges, setBoardEdges] = useState<any[]>([]);
  const [boardRef, setBoardRef] = useState<any>({ nodeList: [], edgeList: [] });

  // Folder
  const getFolders = useRequest(dataAnalysisApi.getFolderList, {
    loadingText: false,
  });

  const doCreatedFolder = useRequest(dataAnalysisApi.createdFolder, {
    loadingText: false,
  });

  const doUpdateFolder = useRequest(dataAnalysisApi.updateFolder, {
    loadingText: false,
  });

  const doDeleteFolder = useRequest(dataAnalysisApi.deleteFolder, {
    loadingText: false,
  });

  const doCreatedNode = useRequest(dataAnalysisApi.createdNode, {
    loadingText: false,
  });

  const doGetNodeInfo = useRequest(dataAnalysisApi.getNodeInfo, {
    loadingText: false,
  });

  const doUpdatedNode = useRequest(dataAnalysisApi.updateNode, {
    loadingText: false,
  });

  const doDeletedNode = useRequest(dataAnalysisApi.deleteNode, {
    loadingText: false,
  });

  const doLockNode = useRequest(dataAnalysisApi.lockNode, {
    loadingText: false,
  });

  const doUnLockNode = useRequest(dataAnalysisApi.unLockNode, {
    loadingText: false,
  });

  const doRunCodeNode = useRequest(dataAnalysisApi.runCodeNode, {
    loadingText: {
      loading: formatMessage({
        id: "bigdata.models.dataAnalysis.runLoadingText",
      }),
      done: formatMessage({
        id: "bigdata.models.dataAnalysis.runLoadingDoneText",
      }),
    },
  });

  const doMandatoryGetFileLock = useRequest(
    dataAnalysisApi.mandatoryGetFileLock,
    {
      loadingText: false,
    }
  );

  const doStopCodeNode = useRequest(dataAnalysisApi.stopCodeNode, {
    loadingText: {
      loading: formatMessage({
        id: "bigdata.models.dataAnalysis.useManageNodeAndFolder.stopping",
      }),
      done: formatMessage({
        id: "bigdata.models.dataAnalysis.useManageNodeAndFolder.stopSuccess",
      }),
    },
  });

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

  const showNodeModal = (callback?: (params?: any) => void) => {
    callbackRef.current = callback;
    setVisibleNode(true);
  };

  const hideNodeModal = () => {
    setVisibleNode(false);
    setIsEditNode(false);
  };

  const showFolderModal = (callback?: () => void) => {
    callbackRef.current = callback;
    setVisibleFolder(true);
  };

  const hideFolderModal = () => {
    setVisibleFolder(false);
    setIsEditNode(false);
  };

  const doGetBoardFile = async (id: number) => {
    return doGetNodeInfo.run(id).then((res) => {
      if (res?.code !== 0) return;
      setBoardFile(res.data);
      return res;
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
          changeEdges?.(content.boardEdges);
          newBoard.edgeList = [...content.boardEdges];
        }
        newBoard.nodeList = [...newNodeList];
        setBoardRef(newBoard);
        setBoardNodeList(newNodeList);
      });
  };

  const isChangeBoard = useMemo(() => {
    return (
      !lodash.isEqual(boardNodeList, boardRef.nodeList) ||
      !lodash.isEqual(boardEdges, boardRef.edgeList)
    );
  }, [boardNodeList, boardEdges, boardRef]);

  const deleteNodeById = useCallback(
    (nodeId: number) => {
      const node = boardNodeList.find((item) => item.id === nodeId);

      console.log("node: ", node, boardNodeList);
      if (
        node?.tertiary === TertiaryEnums.end ||
        node?.tertiary === TertiaryEnums.start
      ) {
        const temporaryBoardEdges = boardEdges.filter((item: any) => {
          return item.target != nodeId && item.source != nodeId;
        });
        setBoardEdges(temporaryBoardEdges);
        setBoardNodeList((nodeList) => {
          console.log(nodeList.filter((node) => node.id !== nodeId));
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

  const onSaveBoardNodes = useCallback(
    (currentBoard: any) => {
      if (
        boardNodeList.filter((item) => item.tertiary === TertiaryEnums.end)
          .length !== 1 ||
        boardNodeList.filter((item) => item.tertiary === TertiaryEnums.start)
          .length !== 1
      ) {
        message.warning(
          formatMessage({
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

  useEffect(() => {
    !visibleNode && setIsBoardCreateNode(false);
  }, [visibleNode]);

  return {
    visibleNode,
    visibleFolder,
    isEditNode,
    currentNode,
    selectNode,
    selectKeys,
    setSelectKeys,
    extra,
    nodes,
    folders,
    isBoardCreateNode,

    showNodeModal,
    hideNodeModal,
    showFolderModal,
    hideFolderModal,
    callbackRef,

    setIsEditNode,
    setCurrentNode,
    setSelectNode,
    setExtra,
    setBoardEdges,
    setIsBoardCreateNode,

    doLockNode,
    doUnLockNode,
    doRunCodeNode,
    doStopCodeNode,
    doCreatedNode,
    doGetNodeInfo,
    doUpdatedNode,
    doDeletedNode,
    doSetNodesAndFolders,
    doMandatoryGetFileLock,

    getFolders,
    doCreatedFolder,
    doUpdateFolder,
    doDeleteFolder,

    boardFile,
    boardNodeList,
    boardEdges,
    connectEdge,
    changeEdges,
    onSaveBoardNodes,
    isChangeBoard,
    createBoardNode,
    updateBoardNode,
    doGetBoardFile,
    doGetBoardNodes,
    deleteNodeById,
    deleteEdges,
    onChangeBoardNodes,
  };
};
export default useManageNodeAndFolder;
