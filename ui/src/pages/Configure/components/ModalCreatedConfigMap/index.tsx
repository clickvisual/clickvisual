import CustomModal from "@/components/CustomModal";
import { Button, Form, FormInstance, Input } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useRef } from "react";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import { useIntl } from "umi";
import { SaveOutlined } from "@ant-design/icons";

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
      visible={visibleCreatedConfigMap}
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
              id: "config.createdConfigMap.placeholder.configMap",
            })}`}
          />
        </Form.Item>
      </Form>
    </CustomModal>
  );
};

export default ModalCreatedConfigMap;
