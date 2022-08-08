import useRequest from "@/hooks/useRequest/useRequest";
import systemApi, { InstanceType } from "@/services/systemSetting";
import useRealTimeTraffic from "@/models/dataanalysis/useRealTimeTraffic";
import useTemporaryQuery from // openNodeDataType,
"@/models/dataanalysis/useTemporaryQuery";
import useDataSourceManage from "@/models/dataanalysis/useDataSourceManage";
import { useState } from "react";
import useWorkflow from "@/models/dataanalysis/useWorkflow";
import useManageNodeAndFolder from "@/models/dataanalysis/useManageNodeAndFolder";
import temporaryQueryApi from "@/services/temporaryQuery";
import dataAnalysisApi from "@/services/dataAnalysis";
import realtimeApi from "@/services/realTimeTrafficFlow";
import useIntegratedConfigs from "@/models/dataanalysis/useIntegratedConfigs";
import dataSourceManageApi from "@/services/dataSourceManage";
import { formatMessage } from "@@/plugin-locale/localeExports";
// import { message } from "antd";
import useWorkflowBoard from "@/models/dataanalysis/useWorkflowBoard";
import useFilePane from "@/models/dataanalysis/useFilePane";
import { LuckysheetProps } from "@/components/Luckysheet";
export interface versionHistoryListType {
  list: any[];
  total: number;
}

const DataAnalysis = () => {
  const [navKey, setNavKey] = useState<string>();
  const [instances, setInstances] = useState<InstanceType[]>([]);
  const [currentInstances, setCurrentInstances] = useState<number>();
  // 把luckysheet的值存到model可以值渲染一个luckysheet
  const [luckysheetData, setLuckysheetData] = useState<LuckysheetProps["data"]>(
    [
      {
        name: "luckysheet",
        celldata: [],
      },
    ]
  );

  // TODO: 下面所有state需要调整到panes里面去

  // 数据集成运行结果的id
  // const [resultId, setResultId] = useState<number>(0);
  // // 打开的文件节点id
  const [openNodeId, setOpenNodeId] = useState<number>();
  // // 打开的文件节点父级id
  // const [openNodeParentId, setOpenNodeParentId] = useState<number>();

  // const [openNodeData, setOpenNodeData] = useState<openNodeDataType>();
  // // 节点修改后的value
  // const [folderContent, setFolderContent] = useState<string>("");

  const [userList, setUserList] = useState<any[]>([]);

  const realTimeTraffic = useRealTimeTraffic();
  const temporaryQuery = useTemporaryQuery();
  const workflow = useWorkflow();
  const dataSourceManage = useDataSourceManage();
  const manageNode = useManageNodeAndFolder();
  const integratedConfigs = useIntegratedConfigs();
  const workflowBoard = useWorkflowBoard();
  const filePane = useFilePane();

  const changeOpenNodeId = (id?: number) => {
    setOpenNodeId(id);
  };

  // const changeOpenNodeParentId = (parentId: number) => {
  //   setOpenNodeParentId(parentId);
  // };

  // const changeOpenNodeData = (value: any) => {
  //   setOpenNodeData(value);
  // };

  // const changeFolderContent = (str: string) => {
  //   setFolderContent(str);
  // };

  const onChangeNavKey = (key: string) => {
    setNavKey(key);
  };

  // const changeResultId = (num: number) => {
  //   setResultId(num);
  // };

  const onChangeCurrentInstances = (value?: number) => {
    setCurrentInstances(value);
  };

  const onChangeLuckysheetData = (obj: LuckysheetProps["data"]) => {
    setLuckysheetData(obj);
  };

  /**
   * api
   */

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

  const doLockNode = useRequest(temporaryQueryApi.lockNode, {
    loadingText: false,
  });

  const doUnLockNode = useRequest(temporaryQueryApi.unLockNode, {
    loadingText: false,
  });

  const doRunCodeNode = useRequest(temporaryQueryApi.runCodekNode, {
    loadingText: {
      loading: formatMessage({
        id: "bigdata.models.dataAnalysis.runLoadingText",
      }),
      done: formatMessage({
        id: "bigdata.models.dataAnalysis.runLoadingDoneText",
      }),
    },
  });

  const doGetSourceList = useRequest(dataSourceManageApi.getSourceList, {
    loadingText: false,
  });

  const doNodeHistories = useRequest(dataAnalysisApi.getNodeHistories, {
    loadingText: false,
  });

  const doNodeHistoriesInfo = useRequest(dataAnalysisApi.getNodeHistoriesInfo, {
    loadingText: false,
  });

  const doResultsList = useRequest(dataAnalysisApi.getResultsList, {
    loadingText: false,
  });

  const doModifyResults = useRequest(dataAnalysisApi.modifyResults, {
    loadingText: false,
  });

  const doResultsInfo = useRequest(dataAnalysisApi.getResultsInfo, {
    loadingText: false,
  });

  // 调度配置
  const doCreatCrontab = useRequest(dataAnalysisApi.creatCrontab, {
    loadingText: false,
  });

  const doGetCrontabInfo = useRequest(dataAnalysisApi.getCrontabInfo, {
    loadingText: false,
  });

  const doUpdateCrontab = useRequest(dataAnalysisApi.updateCrontab, {
    loadingText: false,
  });

  const doDeleteCrontab = useRequest(dataAnalysisApi.deleteCrontab, {
    loadingText: false,
  });

  const doGetUsers = useRequest(dataAnalysisApi.getUsers, {
    loadingText: false,
  });

  // // 获取文件信息
  // const onGetFolderInfo = (id: number) => {
  //   id &&
  //     doGetNodeInfo.run(id).then((res: any) => {
  //       if (res?.code === 0) {
  //         setOpenNodeData(res.data);
  //         // changeFolderContent(res.data.content);
  //       }
  //     });
  // };

  // // 是否修改
  // const isUpdateStateFun = () => {
  //   return folderContent !== openNodeData?.content;
  // };

  // /**文件夹标题*/

  // // 锁定节点
  // const handleLockFile = (nodeId: number) => {
  //   if (openNodeData?.lockAt == 0 && nodeId) {
  //     doLockNode.run(nodeId).then((res: any) => {
  //       if (res.code == 0) {
  //         onGetFolderInfo(nodeId);
  //       }
  //     });
  //   }
  // };

  // // 解锁节点
  // const handleUnLockFile = (nodeId: number) => {
  //   if (isUpdateStateFun()) {
  //     message.warning(
  //       formatMessage({ id: "bigdata.models.dataAnalysis.unlockTips" })
  //     );
  //     return;
  //   }
  //   nodeId &&
  //     doUnLockNode.run(nodeId).then((res: any) => {
  //       if (res.code == 0) {
  //         onGetFolderInfo(nodeId);
  //       }
  //     });
  // };

  // const handleGrabLock = (file: any) => {
  //   manageNode.doMandatoryGetFileLock.run(file?.id).then((res: any) => {
  //     if (res.code != 0) return;
  //     message.success(
  //       formatMessage({ id: "bigdata.components.FileTitle.grabLockSuccessful" })
  //     );
  //     onGetFolderInfo(file?.id);
  //   });
  // };

  // // 保存编辑后的文件节点
  // const handleSaveNode = () => {
  //   const data: any = {
  //     name: openNodeData?.name,
  //     content: folderContent,
  //     desc: openNodeData?.desc,
  //     folderId: openNodeParentId,
  //   };
  //   openNodeId &&
  //     doUpdateNode.run(openNodeId, data).then((res: any) => {
  //       if (res.code == 0) {
  //         message.success(
  //           formatMessage({ id: "log.index.manage.message.save.success" })
  //         );
  //         onGetFolderInfo(openNodeId);
  //       }
  //     });
  // };

  // // run
  const handleRunCode = async (nodeId: number, func?: any) => {
    nodeId &&
      doRunCodeNode.run(nodeId).then((res: any) => {
        if (res.code == 0) {
          func(nodeId);
        }
      });
  };

  // 获取用户责任人list
  const getUserList = () => {
    doGetUsers.run().then((res: any) => {
      if (res.code == 0) {
        setUserList(res.data);
      }
    });
  };

  return {
    instances,
    currentInstances,
    navKey,

    setInstances,
    onChangeCurrentInstances,
    onChangeNavKey,

    // resultId,
    // changeResultId,

    // folderContent,
    // changeFolderContent,

    // openNodeData,
    // changeOpenNodeData,

    openNodeId,
    changeOpenNodeId,

    // openNodeParentId,
    // changeOpenNodeParentId,
    // isUpdateStateFun,

    luckysheetData,
    onChangeLuckysheetData,

    // onGetFolderInfo,

    doGetInstance,
    doGetDatabase,
    doGetTables,
    doGetNodeInfo,
    doGetSourceList,

    // node
    doCreatedNode,
    doUpdateNode,
    doDeleteNode,
    doLockNode,
    doUnLockNode,
    doRunCodeNode,

    // sqlTitle
    // handleLockFile,
    // handleUnLockFile,
    // handleSaveNode,
    handleRunCode,
    // handleGrabLock,

    // histories
    doNodeHistories,
    doNodeHistoriesInfo,

    // results
    doResultsList,
    doResultsInfo,
    doModifyResults,

    // crontab
    doCreatCrontab,
    doGetCrontabInfo,
    doUpdateCrontab,
    doDeleteCrontab,
    userList,
    getUserList,

    manageNode,
    integratedConfigs,
    workflowBoard,
    realTimeTraffic,
    temporaryQuery,
    workflow,
    dataSourceManage,
    filePane,
  };
};

export default DataAnalysis;
