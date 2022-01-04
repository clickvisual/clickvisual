import loginFooterStyles from '@/pages/User/Login/Footer/index.less';
import IconFont from '@/components/IconFont';
import { Button } from 'antd';

type LoginFooterProps = {};
const LoginFooter = (props: LoginFooterProps) => {
  const thirdPartyChannels = [{ name: 'Gitlab' }, { name: 'GitHub' }];
  return (
    <div className={loginFooterStyles.loginFooterMain}>
      <div className={loginFooterStyles.dividerMain}>
        <div className={loginFooterStyles.left} />
        <div className={loginFooterStyles.context}>or</div>
        <div className={loginFooterStyles.right} />
      </div>
      <div className={loginFooterStyles.thirdPartyMain}>
        {thirdPartyChannels.map((channel, index) => (
          <div key={index} className={loginFooterStyles.thirdPartyIconModel}>
            <Button
              onClick={() => {
                window.open(`/api/admin/login/${channel.name.toLowerCase()}`, '_blank');
              }}
              className={loginFooterStyles.thirdPartyBtn}
              icon={<IconFont type={`icon-${channel.name}`} />}
            >
              <span>{`使用 ${channel.name} 登录`}</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default LoginFooter;
