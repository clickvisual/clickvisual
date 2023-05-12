import CustomModal from "@/components/CustomModal";
import diffStyles from "@/pages/Configure/components/Menu/Publish/RealtimeDiff/index.less";
import { useModel } from "@umijs/max";
import { Button, Spin } from "antd";
import { useEffect } from "react";
import { MonacoDiffEditor } from "react-monaco-editor";
import { useIntl } from "umi";

type RealtimeDiffProps = {
  open?: boolean;
  configId?: number;
  version?: string;
  onCancel?: () => void;
  onOk: () => void;
};

const RealtimeDiff = (props: RealtimeDiffProps) => {
  const { open, configId, version, onCancel, onOk } = props;
  const {
    selectedClusterId,
    selectedConfigMap,
    selectedNameSpace,
    configurationList,
    doGetCurrentVersionConfiguration,
    doGetOnlineConfiguration,
    doPublishConfiguration,
  } = useModel("configure");
  const i18n = useIntl();

  useEffect(() => {
    if (!open || !configId || !version) return;
    doGetCurrentVersionConfiguration.run(configId, version);
    const config = configurationList.find((item) => item.id === configId);
    doGetOnlineConfiguration.run(
      selectedClusterId as number,
      selectedNameSpace as string,
      selectedConfigMap as string,
      `${config?.name}.${config?.format}`
    );
  }, [open, configId, version]);

  return (
    <CustomModal
      open={open}
      title={i18n.formatMessage({ id: "config.diff.title" })}
      width="90%"
      footer={
        <Button
          loading={doPublishConfiguration.loading}
          size={"small"}
          type={"primary"}
          onClick={() => onOk()}
        >
          {i18n.formatMessage({ id: "config.publish.button" })}
        </Button>
      }
      onCancel={onCancel}
    >
      <Spin
        spinning={
          doGetCurrentVersionConfiguration.loading ||
          doGetOnlineConfiguration.loading
        }
      >
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
          value={doGetCurrentVersionConfiguration.data?.content}
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

export default RealtimeDiff;
