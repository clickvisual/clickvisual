import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import MonacoEditor from "react-monaco-editor";

const EditorContent = () => {
  return (
    <div className={TemporaryQueryStyle.context}>
      <MonacoEditor
        height={"100%"}
        language={"mysql"}
        theme="vs-dark"
        options={{
          automaticLayout: true,
          scrollBeyondLastLine: false,
          minimap: {
            enabled: true,
          },
          // readOnly: !(
          //   currentEditorUser && currentEditorUser.id === currentUser?.id
          // ),
        }}
        value={""}
        // onChange={onChangeConfigContent}
      />
    </div>
  );
};
export default EditorContent;
