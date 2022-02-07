import CustomModal from "@/components/CustomModal";
import { Button, Form, FormInstance, Input } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { MonacoDiffEditor } from "react-monaco-editor";
import { useEffect, useRef } from "react";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import { useIntl } from "umi";
import { SaveOutlined } from "@ant-design/icons";

const ModalCommit = () => {
  const commitFormRef = useRef<FormInstance>(null);
  const {
    configContent,
    currentConfiguration,
    doUpdatedConfiguration,
    visibleCommit,
    onChangeVisibleCommit,
    selectedNameSpace,
    selectedConfigMap,
    doGetConfigurations,
    doGetConfiguration,
    doRemoveLock,
  } = useModel("configure");
  const i18n = useIntl();
  const handleCommit = useDebounceFn(
    (field: any) => {
      if (!currentConfiguration) return;
      doUpdatedConfiguration
        .run(currentConfiguration.id, {
          ...field,
          content: configContent,
        })
        .then((res) => {
          if (res?.code === 0) {
            doGetConfigurations.run({
              k8sConfigMapNameSpace: selectedNameSpace as string,
              k8sConfigMapName: selectedConfigMap as string,
            });
            doGetConfiguration.run(currentConfiguration.id);
            doRemoveLock.run(currentConfiguration.id);
          }
        });
      onChangeVisibleCommit(false);
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  useEffect(() => {
    if (!visibleCommit) {
      commitFormRef.current?.resetFields();
    }
  }, [visibleCommit]);
  return (
    <CustomModal
      title={i18n.formatMessage({ id: "config.commit.title" })}
      width={"90vw"}
      visible={visibleCommit}
      footer={
        <Button
          loading={doUpdatedConfiguration.loading}
          type="primary"
          onClick={() => commitFormRef.current?.submit()}
          icon={<SaveOutlined />}
        >
          {i18n.formatMessage({ id: "submit" })}
        </Button>
      }
      onCancel={() => {
        onChangeVisibleCommit(false);
      }}
    >
      <Form ref={commitFormRef} layout="vertical" onFinish={handleCommit}>
        <Form.Item
          label={i18n.formatMessage({ id: "config.commit.form.message" })}
          name="message"
          rules={[{ required: true }]}
        >
          <Input.TextArea
            placeholder={`${i18n.formatMessage({
              id: "config.commit.form.placeholder.message",
            })}`}
            autoSize={{ minRows: 3, maxRows: 3 }}
            allowClear
          />
        </Form.Item>
        <MonacoDiffEditor
          height="60vh"
          original={currentConfiguration?.content}
          value={configContent}
          options={{ automaticLayout: true }}
        />
      </Form>
    </CustomModal>
  );
};

export default ModalCommit;
