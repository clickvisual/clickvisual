import loginContextStyles from "@/pages/User/Login/Context/index.less";
import { Button, Form, Input } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import CryptoJs from "crypto-js";
import { useIntl } from "umi";

const LoginContext = (s) => {
  const [loginForm] = Form.useForm();
  const { loginByPassword } = useModel("users");
  const i18n = useIntl();

  return (
    <div className={loginContextStyles.loginContextMain}>
      <Form
        className={loginContextStyles.formMain}
        form={loginForm}
        autoComplete="off"
        onFinish={(field) => {
          const user = {
            ...field,
            password: CryptoJs.MD5(field.password).toString(),
          };
          loginByPassword.run(user);
        }}
      >
        <Form.Item
          label={i18n.formatMessage({
            id: "login.username",
          })}
          name={"username"}
          rules={[
            { required: true },
            {
              validator: (_, value) => {
                if (!value) {
                  return Promise.reject();
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "login.username.placeholder",
            })}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "login.password",
          })}
          name={"password"}
          rules={[
            { required: true },
            {
              validator: (_, value) => {
                if (!value) {
                  return Promise.reject();
                }
                // if (ValidatePassword(value)) {
                //   return Promise.reject(ValidatePassword(value));
                // }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.Password
            placeholder={i18n.formatMessage({
              id: "login.password.placeholder",
            })}
            allowClear
          />
        </Form.Item>
        <Form.Item noStyle>
          <Button
            loading={loginByPassword.loading}
            className={loginContextStyles.formBtn}
            type={"primary"}
            htmlType={"submit"}
          >
            {i18n.formatMessage({
              id: "login.button",
            })}
          </Button>
        </Form.Item>
      </Form>
      {/* <div className={loginContextStyles.loginNote}> */}
      {/*   <span>注：</span> */}
      {/*   <ol> */}
      {/*     {loginNotes.map((item, index) => ( */}
      {/*       <li key={index}> */}
      {/*         <span>{`${item.msg}；`}</span> */}
      {/*       </li> */}
      {/*     ))} */}
      {/*   </ol> */}
      {/* </div> */}
    </div>
  );
};

export default LoginContext;
