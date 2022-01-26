import userCardHeaderStyles from "@/layouts/User/UserCardHeader/index.less";
import { useIntl } from "umi";

type UserCardHeaderProps = {};
const UserCardHeader = (props: UserCardHeaderProps) => {
  const i18n = useIntl();
  return (
    <div className={userCardHeaderStyles.userCardHeaderMain}>
      <div className={userCardHeaderStyles.title}>
        <span>
          {i18n.formatMessage({
            id: "login.header",
          })}
        </span>
      </div>
    </div>
  );
};
export default UserCardHeader;
