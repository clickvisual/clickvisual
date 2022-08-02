import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import FolderTree from "@/pages/DataAnalysis/components/FolderTree";
import SQLEditor from "@/pages/DataAnalysis/components/SQLEditor";
import { useModel } from "umi";
import { format } from "sql-formatter";
import { FileTitleType } from "@/pages/DataAnalysis/components/FileTitle";

const TemporaryQuery = () => {
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
  } = useModel("dataAnalysis");

  return (
    <div className={TemporaryQueryStyle.queryMain}>
      <FolderTree />
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
    </div>
  );
};
export default TemporaryQuery;
