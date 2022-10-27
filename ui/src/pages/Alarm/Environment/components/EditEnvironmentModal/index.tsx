import { Form, FormInstance, Input, message, Modal, Radio, Select } from "antd";
import { useEffect, useRef, useState } from "react";
import { useIntl, useModel } from "umi";
import { RuleStoreType } from "../..";

const { Option } = Select;

interface EditEnvironmentModalProps {
  visible: boolean;
  onChangeVisible: (flag: boolean) => void;
  editEnvironmentId: number;
}

const EditEnvironmentModal = (props: EditEnvironmentModalProps) => {
  const i18n = useIntl();
  const { visible, onChangeVisible, editEnvironmentId } = props;
  const formRef = useRef<FormInstance>(null);
  const [clusterList, setClusterList] = useState<any[]>([]);

  const { doGetAlarmConfigDetails, doPatchAlarmConfigDetails, getClusterList } =
    useModel("alarms.useAlarmEnvironment");

  useEffect(() => {
    if (visible && editEnvironmentId) {
      getClusterList.run({ pageSize: 100 }).then((res: any) => {
        if (res.code != 0) return;
        setClusterList(res.data);
      });
      doGetAlarmConfigDetails.run(editEnvironmentId).then((res: any) => {
        if (res.code != 0) return;
        formRef.current?.setFieldsValue({
          ...res.data,
          clusterId: res.data?.clusterId || undefined,
        });
      });
    }
  }, [visible]);

  return (
    <Modal
      title={i18n.formatMessage({ id: "alarm.environment.form.title" })}
      visible={visible}
      width={800}
      onCancel={() => onChangeVisible(false)}
      onOk={() => formRef.current?.submit()}
      confirmLoading={doGetAlarmConfigDetails.loading}
    >
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 16 }}
        ref={formRef}
        onFinish={(file: any) => {
          if (!editEnvironmentId) return;
          const data = {
            ...file,
            clusterId: file.clusterId ? parseInt(file.clusterId) : 0,
            ruleStoreType: file.ruleStoreType
              ? parseInt(file.ruleStoreType)
              : 0,
          };
          doPatchAlarmConfigDetails
            .run(editEnvironmentId, data)
            .then((res: any) => {
              if (res.code != 0) return;
              message.success("success");
            });
        }}
      >
        <Form.Item
          label={i18n.formatMessage({ id: "instance.form.title.cluster" })}
          name={"clusterId"}
        >
          <Select>
            {clusterList.map((item: any) => {
              return (
                <Option value={item.id} key={item.id}>
                  {item.description?.length > 0
                    ? item.clusterName + " | " + item.description
                    : item.clusterName}
                </Option>
              );
            })}
          </Select>
        </Form.Item>
        <Form.Item label={"configmap"} name={"configmap"}>
          <Input />
        </Form.Item>
        <Form.Item label={"filePath"} name={"filePath"}>
          <Input />
        </Form.Item>
        <Form.Item label={"namespace"} name={"namespace"}>
          <Input />
        </Form.Item>
        <Form.Item label={"prometheusTarget"} name={"prometheusTarget"}>
          <Input />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "alarm.environment.form.ruleStoreType",
          })}
          name={"ruleStoreType"}
        >
          <Radio.Group
            options={[
              {
                label: i18n.formatMessage({
                  id: "alarm.environment.form.notOpen",
                }),
                value: RuleStoreType.notOpen,
              },
              {
                label: "k8s",
                value: RuleStoreType.k8s,
              },
              {
                label: i18n.formatMessage({
                  id: "alarm.environment.RuleStoreType.file",
                }),
                value: RuleStoreType.file,
              },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default EditEnvironmentModal;
