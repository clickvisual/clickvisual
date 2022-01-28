import CustomModal from "@/components/CustomModal";
import { Button, Form, FormInstance, Input, Radio } from "antd";
import { useEffect, useRef } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { SaveOutlined } from "@ant-design/icons";

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

  const i18n = useIntl();

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

  useEffect(() => {
    if (!visibleCreate) {
      formRef.current?.resetFields();
    }
  }, [visibleCreate]);
  return (
    <CustomModal
      title={i18n.formatMessage({ id: "config.createdConfig.title" })}
      visible={visibleCreate}
      onCancel={onCancel}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 18 }}
        ref={formRef}
        onFinish={handleCreated}
      >
        <Form.Item
          label={i18n.formatMessage({
            id: "config.createdConfig.form.format",
          })}
          name="format"
          initialValue="toml"
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Radio value="toml">TOML</Radio>
            <Radio value="yaml">YAML</Radio>
            <Radio value="json">JSON</Radio>
            <Radio value="ini">INI</Radio>
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
                label={i18n.formatMessage({
                  id: "config.createdConfig.form.fileName",
                })}
                name="configurationName"
                rules={[{ required: true }, { min: 2 }, { max: 32 }]}
              >
                <Input
                  placeholder={`${i18n.formatMessage({
                    id: "config.createdConfig.form.placeholder.fileName",
                  })}`}
                  addonAfter={"." + format}
                />
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
              icon={<SaveOutlined />}
            >
              {i18n.formatMessage({ id: "submit" })}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </CustomModal>
  );
};

export default ModalCreatedConfig;
