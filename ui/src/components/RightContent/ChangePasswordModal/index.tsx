import { Form, FormInstance, Input, message, Modal } from "antd";
import { useEffect, useRef } from "react";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import CryptoJs from "crypto-js";

const ChangePasswordModal = () => {
  const i18n = useIntl();
  const resetFormRef = useRef<FormInstance>(null);
  const { currentUser } = useModel("@@initialState").initialState || {};
  const { loginOut, actionPassword } = useModel("users");
  const {
    visibleChangePassword,
    doChangePassword,
    onChangeVisibleChangePassword,
  } = actionPassword;

  const handleCancel = () => {
    onChangeVisibleChangePassword(false);
  };

  const handleSubmit = useDebounceFn(
    (field: any) => {
      const hideMessage = message.loading(
        {
          content: i18n.formatMessage({ id: "password.loading" }),
          key: "change",
        },
        0
      );
      if (!currentUser) return;
      doChangePassword
        .run(currentUser.id, {
          password: CryptoJs.MD5(field.password).toString(),
          newPassword: CryptoJs.MD5(field.newPassword).toString(),
          confirmNew: CryptoJs.MD5(field.confirmNew).toString(),
        })
        .then((res) => {
          if (res?.code !== 0) {
            hideMessage();
            return;
          }
          handleCancel();
          message.success(
            {
              content: i18n.formatMessage({ id: "password.success" }),
              key: "change",
            },
            3
          );
          loginOut.run();
        })
        .catch(() => {
          hideMessage();
        });
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  const isChinese = localStorage.getItem("umi_locale") === "zh-CN";

  useEffect(() => {
    if (!actionPassword.visibleChangePassword && resetFormRef.current) {
      resetFormRef.current.resetFields();
    }
  }, [actionPassword.visibleChangePassword]);

  return (
    <Modal
      width={700}
      confirmLoading={doChangePassword.loading}
      title={i18n.formatMessage({ id: "password.title" })}
      visible={visibleChangePassword}
      bodyStyle={{ paddingBottom: 0 }}
      onCancel={handleCancel}
      onOk={() => resetFormRef.current?.submit()}
    >
      <Form
        labelCol={{ span: isChinese ? 4 : 5 }}
        wrapperCol={{ span: isChinese ? 20 : 19 }}
        ref={resetFormRef}
        onFinish={handleSubmit}
      >
        <Form.Item
          label={i18n.formatMessage({ id: "password.change.old" })}
          name={"password"}
          rules={[
            {
              required: true,
              validator: async (_, value) => {
                if (!resetFormRef.current) return;
                if (!value || value === "") {
                  return Promise.reject(
                    i18n.formatMessage({ id: "password.placeholder.old" })
                  );
                }
                if (value && value !== "" && value.length < 5) {
                  return Promise.reject(
                    i18n.formatMessage({ id: "password.rule.min" })
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.Password
            maxLength={32}
            minLength={5}
            placeholder={`${i18n.formatMessage({
              id: "password.placeholder.old",
            })}`}
            iconRender={(visible) =>
              visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "password.change.new" })}
          name={"newPassword"}
          rules={[
            {
              required: true,
              validator: async (_, value) => {
                if (!resetFormRef.current) return;
                if (!value || value === "") {
                  return Promise.reject(
                    i18n.formatMessage({ id: "password.placeholder.new" })
                  );
                }
                if (value && value !== "" && value.length < 5) {
                  return Promise.reject(
                    i18n.formatMessage({ id: "password.rule.min" })
                  );
                }
                if (
                  value !== resetFormRef.current.getFieldValue("confirmNew")
                ) {
                  i18n.formatMessage({ id: "password.rule.match" });
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.Password
            maxLength={32}
            minLength={5}
            placeholder={`${i18n.formatMessage({
              id: "password.placeholder.old",
            })}`}
            iconRender={(visible) =>
              visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "password.change.confirm" })}
          name={"confirmNew"}
          rules={[
            {
              required: true,
              validator: async (_, value) => {
                if (!resetFormRef.current) return;
                if (!value || value === "") {
                  return Promise.reject(
                    i18n.formatMessage({ id: "password.placeholder.confirm" })
                  );
                }
                if (value && value !== "" && value.length < 5) {
                  return Promise.reject(
                    i18n.formatMessage({ id: "password.rule.min" })
                  );
                }
                if (
                  value !== resetFormRef.current.getFieldValue("newPassword")
                ) {
                  return Promise.reject(
                    i18n.formatMessage({ id: "password.rule.match" })
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.Password
            maxLength={32}
            minLength={5}
            placeholder={`${i18n.formatMessage({
              id: "password.placeholder.old",
            })}`}
            iconRender={(visible) =>
              visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default ChangePasswordModal;
