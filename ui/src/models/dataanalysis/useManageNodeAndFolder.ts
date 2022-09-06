import { useCallback, useEffect, useRef, useState } from "react";
import {
  PrimaryEnums,
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import useRequest from "@/hooks/useRequest/useRequest";
import dataAnalysisApi, { NodeInfo } from "@/services/dataAnalysis";
import { formatMessage } from "@@/plugin-locale/localeExports";

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
  const [selectKeys, setSelectKeys] = useState<string[]>([]);

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

  useEffect(() => {
    !visibleNode && setIsBoardCreateNode(false);
  }, [visibleNode]);

  return {
    visibleNode,
    visibleFolder,
    isEditNode,
    currentNode,
    selectKeys,
    setSelectKeys,
    extra,
    nodes,
    setNodes,
    folders,
    setFolders,
    isBoardCreateNode,

    showNodeModal,
    hideNodeModal,
    showFolderModal,
    hideFolderModal,
    callbackRef,

    setIsEditNode,
    setCurrentNode,
    setExtra,
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
  };
};
export default useManageNodeAndFolder;
