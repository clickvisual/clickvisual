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
      title={"新增配置空间"}
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
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 18 }}
        ref={configMapFormRef}
        onFinish={doSubmit}
      >
        <Form.Item label={"名称"} name={"configmapName"}>
          <Input />
        </Form.Item>
        <Form.Item label={"命名空间"} name={"namespace"}>
          <Input />
        </Form.Item>
      </Form>
    </CustomModal>
  );
};

export default ModalCreatedConfigMap;
