import useRequest from "@/hooks/useRequest/useRequest";
import dataAnalysis, {
  folderListType,
  nodeListType,
} from "@/services/dataAnalysis";
import { DataNode } from "antd/lib/tree";
import { useState } from "react";
import { folderType } from "@/pages/DataAnalysis/service/enums";

const useTemporaryQuery = () => {
  const [visibleFolder, setVisibleFolder] = useState<boolean>(false);
  const [visibleNode, setVisibleNode] = useState<boolean>(false);
  const [isUpdateFolder, setIsUpdateFolder] = useState<boolean>(false);
  const [isUpdateNode, setIsUpdateNode] = useState<boolean>(false);
  const [currentFolder, setCurrentFolderId] = useState<{
    id: number;
    parentId: number;
    name: string;
    desc?: string;
    nodeType: number;
  }>({ id: 0, parentId: 0, name: "", nodeType: 0 });

  const [fileList, setFileList] = useState<DataNode[]>();

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
  }) => {
    setCurrentFolderId(data);
  };

  // Folder
  const doFolderList = useRequest(dataAnalysis.getFolderList, {
    loadingText: false,
  });

  const doCreatedFolder = useRequest(dataAnalysis.createdFolder, {
    loadingText: false,
  });

  const doDeleteFolder = useRequest(dataAnalysis.deleteFolder, {
    loadingText: false,
  });

  const doUpdateFolder = useRequest(dataAnalysis.updateFolder, {
    loadingText: false,
  });

  // Node
  const doCreatedNode = useRequest(dataAnalysis.createdNode, {
    loadingText: false,
  });

  const doUpdateNode = useRequest(dataAnalysis.updateNode, {
    loadingText: false,
  });

  const doGetNodeInfo = useRequest(dataAnalysis.getNodeInfo, {
    loadingText: false,
  });

  const doDeleteNode = useRequest(dataAnalysis.deleteNode, {
    loadingText: false,
  });

  const doLockNode = useRequest(dataAnalysis.lockNode, {
    loadingText: false,
  });

  const doUnLockNode = useRequest(dataAnalysis.unLockNode, {
    loadingText: false,
  });

  const getDataList = (iid: number) => {
    const primary = 3;
    iid &&
      doFolderList
        .run({
          iid: iid,
          primary: primary,
        })
        .then((res: any) => {
          if (res?.code == 0) {
            onProcessTreeData(res.data);
          }
        });
  };

  const onProcessTreeData = (folderList: folderListType[] | nodeListType[]) => {
    if (folderList && [folderList].length > 0) {
      const generateData = (data: folderListType[] | any) => {
        let arr: DataNode[] = [];
        data.map((item: folderListType, index: number) => {
          const key = `${item.parentId ?? item.folderId}_${item.id}_${
            item.name
          }_${item.desc}_${item.folderId == 0 || !!item.folderId}`;
          const childrens = (item.children || []).concat(item.nodes || []);

          if (childrens.length > 0) {
            if (arr?.length > 0) {
              arr.push({
                key: key,
                title: item.name,
                children: generateData(childrens),
              });
            } else {
              arr = [
                {
                  key: key,
                  title: item.name,
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
              });
            } else {
              arr = [
                {
                  key: key,
                  title: item.name,
                  children: [],
                },
              ];
            }
          }
        });
        return arr;
      };
      setFileList(generateData([folderList]));
    }
  };

  const onKeyToIdAndParentId = (str: string) => {
    const idAndParentId = str.split("_");
    changeCurrentFolder({
      id: parseInt(idAndParentId[1]),
      parentId: parseInt(idAndParentId[0]),
      name: idAndParentId[2],
      desc: idAndParentId[3],
      nodeType:
        idAndParentId[4] == "true" ? folderType.node : folderType.folder,
    });
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

    onKeyToIdAndParentId,

    doFolderList,
    doCreatedFolder,
    doDeleteFolder,
    doUpdateFolder,

    doCreatedNode,
    doUpdateNode,
    doGetNodeInfo,
    doDeleteNode,
    doLockNode,
    doUnLockNode,
  };
};
export default useTemporaryQuery;
