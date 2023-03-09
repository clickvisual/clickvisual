import CustomModal from "@/components/CustomModal";
import { DEBOUNCE_WAIT } from "@/config/config";
import { SaveOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { useDebounceFn } from "ahooks";
import { Button, Form, FormInstance, Input } from "antd";
import { useRef } from "react";
import { useIntl } from "umi";

const ModalCreatedConfigMap = () => {
  const configMapFormRef = useRef<FormInstance>(null);
  const {
    doCreatedConfigMap,
    selectedClusterId,
    visibleCreatedConfigMap,
    onChangeVisibleCreatedConfigMap,
    doGetConfigMaps,
    clusters,
  } = useModel("configure");

  const i18n = useIntl();

  const doSubmit = useDebounceFn(
    (field) =>
      doCreatedConfigMap.run(selectedClusterId as number, field).then((res) => {
        if (res?.code === 0) {
          doGetConfigMaps(selectedClusterId as number);
          onChangeVisibleCreatedConfigMap(false);
        }
      }),
    { wait: DEBOUNCE_WAIT }
  ).run;

  return (
    <CustomModal
      open={visibleCreatedConfigMap}
      title={i18n.formatMessage(
        { id: "config.createdConfigMap.title" },
        {
          cluster: clusters.find((item) => item.id === selectedClusterId)
            ?.clusterName,
        }
      )}
      onCancel={() => onChangeVisibleCreatedConfigMap(false)}
      footer={
        <Button
          loading={doCreatedConfigMap.loading}
          onClick={() => configMapFormRef.current?.submit()}
          type={"primary"}
          icon={<SaveOutlined />}
        >
          {i18n.formatMessage({ id: "submit" })}
        </Button>
      }
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        ref={configMapFormRef}
        onFinish={doSubmit}
      >
        <Form.Item label={"Namespace"} name={"namespace"}>
          <Input
            placeholder={`${i18n.formatMessage({
              id: "config.createdConfigMap.placeholder.namespace",
            })}`}
          />
        </Form.Item>
        <Form.Item label={"ConfigMap"} name={"configmapName"}>
          <Input
            placeholder={`${i18n.formatMessage({
              id: "config.createdConfigMap.placeholder.configmap",
            })}`}
          />
        </Form.Item>
      </Form>
    </CustomModal>
  );
};

export default ModalCreatedConfigMap;
