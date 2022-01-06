import editorStyles from "@/pages/Configure/components/Editor/index.less";
import MonacoEditor from "react-monaco-editor";
import { useModel } from "@@/plugin-model/useModel";
import { Empty, Spin } from "antd";
import OptionButton, {
  ButtonType,
} from "@/pages/Configure/components/CustomButton/OptionButton";

type EditorProps = {};
const Editor = (props: EditorProps) => {
  const {
    doGetConfiguration,
    currentConfiguration,
    onChangeConfigContent,
    configContent,
  } = useModel("configure");
  if (!currentConfiguration || doGetConfiguration.loading) {
    return (
      <div className={editorStyles.editorLoading}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={""} />
        {doGetConfiguration.loading ? (
          <div>
            <Spin />
            <div>加载中</div>
          </div>
        ) : (
          <div>请选择文件</div>
        )}
      </div>
    );
  }
  return (
    <div className={editorStyles.editorMain}>
      <div className={editorStyles.editorHeader}>
        <OptionButton
          type={"border" as ButtonType}
          style={{ fontSize: "12px", padding: "2px 10px" }}
        >
          开始编辑
        </OptionButton>
      </div>
      <MonacoEditor
        height={"100%"}
        language={currentConfiguration.format === "json" ? "json" : "sb"}
        theme="vs-dark"
        options={{
          automaticLayout: true,
          scrollBeyondLastLine: false,
          readOnly: false,
        }}
        value={configContent}
        onChange={onChangeConfigContent}
      />
    </div>
  );
};
export default Editor;
