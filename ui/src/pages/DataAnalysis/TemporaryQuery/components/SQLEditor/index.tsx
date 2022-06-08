import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import EditorContent from "@/pages/DataAnalysis/TemporaryQuery/components/SQLEditor/EditorContent";
import EditorHeader from "@/pages/DataAnalysis/TemporaryQuery/components/SQLEditor/EditorHeader";

const SQLEditor = () => {
  return (
    <div className={TemporaryQueryStyle.editorMain}>
      <EditorHeader />
      <EditorContent />
    </div>
  );
};

export default SQLEditor;
