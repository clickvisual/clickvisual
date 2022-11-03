import { Form, FormInstance, Input, message, Modal, Select } from "antd";
import { useEffect, useRef } from "react";
import { useIntl, useModel } from "umi";

const { Option } = Select;

const CreateMetricsAamples = (props: {
  visible: boolean;
  onChangeVisible: (flag: boolean) => void;
  currentIidAndIName: {
    iid: number;
    instanceName: string;
  };
  currentClusters: string[];
  onGetList: () => void;
}) => {
  const i18n = useIntl();
  const {
    visible,
    onChangeVisible,
    currentIidAndIName,
    currentClusters,
    onGetList,
  } = props;
  const metricsAamplesRef = useRef<FormInstance>(null);

  const { doCreateMetricsSamplesTable } = useModel(
    "alarms.useAlarmEnvironment"
  );

  const handleFinish = (file: { iid: number; cluster: string }) => {
    doCreateMetricsSamplesTable.run(file).then((res: any) => {
      if (res.code != 0) return;
      message.success("success");
      onChangeVisible(false);
      onGetList();
    });
  };

  useEffect(() => {
    if (visible) {
      metricsAamplesRef.current?.setFieldsValue({
        iid: currentIidAndIName.iid,
        instanceName: currentIidAndIName.instanceName,
      });
    } else {
      metricsAamplesRef.current?.resetFields();
    }
  }, [visible]);

  return (
    <Modal
      title={i18n.formatMessage(
        { id: "create.name" },
        {
          name: "metrics-samples",
        }
      )}
      visible={visible}
      onOk={() => metricsAamplesRef?.current?.submit()}
      onCancel={() => onChangeVisible(false)}
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        ref={metricsAamplesRef}
        onFinish={handleFinish}
      >
        <Form.Item hidden label={"iid"} name={"iid"}>
          <Input />
        </Form.Item>
        <Form.Item label={"instanceName"} name={"instanceName"}>
          <Input disabled />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "instance.form.title.cluster" })}
          name={"cluster"}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select
            placeholder={i18n.formatMessage(
              { id: "select.placeholder" },
              { name: "cluster" }
            )}
          >
            {currentClusters.map((item: any, index: number) => {
              return (
                <Option key={index} value={item}>
                  {item}
                </Option>
              );
            })}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreateMetricsAamples;
