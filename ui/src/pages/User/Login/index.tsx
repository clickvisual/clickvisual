import loginStyles from '@/pages/User/Login/index.less';
import LoginFooter from '@/pages/User/Login/Footer';
import LoginContext from '@/pages/User/Login/Context';
type LoginProps = {};
const Login = (props: LoginProps) => {
  return (
    <div className={loginStyles.loginMain}>
      <div className={loginStyles.loginTitle}>登&nbsp;&nbsp;录</div>
      <LoginContext />
      <LoginFooter />
    </div>
  );
};
export default Login;
