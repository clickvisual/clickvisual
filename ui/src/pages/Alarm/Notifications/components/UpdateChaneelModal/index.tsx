import { Form, FormInstance, message, Modal } from "antd";
import { useIntl } from "umi";
import { useEffect, useRef } from "react";
import ChannelFormItems, {
  ChannelFormType,
} from "@/pages/Alarm/Notifications/components/ChannelFormItems";
import { useModel } from "@@/plugin-model/useModel";

type UpdateChannelProps = {
  loadList: () => void;
};
const UpdateChannelModal = ({ loadList }: UpdateChannelProps) => {
  const formRef = useRef<FormInstance>(null);
  const i18n = useIntl();

  const { alarmChannelModal, alarmChannel } = useModel("alarm");
  const { doUpdatedChannel, currentChannel, setCurrentChannel } = alarmChannel;
  const { visibleUpdate, setVisibleUpdate } = alarmChannelModal;

  const onCancel = () => {
    setVisibleUpdate(false);
  };

  const onFinish = (fields: ChannelFormType) => {
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
