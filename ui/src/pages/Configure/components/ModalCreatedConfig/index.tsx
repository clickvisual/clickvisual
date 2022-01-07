import CustomModal from "@/components/CustomModal";
import { Button, Form, FormInstance, Input, Radio } from "antd";
import { useRef } from "react";
import { useModel } from "@@/plugin-model/useModel";

const ModalCreatedConfig = () => {
  const formRef = useRef<FormInstance>(null);
  const {
    selectedClusterId,
    selectedConfigMap,
    selectedNameSpace,
    visibleCreate,
    onChangeVisibleCreate,
    doGetConfigurations,
    doCreatedConfiguration,
  } = useModel("configure");

  const handleCreated = (field: any) => {
    const k8sConfigMap = {
      k8sConfigMapName: selectedConfigMap as string,
      k8sConfigMapNameSpace: selectedNameSpace as string,
    };
    doCreatedConfiguration
      .run({
        configurationName: field.configurationName,
        format: field.format,
        ...k8sConfigMap,
        clusterId: selectedClusterId as number,
      })
      .then((res) => {
        if (res?.code === 0) {
          doGetConfigurations.run(k8sConfigMap);
          onCancel();
        }
      });
  };
  const onCancel = () => {
    onChangeVisibleCreate(false);
  };
  return (
    <CustomModal title="新建配置" visible={visibleCreate} onCancel={onCancel}>
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 18 }}
        ref={formRef}
        onFinish={handleCreated}
      >
        <Form.Item
          label="格式"
          name="format"
          initialValue="json"
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Radio value="json">JSON</Radio>
            <Radio value="conf">CONF</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, after) => prev.format != after.format}
        >
          {({ getFieldValue }) => {
            const format = getFieldValue("format");
            return (
              <Form.Item
                label="文件名"
                name="configurationName"
                rules={[{ required: true }, { min: 2 }, { max: 32 }]}
              >
                <Input addonAfter={"." + format} />
              </Form.Item>
            );
          }}
        </Form.Item>
        <Form.Item noStyle>
          <div style={{ display: "flex", justifyContent: "end" }}>
            <Button
              loading={doCreatedConfiguration.loading}
              type="primary"
              htmlType={"submit"}
            >
              提交
            </Button>
          </div>
        </Form.Item>
      </Form>
    </CustomModal>
  );
};

export default ModalCreatedConfig;
