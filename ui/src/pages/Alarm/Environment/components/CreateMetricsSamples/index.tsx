import { Form, FormInstance, Input, message, Modal, Select } from "antd";
import { useEffect, useRef } from "react";
import { useIntl, useModel } from "umi";

const { Option } = Select;

const CreateMetricsSamples = (props: {
  open: boolean;
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
    open,
    onChangeVisible,
    currentIidAndIName,
    currentClusters,
    onGetList,
  } = props;
  const metricsSamplesRef = useRef<FormInstance>(null);

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
    if (open) {
      metricsSamplesRef.current?.setFieldsValue({
        iid: currentIidAndIName.iid,
        instanceName: currentIidAndIName.instanceName,
      });
    } else {
      metricsSamplesRef.current?.resetFields();
    }
  }, [open]);

  return (
    <Modal
      title={i18n.formatMessage(
        { id: "create.name" },
        {
          name: "metrics-samples",
        }
      )}
      open={open}
      onOk={() => metricsSamplesRef?.current?.submit()}
      onCancel={() => onChangeVisible(false)}
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        ref={metricsSamplesRef}
        onFinish={handleFinish}
      >
        <Form.Item hidden label={"iid"} name={"iid"}>
          <Input />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.from.newLogLibrary.instance",
          })}
          name={"instanceName"}
        >
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
export default CreateMetricsSamples;
