import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import MonacoEditor from "react-monaco-editor";
import { useModel } from "umi";

const EditorContent = () => {
  const { temporaryQuery } = useModel("dataAnalysis");
  const { currentUser } = useModel("@@initialState").initialState || {};
  const { openNodeData, changeFolderContent, folderContent } = temporaryQuery;

  const onChangeFolderContent = (value: string) => {
    changeFolderContent(value);
  };

  return (
    <div className={TemporaryQueryStyle.context}>
      <MonacoEditor
        height={"100%"}
        language={"mysql"}
        theme="vs-white"
        options={{
          automaticLayout: true,
          scrollBeyondLastLine: false,
          minimap: {
            enabled: true,
          },
          readOnly: !(openNodeData && openNodeData.lockUid === currentUser?.id),
        }}
        value={folderContent || openNodeData?.content}
        onChange={onChangeFolderContent}
      />
    </div>
  );
};
export default EditorContent;
