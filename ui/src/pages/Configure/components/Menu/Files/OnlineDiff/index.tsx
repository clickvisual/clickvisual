import { useModel } from "@@/plugin-model/useModel";
import CustomModal from "@/components/CustomModal";
import { Spin } from "antd";
import { MonacoDiffEditor } from "react-monaco-editor";
import { useEffect } from "react";
import diffStyles from "@/pages/Configure/components/Menu/Publish/RealtimeDiff/index.less";
import { useIntl } from "umi";

type OnlineDiffProps = {
  visible: boolean;
  onCancel?: () => void;
};

const OnlineDiff = (props: OnlineDiffProps) => {
  const { visible, onCancel } = props;
  const {
    selectedClusterId,
    selectedConfigMap,
    selectedNameSpace,
    currentConfiguration,
    doGetOnlineConfiguration,
  } = useModel("configure");
  const i18n = useIntl();

  useEffect(() => {
    if (!visible) return;
    doGetOnlineConfiguration.run(
      selectedClusterId as number,
      selectedNameSpace as string,
      selectedConfigMap as string,
      `${currentConfiguration?.name}.${currentConfiguration?.format}`
    );
  }, [visible]);

  return (
    <CustomModal
      visible={visible}
      title={i18n.formatMessage({ id: "config.diff.title" })}
      width="90%"
      onCancel={onCancel}
    >
      <Spin spinning={doGetOnlineConfiguration.loading}>
        <div className={diffStyles.diffHeader}>
          <div className={diffStyles.title}>
            {i18n.formatMessage({ id: "config.diff.online" })}
          </div>
          <div className={diffStyles.title}>
            {i18n.formatMessage({ id: "config.diff.current" })}
          </div>
        </div>
        <MonacoDiffEditor
          language="json"
          theme="vs-dark"
          original={doGetOnlineConfiguration.data}
          value={currentConfiguration?.content}
          height="70vh"
          options={{
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
        />
      </Spin>
    </CustomModal>
  );
};
export default OnlineDiff;
