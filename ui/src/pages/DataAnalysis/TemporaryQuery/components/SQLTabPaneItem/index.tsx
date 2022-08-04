import SQLEditor from "@/pages/DataAnalysis/components/SQLEditor";
import { useIntl, useModel } from "umi";
import { format } from "sql-formatter";
import { FileTitleType } from "@/pages/DataAnalysis/components/FileTitle";
import RightMenu from "@/pages/DataAnalysis/components/RightMenu";
import { message, Spin } from "antd";
import { useEffect } from "react";
import { useState } from "react";

export interface SQLTabPaneItemType {
  id: number;
  parentId: number;
  node: any;
  currentPaneActiveKey: string;
}

const SQLTabPaneItem = (props: SQLTabPaneItemType) => {
  const i18n = useIntl();
  const { id, parentId, node, currentPaneActiveKey } = props;
  const { doGetNodeInfo, doUpdateNode, doUnLockNode, doLockNode, manageNode } =
    useModel("dataAnalysis");

  const [folderContent, setFolderContent] = useState<string>("");
  const [fileData, setFileData] = useState<any>({});

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

  return (
    <Spin spinning={doGetNodeInfo.loading}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SQLEditor
          isChange={isUpdateStateFun()}
          file={fileData}
          onSave={() => handleSaveNode()}
          onLock={() => handleLockFile(id as number)}
          onUnlock={() => handleUnLockFile(id as number)}
          onFormat={() => setFolderContent(format(folderContent))}
          type={FileTitleType.sql}
          onGrabLock={handleGrabLock}
          folderContent={folderContent}
          setFolderContent={setFolderContent}
          node={node}
          currentPaneActiveKey={currentPaneActiveKey}
        />
        <RightMenu node={node} currentPaneActiveKey={currentPaneActiveKey} />
      </div>
    </Spin>
  );
};
export default SQLTabPaneItem;
