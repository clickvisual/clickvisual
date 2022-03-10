import { Form, FormInstance, message, Modal } from "antd";
import { useEffect, useRef } from "react";
import ChannelFormItems, {
  ChannelFormType,
} from "@/pages/Alarm/Notifications/components/ChannelFormItems";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";

type CreateChannelProps = {
  loadList: () => void;
};
const CreateChannelModal = ({ loadList }: CreateChannelProps) => {
  const formRef = useRef<FormInstance>(null);
  const i18n = useIntl();
  const { alarmChannelModal, alarmChannel } = useModel("alarm");
  const { doCreatedChannel } = alarmChannel;
  const { visibleCreate, setVisibleCreate } = alarmChannelModal;

  const onCancel = () => {
    setVisibleCreate(false);
  };

  const onFinish = (fields: ChannelFormType) => {
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

  useEffect(() => {
    if (!visibleCreate) formRef.current?.resetFields();
  }, [visibleCreate]);

  return (
    <Modal
      title={i18n.formatMessage({ id: "alarm.notify.modal.created" })}
      visible={visibleCreate}
      width={700}
      onCancel={onCancel}
      onOk={() => formRef.current?.submit()}
      confirmLoading={doCreatedChannel.loading}
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
