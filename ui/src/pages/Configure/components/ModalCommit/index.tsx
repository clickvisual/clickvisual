import CustomModal from "@/components/CustomModal";
import { Button, Form, FormInstance, Input } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { MonacoDiffEditor } from "react-monaco-editor";
import { useEffect, useRef } from "react";
import { useDebounceFn } from "ahooks";

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
    { wait: 500 }
  ).run;

  useEffect(() => {
    if (!visibleCommit) {
      commitFormRef.current?.resetFields();
    }
  }, [visibleCommit]);
  return (
    <CustomModal
      title={"保存配置变更"}
      width={"90vw"}
      visible={visibleCommit}
      footer={
        <Button
          loading={doUpdatedConfiguration.loading}
          type="primary"
          onClick={() => commitFormRef.current?.submit()}
        >
          提交
        </Button>
      }
      onCancel={() => {
        onChangeVisibleCommit(false);
      }}
    >
      <Form ref={commitFormRef} layout="vertical" onFinish={handleCommit}>
        <Form.Item label="变更记录" name="message" rules={[{ required: true }]}>
          <Input.TextArea
            placeholder="描述一下本次变更修改了哪些内容"
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
