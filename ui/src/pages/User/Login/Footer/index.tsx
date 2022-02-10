import loginFooterStyles from "@/pages/User/Login/Footer/index.less";
import IconFont from "@/components/IconFont";
import { Button } from "antd";
import { useIntl } from "umi";
import classNames from "classnames";
import { getLocale } from "@@/plugin-locale/localeExports";
import { LANG_CN } from "@/config/config";

const LoginFooter = () => {
  const i18n = useIntl();
  const thirdPartyChannels = [{ name: "Gitlab" }, { name: "GitHub" }];
  return (
    <div className={loginFooterStyles.loginFooterMain}>
      <div className={loginFooterStyles.dividerMain}>
        <div className={loginFooterStyles.left} />
        <div
          className={classNames(
            loginFooterStyles.context,
            getLocale() === LANG_CN && loginFooterStyles.contextZh
          )}
        >
          {i18n.formatMessage({
            id: "login.footer.divider",
          })}
        </div>
        <div className={loginFooterStyles.right} />
      </div>
      <div className={loginFooterStyles.thirdPartyMain}>
        {thirdPartyChannels.map((channel, index) => (
          <div key={index} className={loginFooterStyles.thirdPartyIconModel}>
            <Button
              onClick={() => {
                window.open(
                  `/api/admin/login/${channel.name.toLowerCase()}`,
                  "_self"
                );
              }}
              className={loginFooterStyles.thirdPartyBtn}
              icon={<IconFont type={`icon-${channel.name}`} />}
            >
              <span>
                {i18n.formatMessage({
                  id: `login.thirdParty.${channel.name.toLowerCase()}`,
                })}
              </span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default LoginFooter;
