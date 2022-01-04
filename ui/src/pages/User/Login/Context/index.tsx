import loginContextStyles from '@/pages/User/Login/Context/index.less';
import { Button, Form, Input } from 'antd';
import { useModel } from '@@/plugin-model/useModel';
import CryptoJs from 'crypto-js';

type LoginContextProps = {};
const LoginContext = (props: LoginContextProps) => {
  const [loginForm] = Form.useForm();
  const { loginByPassword } = useModel('users');

  return (
    <div className={loginContextStyles.loginContextMain}>
      <Form
        className={loginContextStyles.formMain}
        form={loginForm}
        autoComplete="off"
        onFinish={(field) => {
          const user = { ...field, password: CryptoJs.MD5(field.password).toString() };
          loginByPassword.run(user);
        }}
      >
        <Form.Item
          label={'账号'}
          name={'username'}
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
          <Input placeholder="请输入你的登录账号" />
        </Form.Item>
        <Form.Item
          label={'密码'}
          name={'password'}
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
          <Input.Password placeholder="请输入你的登录密码" allowClear />
        </Form.Item>
        <Form.Item noStyle>
          <Button
            loading={loginByPassword.loading}
            className={loginContextStyles.formBtn}
            type={'primary'}
            htmlType={'submit'}
          >
            登录
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
