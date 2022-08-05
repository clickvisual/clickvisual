import WorkflowSql from "@/pages/DataAnalysis/components/SQLEditor";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo, useState } from "react";
import { Empty, message } from "antd";
import { SecondaryEnums } from "@/pages/DataAnalysis/service/enums";
import IntegratedConfiguration from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration";
import WorkflowBoard from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard";
import { FileTitleType } from "@/pages/DataAnalysis/components/FileTitle";
import { format } from "sql-formatter";
import { useIntl } from "umi";

export interface WorkflowContentType {
  id: number;
  parentId: number;
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
    manageNode.doMandatoryGetFileLock.run(file?.id).then((res: any) => {
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

  useEffect(() => {
    onGetFolderInfo(id);
  }, []);

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
        return <WorkflowBoard currentBoard={node} />;
      default:
        return (
          <Empty
            style={{ width: "100%" }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        );
    }
  }, [node, fileData, isUpdateStateFun(), folderContent, currentPaneActiveKey]);
  return <>{Content}</>;
};

export default WorkflowContent;
