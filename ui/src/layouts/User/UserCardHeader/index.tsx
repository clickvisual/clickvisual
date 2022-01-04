import userCardHeaderStyles from '@/layouts/User/UserCardHeader/index.less';

type UserCardHeaderProps = {};
const UserCardHeader = (props: UserCardHeaderProps) => {
  return (
    <div className={userCardHeaderStyles.userCardHeaderMain}>
      <div className={userCardHeaderStyles.title}>
        <span>Welcome to MOGO</span>
      </div>
    </div>
  );
};
export default UserCardHeader;
