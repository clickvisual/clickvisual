import useRequest from "@/hooks/useRequest/useRequest";
import dataAnalysisApi, { folderListType } from "@/services/dataAnalysis";
import { DataNode } from "antd/lib/tree";
import { useState } from "react";
import {
  FolderEnums,
  PrimaryEnums,
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";

export interface openNodeDataType {
  lockUid: number;
  content: string;
  desc: string;
  id: number;
  lockAt: number;
  name: string;
  username: string;
}

const useTemporaryQuery = () => {
  const [visibleFolder, setVisibleFolder] = useState<boolean>(false);
  const [visibleNode, setVisibleNode] = useState<boolean>(false);
  const [isUpdateFolder, setIsUpdateFolder] = useState<boolean>(false);
  const [isUpdateNode, setIsUpdateNode] = useState<boolean>(false);
  const [temporaryQueryNodes, setTemporaryQueryNodes] = useState<any[]>([]);
  const [selectNodeKeys, setSelectNodeKeys] = useState<any[]>([]);

  const [fileList, setFileList] = useState<DataNode[]>();
  // 选中包括右键的节点|文件的数据临时存储
  const [currentFolder, setCurrentFolder] = useState<{
    sourceId?: any;
    id: number;
    parentId: number;
    name: string;
    desc: string;
    nodeType: number;
    secondary?: number;
    tertiary?: number;
  }>({ id: 0, parentId: 0, name: "", desc: "", nodeType: 0 });

  const changeVisibleFolder = (flag: boolean) => {
    setVisibleFolder(flag);
    !flag && setIsUpdateFolder(false);
  };

  const changeVisibleNode = (flag: boolean) => {
    setVisibleNode(flag);
  };

  const changeIsUpdateFolder = (flag: boolean) => {
    setIsUpdateFolder(flag);
  };

  const changeIsUpdateNode = (flag: boolean) => {
    setIsUpdateNode(flag);
  };

  const changeCurrentFolder = (data: {
    id: number;
    parentId: number;
    name: string;
    desc: string;
    nodeType: number;
    secondary?: number;
    tertiary?: number;
    sourceId?: number;
  }) => {
    setCurrentFolder(data);
  };

  // Folder
  const doFolderList = useRequest(dataAnalysisApi.getFolderList, {
    loadingText: false,
  });

  const doCreatedFolder = useRequest(dataAnalysisApi.createdFolder, {
    loadingText: false,
  });

  const doDeleteFolder = useRequest(dataAnalysisApi.deleteFolder, {
    loadingText: false,
  });

  const doUpdateFolder = useRequest(dataAnalysisApi.updateFolder, {
    loadingText: false,
  });

  const primaryList = [
    {
      id: 101,
      title: "数据开发",
      enum: PrimaryEnums.mining,
    },
    {
      id: 102,
      title: "临时查询",
      enum: PrimaryEnums.short,
    },
  ];

  const tertiaryList = [
    {
      id: 201,
      title: "ClickHouse",
      enum: TertiaryEnums.clickhouse,
    },
    {
      id: 202,
      title: "MySQL",
      enum: TertiaryEnums.mysql,
    },
    {
      id: 203,
      title: "离线分析",
      enum: TertiaryEnums.offline,
    },
    {
      id: 204,
      title: "实时分析",
      enum: TertiaryEnums.realtime,
    },
  ];

  const secondaryList = [
    {
      id: 301,
      title: "数据库",
      enum: SecondaryEnums.database,
    },
    {
      id: 302,
      title: "数据集成",
      enum: SecondaryEnums.dataIntegration,
    },
  ];

  // 获取_临时查询模块的_树状文件夹数据
  const getDataList = (iid: number) => {
    // 临时查询secondary对应的只有数据库
    // 临时查询primary对应的临时查询
    iid &&
      doFolderList
        .run({
          iid: iid,
          primary: PrimaryEnums.short,
          secondary: SecondaryEnums.database,
        })
        .then((res: any) => {
          if (res?.code == 0) {
            res.data.name = "临时查询";
            onProcessTreeData(res.data);
          }
        });
  };

  // 处理树状结构
  const onProcessTreeData = (folderList: folderListType[]) => {
    if (folderList && [folderList].length > 0) {
      const generateData = (data: folderListType[] | any) => {
        let arr: any[] = [];
        let nodesArr: any[] = [];
        data.map((item: folderListType) => {
          if (item?.folderId != undefined) {
            nodesArr.push(item);
          }
          let key: string = "";
          key = `${item.workflowId}-${item.id}-${item.name}`;
          const childrens = (item.children || []).concat(item.nodes || []);

          if (childrens.length > 0) {
            if (arr?.length > 0) {
              arr.push({
                key: key,
                title: item.name,
                children: generateData(childrens),
                node: item,
                desc: item.desc,
              });
            } else {
              arr = [
                {
                  key: key,
                  title: item.name,
                  node: item,
                  children: generateData(childrens),
                  desc: item.desc,
                },
              ];
            }
          } else {
            if (arr?.length > 0) {
              arr.push({
                key: key,
                title: item.name,
                children: [],
                node: item,
                desc: item.desc,
              });
            } else {
              arr = [
                {
                  key: key,
                  title: item.name,
                  children: [],
                  node: item,
                  desc: item.desc,
                },
              ];
            }
          }
        });
        setTemporaryQueryNodes(nodesArr);
        return arr;
      };
      setFileList(generateData([folderList]));
    }
  };

  // 拿目录的item存重要数据
  const onItemToImportantInfo = (data: any) => {
    if (!data?.iid) {
      changeCurrentFolder({
        id: parseInt(data?.id),
        parentId: parseInt(data?.parentId ?? data?.folderId),
        name: data.name,
        nodeType: FolderEnums.folder,
        desc: data.desc,
      });
    } else {
      changeCurrentFolder({
        id: parseInt(data?.id),
        parentId: parseInt(data?.parentId ?? data?.folderId),
        name: data.name,
        nodeType: FolderEnums.node,
        secondary: parseInt(data.secondary),
        sourceId: parseInt(data.sourceId),
        tertiary: parseInt(data.tertiary),
        desc: data.desc,
      });
    }
  };

  return {
    fileList,
    getDataList,

    visibleFolder,
    changeVisibleFolder,

    visibleNode,
    changeVisibleNode,

    isUpdateFolder,
    changeIsUpdateFolder,

    isUpdateNode,
    changeIsUpdateNode,

    currentFolder,
    changeCurrentFolder,

    onItemToImportantInfo,

    selectNodeKeys,
    setSelectNodeKeys,

    primaryList,
    tertiaryList,
    secondaryList,
    temporaryQueryNodes,

    doFolderList,
    doCreatedFolder,
    doDeleteFolder,
    doUpdateFolder,
  };
};
export default useTemporaryQuery;
