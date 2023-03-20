import { getUserListType } from "@/services/systemUser";
import { Form, FormInstance, Input, Modal } from "antd";
import { useEffect, useRef } from "react";
import { useIntl, useModel } from "umi";

export interface CreateUserType {
  visibleCreateUser: boolean;
  setVisibleCreateUser: (flag: boolean) => void;
  getList: (data: getUserListType) => void;
  copyInformation: (res: any, title: string) => void;
}

const CreateUser = (props: CreateUserType) => {
  const i18n = useIntl();
  const { visibleCreateUser, setVisibleCreateUser, getList, copyInformation } =
    props;
  const resetFormRef = useRef<FormInstance>(null);

  const { sysUser } = useModel("system");
  const { doCreateUser } = sysUser;

  const handleSubmit = (file: { username: string; nickname: string }) => {
    doCreateUser.run(file).then((res: any) => {
      if (res.code != 0) return;
      getList({});
      copyInformation(res, i18n.formatMessage({ id: "models.pms.create.suc" }));
      setVisibleCreateUser(false);
    });
  };

  useEffect(() => {
    !visibleCreateUser && resetFormRef.current?.resetFields();
  }, [visibleCreateUser]);

  return (
    <Modal
      title={i18n.formatMessage({ id: "sys.user.createUser" })}
      open={visibleCreateUser}
      width={800}
      onOk={() => resetFormRef.current?.submit()}
      onCancel={() => setVisibleCreateUser(false)}
    >
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 15 }}
        ref={resetFormRef}
        onFinish={handleSubmit}
      >
        <Form.Item
          label={i18n.formatMessage({ id: "sys.user.username" })}
          name={"username"}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "sys.user.nickname" })}
          name={"nickname"}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreateUser;
