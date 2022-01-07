import CustomModal from "@/components/CustomModal";
import { Button, Form, FormInstance, Input } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useRef } from "react";
import { useDebounceFn } from "ahooks";

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
  const doSubmit = useDebounceFn(
    (field) =>
      doCreatedConfigMap.run(selectedClusterId as number, field).then((res) => {
        if (res?.code === 0) {
          doGetConfigMaps(selectedClusterId as number);
          onChangeVisibleCreatedConfigMap(false);
        }
      }),
    { wait: 500 }
  ).run;

  return (
    <CustomModal
      visible={visibleCreatedConfigMap}
      title={`新增 configmap，当前集群为：${
        clusters.find((item) => item.id === selectedClusterId)?.clusterName
      }`}
      onCancel={() => onChangeVisibleCreatedConfigMap(false)}
      footer={
        <Button
          loading={doCreatedConfigMap.loading}
          onClick={() => configMapFormRef.current?.submit()}
          type={"primary"}
        >
          提交
        </Button>
      }
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        ref={configMapFormRef}
        onFinish={doSubmit}
      >
        <Form.Item label={"namespace"} name={"namespace"}>
          <Input placeholder={"请输入 namespace"} />
        </Form.Item>
        <Form.Item label={"configmap"} name={"configmapName"}>
          <Input placeholder={"请输入 configmap"} />
        </Form.Item>
      </Form>
    </CustomModal>
  );
};

export default ModalCreatedConfigMap;
