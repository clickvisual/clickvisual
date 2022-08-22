import style from "@/pages/DataAnalysis/components/SQLEditor/index.less";
import MonacoEditor from "react-monaco-editor";
import { useModel } from "umi";

export interface EditorContentType {
  file: any;
  folderContent: string;
  setFolderContent: (str: string) => void;
}

const EditorContent = (props: EditorContentType) => {
  const { file, folderContent, setFolderContent } = props;
  const { currentUser } = useModel("@@initialState").initialState || {};

  const onChangeFolderContent = (value: string) => {
    setFolderContent(value);
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
          wordWrap: "on",
          minimap: {
            enabled: true,
          },
          readOnly: !(file && file.lockUid === currentUser?.id),
        }}
        value={folderContent}
        onChange={onChangeFolderContent}
      />
    </div>
  );
};
export default EditorContent;
