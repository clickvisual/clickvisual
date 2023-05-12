import { reqRootUids } from "@/services/pms";
import { Form, message, Modal } from "antd";
import React, { useEffect, useState } from "react";
import { useIntl } from "umi";
import UserSelect from "../UserSelect";
interface ListFormProps {
  modalVisible: boolean;
  formTitle: string;
  initialValues: { state: number };
  onSubmit: () => void;
  onCancel: () => void;
}

const formLayout = {
  labelCol: { span: 7 },
  wrapperCol: { span: 13 },
};

const RootUsersForm: React.FC<ListFormProps> = (props) => {
  const { modalVisible, onCancel, onSubmit, initialValues, formTitle } = props;
  const [form] = Form.useForm();
  const [currentRootUsers, setCurrentRootUsers] = useState(undefined);
  const i18n = useIntl();
  const fetchRootUids = () => {
    reqRootUids().then((r) => {
      if (r.code !== 0) {
        message.error(`${r.msg}`);
        return;
      }
      setCurrentRootUsers(r.data);
    });
  };

  useEffect(() => {
    if (form && !modalVisible) {
      form.resetFields();
    } else {
      fetchRootUids();
    }
  }, [modalVisible]);

  useEffect(() => {
    if (initialValues) {
      let state = "0";
      if (initialValues.state === 1) {
        state = "1";
      }
      form.setFieldsValue({
        ...initialValues,
        state: state,
      });
    }
  }, [initialValues]);

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
      onCancel={() => onCancel()}
      {...modalFooter}
      width={800}
    >
      {currentRootUsers && (
        <Form
          {...formLayout}
          form={form}
          onFinish={onSubmit}
          scrollToFirstError
          initialValues={currentRootUsers}
        >
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
      )}
    </Modal>
  );
};

export default RootUsersForm;
