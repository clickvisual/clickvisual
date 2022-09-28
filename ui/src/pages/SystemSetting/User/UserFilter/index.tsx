import { getUserListType } from "@/services/systemUser";
import { Button, Input, Space } from "antd";
import { useIntl } from "umi";
import styles from "./index.less";

export interface UserFilterType {
  setUsername: (str: string) => void;
  onGetList: (data: getUserListType) => void;
  setVisibleCreateUser: (falg: boolean) => void;
}

const UserFilter = (props: UserFilterType) => {
  const i18n = useIntl();
  const { setUsername, onGetList, setVisibleCreateUser } = props;

  return (
    <div className={styles.userFilter}>
      <div className={styles.search}>
        <Space>
          <div>
            {i18n.formatMessage({
              id: "bigdata.dataSourceManage.create.userName",
            })}
          </div>
          <Input
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          />
          <Button
            type="primary"
            onClick={() => {
              onGetList({});
            }}
          >
            {i18n.formatMessage({ id: "search" })}
          </Button>
        </Space>
      </div>
      <div className={styles.item}>
        <Button onClick={() => setVisibleCreateUser(true)}>
          {i18n.formatMessage({ id: "create" })}
        </Button>
      </div>
    </div>
  );
};
export default UserFilter;
