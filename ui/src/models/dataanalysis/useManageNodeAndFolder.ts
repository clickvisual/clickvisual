import { useCallback, useRef, useState } from "react";
import {
  PrimaryEnums,
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import useRequest from "@/hooks/useRequest/useRequest";
import dataAnalysisApi, { NodeInfo } from "@/services/dataAnalysis";
import { parseJsonObject } from "@/utils/string";

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

export const TertiaryList = [
  {
    id: TertiaryEnums.clickhouse,
    title: "clickhouse",
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
    title: "mysql",
    enum: TertiaryEnums.mysql,
    types: [
      SecondaryEnums.dataMining,
      SecondaryEnums.all,
      SecondaryEnums.board,
    ],
  },
  // {
  //   id: TertiaryEnums.offline,
  //   title: "离线分析",
  //   enum: TertiaryEnums.offline,
  //   types: [
  //     SecondaryEnums.dataIntegration,
  //     SecondaryEnums.all,
  //     SecondaryEnums.board,
  //   ],
  // },
  {
    id: TertiaryEnums.input,
    title: "输入节点",
    enum: TertiaryEnums.input,
    types: [SecondaryEnums.universal, SecondaryEnums.all, SecondaryEnums.board],
  },
  {
    id: TertiaryEnums.output,
    title: "输出节点",
    enum: TertiaryEnums.output,
    types: [SecondaryEnums.universal, SecondaryEnums.all, SecondaryEnums.board],
  },
  {
    id: TertiaryEnums.realtime,
    title: "实时分析",
    enum: TertiaryEnums.realtime,
    types: [
      SecondaryEnums.dataIntegration,
      SecondaryEnums.all,
      SecondaryEnums.board,
    ],
  },
];

const useManageNodeAndFolder = () => {
  const [visibleNode, setVisibleNode] = useState<boolean>(false);
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
      loading: "运行中",
      done: "运行成功",
    },
  });

  const doStopCodeNode = useRequest(dataAnalysisApi.stopCodeNode, {
    loadingText: {
      loading: "停止中",
      done: "停止成功",
    },
  });

  const doSetNodesAndFolders = useCallback(
    (params: { iid: number; primary: PrimaryEnums; workflowId: number }) => {
      getFolders.run(params).then((res) => {
        if (res?.code !== 0) return;
        setNodes(res.data.nodes);
        setFolders(res.data.children);
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
        if (!!content && content?.boardNodeList) {
          newNodes.forEach((item) => {
            const nodeItem = content?.boardNodeList?.find(
              (nd: any) => nd.id === item.id
            );
            item.position = nodeItem?.position;
          });
        }
        setBoardNodeList(newNodes);
      });
  };

  const deleteNodeById = async (nodeId: number) => {
    await doDeletedNode.run(nodeId);
    setBoardNodeList((node) => node.filter((item) => item.id != nodeId));
  };

  const deleteNodes = async (nodeIDs: number[]) =>
    Promise.all(nodeIDs.map((nodeId) => deleteNodeById(nodeId)));

  const createBoardNode = (node: any) => {
    setBoardNodeList((boardNodeList) => [...boardNodeList, node]);
  };

  const onChangeBoardNodes = (nodes: any[]) => {
    setBoardNodeList(nodes);
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

    showNodeModal,
    hideNodeModal,
    showFolderModal,
    hideFolderModal,
    callbackRef,

    setIsEditNode,
    setCurrentNode,
    setSelectNode,
    setExtra,

    doLockNode,
    doUnLockNode,
    doRunCodeNode,
    doStopCodeNode,
    doCreatedNode,
    doGetNodeInfo,
    doUpdatedNode,
    doDeletedNode,
    doSetNodesAndFolders,

    getFolders,
    doCreatedFolder,
    doUpdateFolder,
    doDeleteFolder,

    boardFile,
    boardNodeList,
    createBoardNode,
    updateBoardNode,
    doGetBoardFile,
    doGetBoardNodes,
    deleteNodes,
    onChangeBoardNodes,
  };
};
export default useManageNodeAndFolder;
