import useRequest from "@/hooks/useRequest/useRequest";
import systemApi, { InstanceType } from "@/services/systemSetting";
import useRealTimeTraffic from "@/models/dataanalysis/useRealTimeTraffic";
import useTemporaryQuery, {
  openNodeDataType,
} from "@/models/dataanalysis/useTemporaryQuery";
import useDataSourceManage from "@/models/dataanalysis/useDataSourceManage";
import { useEffect, useState } from "react";
import useWorkflow from "@/models/dataanalysis/useWorkflow";
import useManageNodeAndFolder from "@/models/dataanalysis/useManageNodeAndFolder";
import dataAnalysis from "@/services/temporaryQuery";
import dataAnalysisApi from "@/services/dataAnalysis";
import realtimeApi from "@/services/realTimeTrafficFlow";
import useIntegratedConfigs from "@/models/dataanalysis/useIntegratedConfigs";
import dataSourceManageApi from "@/services/dataSourceManage";
import { message } from "antd";

const DataAnalysis = () => {
  const [navKey, setNavKey] = useState<string>();
  const [instances, setInstances] = useState<InstanceType[]>([]);
  const [currentInstances, setCurrentInstances] = useState<number>();
  const [sqlQueryResults, setSqlQueryResults] = useState<any>();
  const [visibleSqlQuery, setVisibleSqlQuery] = useState<boolean>(false);
  // 打开的文件节点id
  const [openNodeId, setOpenNodeId] = useState<number>();
  // 打开的文件节点父级id
  const [openNodeParentId, setOpenNodeParentId] = useState<number>();
  const [openNodeData, setOpenNodeData] = useState<openNodeDataType>();
  // 节点修改后的value
  const [folderContent, setFolderContent] = useState<string>("");

  const realTimeTraffic = useRealTimeTraffic();
  const temporaryQuery = useTemporaryQuery();
  const workflow = useWorkflow();
  const dataSourceManage = useDataSourceManage();
  const manageNode = useManageNodeAndFolder();
  const integratedConfigs = useIntegratedConfigs();

  const changeOpenNodeId = (id: number) => {
    setOpenNodeId(id);
  };

  const changeOpenNodeParentId = (parentId: number) => {
    setOpenNodeParentId(parentId);
  };

  const changeOpenNodeData = (value: any) => {
    setOpenNodeData(value);
  };

  const changeFolderContent = (str: string) => {
    setFolderContent(str);
  };

  const onChangeNavKey = (key: string) => {
    setNavKey(key);
  };

  const changeSqlQueryResults = (data: any) => {
    setSqlQueryResults(data);
  };

  const changeVisibleSqlQuery = (flag: boolean) => {
    setVisibleSqlQuery(flag);
  };

  const onChangeCurrentInstances = (value: number) => {
    setCurrentInstances(value);
  };

  const doGetInstance = useRequest(systemApi.getInstances, {
    loadingText: false,
  });

  const doGetDatabase = useRequest(realtimeApi.getDataBaseList, {
    loadingText: false,
  });

  const doGetTables = useRequest(realtimeApi.getTableList, {
    loadingText: false,
  });

  const doGetNodeInfo = useRequest(dataAnalysisApi.getNodeInfo, {
    loadingText: false,
  });

  // Node
  const doCreatedNode = useRequest(dataAnalysisApi.createdNode, {
    loadingText: false,
  });

  const doUpdateNode = useRequest(dataAnalysisApi.updateNode, {
    loadingText: false,
  });

  const doDeleteNode = useRequest(dataAnalysisApi.deleteNode, {
    loadingText: false,
  });

  const doLockNode = useRequest(dataAnalysis.lockNode, {
    loadingText: false,
  });

  const doUnLockNode = useRequest(dataAnalysis.unLockNode, {
    loadingText: false,
  });

  const doRunCodeNode = useRequest(dataAnalysis.runCodekNode, {
    loadingText: {
      loading: "运行中",
      done: "运行成功",
    },
  });

  const doGetSourceList = useRequest(dataSourceManageApi.getSourceList, {
    loadingText: false,
  });

  useEffect(() => {
    changeOpenNodeId(0);
    changeOpenNodeParentId(0);
    changeOpenNodeData(undefined);
    changeFolderContent("");
    dataSourceManage.changeSourceList([]);
    manageNode.setSelectNode({});
  }, [navKey]);

  // 获取文件信息
  const onGetFolderList = () => {
    openNodeId &&
      doGetNodeInfo.run(openNodeId).then((res: any) => {
        if (res.code == 0) {
          setOpenNodeData(res.data);
          changeFolderContent(res.data.content);
        }
      });
  };

  // 是否修改
  const isUpdateStateFun = () => {
    return folderContent !== openNodeData?.content;
  };

  /**文件夹标题*/

  // 锁定节点
  const handleLockFile = (nodeId: number) => {
    if (openNodeData?.lockAt == 0 && nodeId) {
      doLockNode.run(nodeId).then((res: any) => {
        if (res.code == 0) {
          onGetFolderList();
        }
      });
    }
  };

  // 解锁节点
  const handleUnLockFile = (nodeId: number) => {
    if (isUpdateStateFun()) {
      message.warning("当前修改暂未保存，确定要解锁吗");
      return;
    }
    nodeId &&
      doUnLockNode.run(nodeId).then((res: any) => {
        if (res.code == 0) {
          onGetFolderList();
        }
      });
  };

  // 保存编辑后的文件节点
  const handleSaveNode = () => {
    const data: any = {
      name: openNodeData?.name,
      content: folderContent,
      desc: openNodeData?.desc,
      folderId: openNodeParentId,
    };
    openNodeId &&
      doUpdateNode.run(openNodeId, data).then((res: any) => {
        if (res.code == 0) {
          message.success("保存成功");
          onGetFolderList();
        }
      });
  };

  // run
  const handleRunCode = (nodeId: number) => {
    nodeId &&
      doRunCodeNode.run(nodeId).then((res: any) => {
        if (res.code == 0) {
          changeSqlQueryResults(res.data);
          changeVisibleSqlQuery(true);
        }
      });
  };

  useEffect(() => {
    onGetFolderList();
  }, [openNodeId]);

  return {
    instances,
    currentInstances,
    navKey,
    sqlQueryResults,
    visibleSqlQuery,

    setInstances,
    onChangeCurrentInstances,
    onChangeNavKey,
    changeSqlQueryResults,
    changeVisibleSqlQuery,

    folderContent,
    changeFolderContent,

    openNodeData,
    changeOpenNodeData,

    openNodeId,
    changeOpenNodeId,

    openNodeParentId,
    changeOpenNodeParentId,
    isUpdateStateFun,

    onGetFolderList,

    doGetInstance,
    doGetDatabase,
    doGetTables,
    doGetNodeInfo,
    doGetSourceList,

    realTimeTraffic,
    temporaryQuery,
    workflow,
    dataSourceManage,

    // node
    doCreatedNode,
    doUpdateNode,
    doDeleteNode,
    doLockNode,
    doUnLockNode,
    doRunCodeNode,

    // sqlTitle
    handleLockFile,
    handleUnLockFile,
    handleSaveNode,
    handleRunCode,

    manageNode,
    integratedConfigs,
  };
};

export default DataAnalysis;
