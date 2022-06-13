import { Button, Form, FormInstance, message, Modal } from "antd";
import { useIntl } from "umi";
import { useEffect, useRef } from "react";
import ChannelFormItems, {
  ChannelFormType,
} from "@/pages/Alarm/Notifications/components/ChannelFormItems";
import { useModel } from "@@/plugin-model/useModel";
import IconFont from "@/components/IconFont";
import { SaveOutlined } from "@ant-design/icons";

type UpdateChannelProps = {
  loadList: () => void;
};
const UpdateChannelModal = ({ loadList }: UpdateChannelProps) => {
  const formRef = useRef<FormInstance>(null);
  const i18n = useIntl();

  const { alarmChannelModal, alarmChannel } = useModel("alarm");
  const {
    doUpdatedChannel,
    currentChannel,
    setCurrentChannel,
    doCreatedChannel,
    doSendTestToChannel,
  } = alarmChannel;
  const { visibleUpdate, setVisibleUpdate } = alarmChannelModal;
  const testFlagRef = useRef(false);

  const onCancel = () => {
    setVisibleUpdate(false);
  };

  const onFinish = (fields: ChannelFormType) => {
    if (testFlagRef.current) {
      sendTest(fields);
      testFlagRef.current = false;
      return;
    }
    if (!currentChannel) return;
    doUpdatedChannel.run(currentChannel.id, fields).then((res) => {
      if (res?.code !== 0) return;
      onCancel();
      message.success(
        i18n.formatMessage({ id: "alarm.notify.updated.success" })
      );
      loadList();
    });
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

  const testNotify = () => {
    testFlagRef.current = true;
    formRef.current?.submit();
  };

  useEffect(() => {
    if (visibleUpdate && currentChannel) {
      formRef.current?.setFieldsValue(currentChannel);
    }
  }, [visibleUpdate, currentChannel]);
  useEffect(() => {
    if (!visibleUpdate) {
      setCurrentChannel(undefined);
      formRef.current?.resetFields();
    }
  }, [visibleUpdate]);

  return (
    <Modal
      title={i18n.formatMessage({ id: "alarm.notify.modal.updated" })}
      visible={visibleUpdate}
      width={700}
      onCancel={onCancel}
      onOk={() => formRef.current?.submit()}
      confirmLoading={doUpdatedChannel.loading}
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
export default UpdateChannelModal;
