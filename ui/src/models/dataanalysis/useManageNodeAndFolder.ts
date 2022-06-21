import { useRef, useState } from "react";
import {
  PrimaryEnums,
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import useRequest from "@/hooks/useRequest/useRequest";
import dataAnalysisApi from "@/services/dataAnalysis";

export const PrimaryList = [
  {
    id: PrimaryEnums.offline,
    title: "离线查询",
    enum: PrimaryEnums.offline,
  },
  {
    id: PrimaryEnums.realtime,
    title: "实时查询",
    enum: PrimaryEnums.realtime,
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
    ],
  },
  {
    id: TertiaryEnums.mysql,
    title: "mysql",
    enum: TertiaryEnums.mysql,
    types: [SecondaryEnums.dataMining, SecondaryEnums.all],
  },
  {
    id: TertiaryEnums.offline,
    title: "离线分析",
    enum: TertiaryEnums.offline,
    types: [SecondaryEnums.dataIntegration, SecondaryEnums.all],
  },
  {
    id: TertiaryEnums.realtime,
    title: "实时分析",
    enum: TertiaryEnums.realtime,
    types: [SecondaryEnums.dataIntegration, SecondaryEnums.all],
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

  // 当前选中的 节点
  const [selectNode, setSelectNode] = useState<any>();
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

  const showNodeModal = (callback?: () => void) => {
    callbackRef.current = callback;
    setVisibleNode(true);
  };

  const hideNodeModal = () => {
    setVisibleNode(false);
  };

  const showFolderModal = (callback?: () => void) => {
    callbackRef.current = callback;
    setVisibleFolder(true);
  };

  const hideFolderModal = () => {
    setVisibleFolder(false);
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

    showNodeModal,
    hideNodeModal,
    showFolderModal,
    hideFolderModal,
    callbackRef,

    setIsEditNode,
    setCurrentNode,
    setSelectNode,
    setExtra,

    getFolders,
    doCreatedNode,
    doGetNodeInfo,
    doUpdatedNode,
    doDeletedNode,
    doCreatedFolder,
    doUpdateFolder,
    doDeleteFolder,
  };
};
export default useManageNodeAndFolder;
