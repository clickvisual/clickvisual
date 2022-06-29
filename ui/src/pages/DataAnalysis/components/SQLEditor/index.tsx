import style from "@/pages/DataAnalysis/components/SQLEditor/index.less";
import FileTitle, {
  FileTitleProps,
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import EditorContent from "./EditorContent";
// import EditorHeader from "./EditorHeader";
import SqlTable from "./SqlTable";

const SQLEditor = (props: FileTitleProps) => {
  const { file, onSave, onLock, onUnlock, onRun, isChange, onFormat } = props;
  return (
    <div className={style.editorMain}>
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
      {/* <EditorHeader /> */}
      <EditorContent />
      <SqlTable />
    </div>
  );
};

export default SQLEditor;
