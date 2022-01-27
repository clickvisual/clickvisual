import editorStyles from "@/pages/Configure/components/Editor/index.less";
import MonacoEditor from "react-monaco-editor";
import { useModel } from "@@/plugin-model/useModel";
import { Empty, Modal, Spin } from "antd";
import OptionButton, {
  ButtonType,
} from "@/pages/Configure/components/CustomButton/OptionButton";
import { useIntl } from "umi";

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
  const i18n = useIntl();
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
            <div>{i18n.formatMessage({ id: "spin" })}</div>
          </div>
        ) : (
          <div>{i18n.formatMessage({ id: "config.editor.empty.tip" })}</div>
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
              <span>{currentEditorUser?.nickname}</span>
              <span>
                {i18n.formatMessage({ id: "config.editor.userEditing" })}
              </span>
            </span>
            {currentEditorUser.id === currentUser.id && (
              <OptionButton
                type={"border" as ButtonType}
                style={{ fontSize: "12px", padding: "2px 10px" }}
                onClick={() => {
                  if (contentChanged) {
                    Modal.confirm({
                      content: `${i18n.formatMessage({
                        id: "config.editor.exitEditor.confirm",
                      })}`,
                      onOk: () => {
                        doRemoveLock.run(currentConfiguration.id);
                      },
                    });
                  } else {
                    doRemoveLock.run(currentConfiguration.id);
                  }
                }}
              >
                {i18n.formatMessage({ id: "config.editor.exitEditor" })}
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
                {i18n.formatMessage({ id: "button.save" })}
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
            {i18n.formatMessage({ id: "config.editor.button.startEdit" })}
          </OptionButton>
        )}
      </div>
      <div className={editorStyles.editor}>
        <MonacoEditor
          height={"100%"}
          language={
            ["toml", "conf"].indexOf(currentConfiguration.format) === -1
              ? currentConfiguration.format
              : "sb"
          }
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
