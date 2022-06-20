import style from "@/pages/DataAnalysis/components/SQLEditor/index.less";
import MonacoEditor from "react-monaco-editor";
import { useModel } from "umi";

const EditorContent = () => {
  const { openNodeData, changeFolderContent, folderContent } =
    useModel("dataAnalysis");
  const { currentUser } = useModel("@@initialState").initialState || {};

  const onChangeFolderContent = (value: string) => {
    changeFolderContent(value);
  };

  return (
    <div className={style.context}>
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
        value={folderContent}
        onChange={onChangeFolderContent}
      />
    </div>
  );
};
export default EditorContent;
