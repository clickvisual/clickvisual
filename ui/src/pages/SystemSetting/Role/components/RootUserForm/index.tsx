import { reqRootUids } from "@/services/pms";
import { Form, message, Modal } from "antd";
import React, { useEffect } from "react";
import { useIntl } from "umi";
import UserSelect from "../UserSelect";
interface ListFormProps {
  modalVisible: boolean;
  formTitle: string;
  onSubmit: () => void;
  onCancel: () => void;
}

const formLayout = {
  labelCol: { span: 7 },
  wrapperCol: { span: 13 },
};

const RootUsersForm: React.FC<ListFormProps> = (props) => {
  const { modalVisible, onCancel, onSubmit, formTitle } = props;
  const [form] = Form.useForm();
  const i18n = useIntl();
  const fetchRootUids = () => {
    reqRootUids().then((r) => {
      if (r.code !== 0) {
        message.error(`${r.msg}`);
        return;
      }
      form.setFieldsValue(r.data);
    });
  };

  useEffect(() => {
    if (form && !modalVisible) {
      form.resetFields();
    } else {
      fetchRootUids();
    }
  }, [modalVisible]);

  const handleSubmit = () => {
    if (!form) return;
    form.submit();
  };

  const modalFooter = {
    okText: i18n.formatMessage({ id: "button.save" }),
    onOk: handleSubmit,
    onCancel,
  };

  return (
    <Modal
      destroyOnClose
      title={formTitle}
      open={modalVisible}
      {...modalFooter}
      width={800}
    >
      <Form {...formLayout} form={form} onFinish={onSubmit} scrollToFirstError>
        <Form.Item
          style={{ marginRight: 10 }}
          label={i18n.formatMessage({
            id: "systemSetting.role.rootUserForm.superAdministrator",
          })}
          name="root_uids"
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "systemSetting.role.rootUserForm.superAdministrator.rules",
              }),
            },
          ]}
        >
          <UserSelect multiple mode={"list"} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RootUsersForm;
