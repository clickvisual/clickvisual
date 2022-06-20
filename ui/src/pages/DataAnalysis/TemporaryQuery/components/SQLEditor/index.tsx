import style from "@/pages/DataAnalysis/TemporaryQuery/components/SQLEditor/index.less";
import EditorContent from "@/pages/DataAnalysis/TemporaryQuery/components/SQLEditor/EditorContent";
import EditorHeader from "@/pages/DataAnalysis/TemporaryQuery/components/SQLEditor/EditorHeader";
import SqlTable from "@/pages/DataAnalysis/TemporaryQuery/components/SQLEditor/SqlTable";

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
