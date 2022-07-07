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

  const [fileList, setFileList] = useState<DataNode[]>();
  // 选中包括右键的节点|文件的数据临时存储
  const [currentFolder, setCurrentFolder] = useState<{
    id: number;
    parentId: number;
    name: string;
    desc?: string;
    nodeType: number;
    secondary?: number;
    tertiary?: number;
  }>({ id: 0, parentId: 0, name: "", nodeType: 0 });

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
    desc?: string;
    nodeType: number;
    secondary?: number;
    tertiary?: number;
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
          if (item?.folderId) {
            nodesArr.push(item);
          }
          console.log(item, "item");

          //key = 父级id_此id_此名称_此详情_是否可打开的节点_secondary_tertiary 构成
          let key: string = "";
          if (item.folderId == 0 || !!item.folderId) {
            key = `${item.parentId ?? item.folderId}!@#@!${item.id}!@#@!${
              item.name
            }!@#@!${item.desc}!@#@!true!@#@!${item.secondary}!@#@!${
              item.tertiary
            }`;
            // key = `${item.workflowId}-${item.id}-${item.name}`;
          } else {
            key = `${item.parentId ?? item.folderId}!@#@!${item.id}!@#@!${
              item.name
            }!@#@!${item.desc}!@#@!false`;
          }
          const childrens = (item.children || []).concat(item.nodes || []);

          if (childrens.length > 0) {
            if (arr?.length > 0) {
              arr.push({
                key: key,
                title: item.name,
                children: generateData(childrens),
                node: item,
              });
            } else {
              arr = [
                {
                  key: key,
                  title: item.name,
                  node: item,
                  children: generateData(childrens),
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
              });
            } else {
              arr = [
                {
                  key: key,
                  title: item.name,
                  children: [],
                  node: item,
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

  // 拿目录的key存重要数据
  const onKeyToImportantInfo = (str: string) => {
    const dataList = str.split("!@#@!");
    if (dataList[4] != "true") {
      changeCurrentFolder({
        id: parseInt(dataList[1]),
        parentId: parseInt(dataList[0]),
        name: dataList[2],
        desc: dataList[3],
        nodeType: dataList[4] == "true" ? FolderEnums.node : FolderEnums.folder,
      });
    } else {
      changeCurrentFolder({
        id: parseInt(dataList[1]),
        parentId: parseInt(dataList[0]),
        name: dataList[2],
        desc: dataList[3],
        nodeType: dataList[4] == "true" ? FolderEnums.node : FolderEnums.folder,
        secondary: parseInt(dataList[5]),
        tertiary: parseInt(dataList[6]),
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

    onKeyToImportantInfo,

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
