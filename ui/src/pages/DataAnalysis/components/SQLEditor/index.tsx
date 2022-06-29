import style from "@/pages/DataAnalysis/components/SQLEditor/index.less";
import FileTitle, {
  FileTitleProps,
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import EditorContent from "./EditorContent";
// import EditorHeader from "./EditorHeader";
import SqlTable from "./SqlTable";
import { useModel } from "umi";
import { Spin } from "antd";

const SQLEditor = (props: FileTitleProps) => {
  const { file, onSave, onLock, onUnlock, onRun, isChange, onFormat } = props;

  const { doGetNodeInfo } = useModel("dataAnalysis");

  return (
    <div className={style.editorMain}>
      {doGetNodeInfo.loading ? (
        <div className={style.spin}>
          <Spin />
        </div>
      ) : (
        <>
          <FileTitle
            isChange={isChange}
            file={file}
            onSave={onSave}
            onLock={onLock}
            onUnlock={onUnlock}
            onRun={onRun}
            onFormat={onFormat}
            type={FileTitleType.sql}
          />
          <EditorContent />
        </>
      )}

      {/* <EditorHeader /> */}

      <SqlTable />
    </div>
  );
};

export default SQLEditor;
