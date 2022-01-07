import editorStyles from "@/pages/Configure/components/Editor/index.less";
import MonacoEditor from "react-monaco-editor";
import { useModel } from "@@/plugin-model/useModel";
import { Empty, Modal, Spin } from "antd";
import OptionButton, {
  ButtonType,
} from "@/pages/Configure/components/CustomButton/OptionButton";

type EditorProps = {};
const Editor = (props: EditorProps) => {
  const {
    doGetConfiguration,
    currentConfiguration,
    onChangeConfigContent,
    onChangeVisibleCommit,
    configContent,
    doAddLock,
    doRemoveLock,
    selectedConfigMap,
    selectedNameSpace,
    selectedClusterId,
  } = useModel("configure");
  const { currentUser } = useModel("@@initialState").initialState || {};
  const currentEditorUser = currentConfiguration?.currentEditUser;
  const contentChanged =
    currentConfiguration && currentConfiguration.content !== configContent;

  if (!selectedConfigMap || !selectedNameSpace || !selectedClusterId) {
    return <div className={editorStyles.editorLoading} />;
  }

  if (!currentConfiguration || doGetConfiguration.loading) {
    return (
      <div className={editorStyles.editorLoading}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={""} />
        {doGetConfiguration.loading ? (
          <div>
            <Spin />
            <div>loading</div>
          </div>
        ) : (
          <div>Please select a file</div>
        )}
      </div>
    );
  }
  return (
    <div className={editorStyles.editorMain}>
      <div className={editorStyles.editorHeader}>
        {currentEditorUser ? (
          <>
            <span className={editorStyles.editorUser}>
              <span>{currentEditorUser?.nickname}&nbsp;&nbsp;</span>
              <span>Editing</span>
            </span>
            {currentEditorUser.id === currentUser.id && (
              <OptionButton
                type={"border" as ButtonType}
                style={{ fontSize: "12px", padding: "2px 10px" }}
                onClick={() => {
                  if (contentChanged) {
                    Modal.confirm({
                      content:
                        "当前修改未保存，退出后将丢失本次修改的内容，是否退出编辑？",
                      onOk: () => {
                        doRemoveLock.run(currentConfiguration.id);
                      },
                    });
                  } else {
                    doRemoveLock.run(currentConfiguration.id);
                  }
                }}
              >
                Exit Edit
              </OptionButton>
            )}
            {contentChanged && (
              <OptionButton
                type={"border" as ButtonType}
                style={{
                  fontSize: "12px",
                  padding: "2px 10px",
                  marginLeft: "10px",
                }}
                onClick={() => {
                  onChangeVisibleCommit(true);
                }}
              >
                Save
              </OptionButton>
            )}
          </>
        ) : (
          <OptionButton
            type={"border" as ButtonType}
            style={{ fontSize: "12px", padding: "2px 10px" }}
            onClick={() => {
              doAddLock.run(currentConfiguration.id);
            }}
          >
            Start Editing
          </OptionButton>
        )}
      </div>
      <div className={editorStyles.editor}>
        <MonacoEditor
          height={"100%"}
          language={currentConfiguration.format === "json" ? "json" : "sb"}
          theme="vs-dark"
          options={{
            automaticLayout: true,
            scrollBeyondLastLine: false,
            readOnly: !(
              currentEditorUser && currentEditorUser.id === currentUser.id
            ),
          }}
          value={configContent}
          onChange={onChangeConfigContent}
        />
      </div>
    </div>
  );
};
export default Editor;
