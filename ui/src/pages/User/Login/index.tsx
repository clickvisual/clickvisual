import LoginContext from "@/pages/User/Login/Context";
import LoginFooter from "@/pages/User/Login/Footer";
import loginStyles from "@/pages/User/Login/index.less";
import { useModel } from "@umijs/max";
import { useEffect } from "react";
import { useIntl } from "umi";

const Login = () => {
  const i18n = useIntl();
  const { doEnvironmentalAudit } = useModel("install");
  const { currentUser } = useModel("@@initialState").initialState || {};

  useEffect(() => {
    if (!currentUser) doEnvironmentalAudit.run();
  }, []);
  return (
    <div className={loginStyles.loginMain}>
      <div className={loginStyles.loginTitle}>
        {i18n.formatMessage({
          id: "login.title",
        })}
      </div>
      <LoginContext />
      <LoginFooter />
    </div>
  );
};
export default Login;
