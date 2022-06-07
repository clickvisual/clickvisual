import { Form, FormInstance, message, Modal,Button } from "antd";
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
  const { doCreatedChannel,doSendTestToChannel } = alarmChannel;
  const { visibleCreate, setVisibleCreate } = alarmChannelModal;
  const testFlagRef= useRef(false);
  const onCancel = () => {
    setVisibleCreate(false);
  };
  const tailLayout = {
    wrapperCol: { offset: 8, span: 16 },
  };
  const onFinish = (fields: ChannelFormType) => {
    if (testFlagRef.current){
      sendTest(fields)
      testFlagRef.current=false
      return
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

  const testNotify=()=>{
    testFlagRef.current=true
    formRef.current?.submit()
  }
  const sendTest=(fields: ChannelFormType)=>{
    doSendTestToChannel.run(fields).then((res) => {
      if (res?.code === 0) {
        message.success(
          i18n.formatMessage({ id: "alarm.notify.sendTest.success" })
        );
      }
    });
  }

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
        <Form.Item label="operation">
        <Button onClick={e=>testNotify()}>{i18n.formatMessage({ id: "alarm.notify.button.test" })}</Button>
       
      </Form.Item>
      </Form>
     
    </Modal>
  );
};
export default CreateChannelModal;
