import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import MonacoEditor from "react-monaco-editor";
import { TemporarySQL } from "@/pages/DataAnalysis/mock";

const EditorContent = () => {
  return (
    <div className={TemporaryQueryStyle.context}>
      <MonacoEditor
        height={"100%"}
        language={"sql"}
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
        value={TemporarySQL}
        // onChange={onChangeConfigContent}
      />
    </div>
  );
};
export default EditorContent;
