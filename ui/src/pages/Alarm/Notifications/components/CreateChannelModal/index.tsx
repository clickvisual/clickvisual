import { Form, FormInstance, message, Modal, Button } from "antd";
import { useEffect, useRef } from "react";
import ChannelFormItems, {
  ChannelFormType,
} from "@/pages/Alarm/Notifications/components/ChannelFormItems";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import IconFont from "@/components/IconFont";
import { SaveOutlined } from "@ant-design/icons";

type CreateChannelProps = {
  loadList: () => void;
};
const CreateChannelModal = ({ loadList }: CreateChannelProps) => {
  const formRef = useRef<FormInstance>(null);
  const i18n = useIntl();
  const { alarmChannelModal, alarmChannel } = useModel("alarm");
  const { doCreatedChannel, doSendTestToChannel } = alarmChannel;
  const { visibleCreate, setVisibleCreate } = alarmChannelModal;
  const testFlagRef = useRef(false);
  const onCancel = () => {
    setVisibleCreate(false);
  };

  const onFinish = (fields: ChannelFormType) => {
    if (testFlagRef.current) {
      sendTest(fields);
      testFlagRef.current = false;
      return;
    }
    doCreatedChannel.run(fields).then((res) => {
      if (res?.code === 0) {
        onCancel();
        message.success(
          i18n.formatMessage({ id: "alarm.notify.created.success" })
        );
        loadList();
      }
    });
  };

  const testNotify = () => {
    testFlagRef.current = true;
    formRef.current?.submit();
  };
  const sendTest = (fields: ChannelFormType) => {
    doSendTestToChannel.run(fields).then((res) => {
      if (res?.code === 0) {
        message.success(
          i18n.formatMessage({ id: "alarm.notify.sendTest.success" })
        );
      }
    });
  };

  useEffect(() => {
    if (!visibleCreate) formRef.current?.resetFields();
  }, [visibleCreate]);

  return (
    <Modal
      title={i18n.formatMessage({ id: "alarm.notify.modal.created" })}
      visible={visibleCreate}
      width={700}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          {i18n.formatMessage({ id: "button.cancel" })}
        </Button>,
        <Button
          key="test"
          icon={<IconFont type={"icon-alert-test"} />}
          loading={doSendTestToChannel.loading}
          onClick={testNotify}
        >
          {i18n.formatMessage({ id: "button.test" })}
        </Button>,

        <Button
          key="submit"
          type={"primary"}
          icon={<SaveOutlined />}
          loading={doCreatedChannel.loading}
          onClick={() => formRef.current?.submit()}
        >
          {i18n.formatMessage({ id: "button.ok" })}
        </Button>,
      ]}
    >
      <Form
        ref={formRef}
        labelCol={{ span: 3 }}
        wrapperCol={{ span: 20 }}
        onFinish={onFinish}
      >
        <ChannelFormItems />
      </Form>
    </Modal>
  );
};
export default CreateChannelModal;
