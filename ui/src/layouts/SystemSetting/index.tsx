import systemSettingStyles from '@/layouts/SystemSetting/styles/index.less';
import type { ReactNode } from 'react';

type SystemSettingProps = {
  children: ReactNode;
};
const SystemSetting = (props: SystemSettingProps) => {
  const { children } = props;
  return <div className={systemSettingStyles.systemSettingMain}>{children}</div>;
};
export default SystemSetting;
