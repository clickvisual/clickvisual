import { LogoutOutlined } from '@ant-design/icons';
import { Avatar, Menu, Spin } from 'antd';
import HeaderDropdown from '../HeaderDropdown';
import styles from './index.less';
import { useModel } from '@@/plugin-model/useModel';

const AvatarDropdown = () => {
  const { currentUser } = useModel('@@initialState').initialState || {};
  const { loginOut } = useModel('users');

  const handleLogout = () => {
    loginOut.run();
  };

  const menuHeaderDropdown = (
    <Menu className={styles.menu} selectedKeys={[]}>
      <Menu.Item key="logout" onClick={() => handleLogout()}>
        <LogoutOutlined />
        退出登录
      </Menu.Item>
    </Menu>
  );
  return currentUser && currentUser.nickname ? (
    <HeaderDropdown overlay={menuHeaderDropdown}>
      <span className={`${styles.action} ${styles.account}`}>
        <Avatar
          size="small"
          className={styles.avatar}
          src={currentUser?.avatar || undefined}
          alt={currentUser?.nickname}
        >
          {currentUser?.nickname}
        </Avatar>
        <span className={`${styles.name} anticon`}>{currentUser.nickname}</span>
      </span>
    </HeaderDropdown>
  ) : (
    <span className={`${styles.action} ${styles.account}`}>
      <Spin
        size="small"
        style={{
          marginLeft: 8,
          marginRight: 8,
        }}
      />
    </span>
  );
};

export default AvatarDropdown;
