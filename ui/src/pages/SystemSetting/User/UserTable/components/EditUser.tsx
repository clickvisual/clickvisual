import { Form, FormInstance, Input, message, Modal } from "antd";
import { useEffect, useRef } from "react";
import { useIntl, useModel } from "umi";
import { EditUserInfoType } from "..";

const EditUser = ({
  open,
  editUserInfo,
  onChangeOpen,
  loadList,
}: {
  open: boolean;
  editUserInfo: EditUserInfoType | undefined;
  onChangeOpen: (flag: boolean) => void;
  loadList: (data: any) => void;
}) => {
  const userFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();
  const { sysUser } = useModel("system");
  const { doEditUserInfo } = sysUser;

  const handleSubmit = (file: EditUserInfoType) => {
    doEditUserInfo.run(file.uid, file).then((res: any) => {
      if (res.code == 0) {
        message.success(
          i18n.formatMessage({ id: "sys.user.form.editSuccess" })
        );
        onChangeOpen(false);
        loadList({});
      }
      console.log(res);
    });
  };

  useEffect(() => {
    if (!open) {
      userFormRef.current?.resetFields();
    }
  }, [open]);

  useEffect(() => {
    if (open && editUserInfo) {
      userFormRef.current?.setFieldsValue(editUserInfo);
    }
  }, [open, editUserInfo]);

  return (
    <Modal
      title={i18n.formatMessage({ id: "sys.user.form.eidtUser" })}
      visible={open}
      width={800}
      onOk={() => {
        userFormRef.current?.submit();
      }}
      onCancel={() => onChangeOpen(false)}
    >
      <Form
        ref={userFormRef}
        onFinish={handleSubmit}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 12 }}
      >
        <Form.Item hidden name="uid">
          <Input />
        </Form.Item>
        <Form.Item label={"nickname"} name={"nickname"} required>
          <Input
            placeholder={i18n.formatMessage(
              { id: "input.placeholder" },
              {
                name: "nikename",
              }
            )}
          />
        </Form.Item>
        <Form.Item label={"phone"} name={"phone"}>
          <Input
            placeholder={i18n.formatMessage(
              { id: "input.placeholder" },
              {
                name: "phone",
              }
            )}
          />
        </Form.Item>
        <Form.Item label={"email"} name={"email"}>
          <Input
            placeholder={i18n.formatMessage(
              { id: "input.placeholder" },
              {
                name: "email",
              }
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default EditUser;
