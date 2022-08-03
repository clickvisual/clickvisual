import SQLEditor from "@/pages/DataAnalysis/components/SQLEditor";
import { useModel } from "umi";
import { format } from "sql-formatter";
import { FileTitleType } from "@/pages/DataAnalysis/components/FileTitle";
import RightMenu from "@/pages/DataAnalysis/components/RightMenu";
import { Spin } from "antd";

const SQLTabPaneItem = () => {
  const {
    openNodeData,
    isUpdateStateFun,
    openNodeId,
    handleLockFile,
    handleUnLockFile,
    handleSaveNode,
    changeFolderContent,
    folderContent,
    handleGrabLock,
    doGetNodeInfo,
  } = useModel("dataAnalysis");

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
          file={openNodeData}
          onSave={() => handleSaveNode()}
          onLock={() => handleLockFile(openNodeId as number)}
          onUnlock={() => handleUnLockFile(openNodeId as number)}
          onFormat={() => changeFolderContent(format(folderContent))}
          type={FileTitleType.sql}
          onGrabLock={handleGrabLock}
        />
        <RightMenu />
      </div>
    </Spin>
  );
};
export default SQLTabPaneItem;
