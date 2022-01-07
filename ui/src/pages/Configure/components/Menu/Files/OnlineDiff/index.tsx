import { useModel } from "@@/plugin-model/useModel";
import CustomModal from "@/components/CustomModal";
import { Spin } from "antd";
import { MonacoDiffEditor } from "react-monaco-editor";
import { useEffect } from "react";
import diffStyles from "@/pages/Configure/components/Menu/Publish/RealtimeDiff/index.less";

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
      title="实时配置 Diff"
      width="90%"
      onCancel={onCancel}
    >
      <Spin spinning={doGetOnlineConfiguration.loading}>
        <div className={diffStyles.diffHeader}>
          <div className={diffStyles.title}>生效中配置</div>
          <div className={diffStyles.title}>本次发布配置</div>
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
