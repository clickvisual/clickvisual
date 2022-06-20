import style from "@/pages/DataAnalysis/components/SQLEditor/index.less";
import EditorContent from "./EditorContent";
import EditorHeader from "./EditorHeader";
import SqlTable from ".//SqlTable";

const SQLEditor = () => {
  return (
    <div className={style.editorMain}>
      <EditorHeader />
      <EditorContent />
      <SqlTable />
    </div>
  );
};

export default SQLEditor;
