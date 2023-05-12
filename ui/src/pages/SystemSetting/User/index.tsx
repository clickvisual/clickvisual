import { getUserListType } from "@/services/systemUser";
import { Button, message, notification } from "antd";
import copy from "copy-to-clipboard";
import { useEffect, useState } from "react";
import { useIntl, useModel } from "umi";
import CreateUser from "./CreateUser";
import styles from "./index.less";
import UserFilter from "./UserFilter";
import UserTable from "./UserTable";

export interface userListType {
  avatar: string;
  email: string;
  nickname: string;
  uid: number;
  username: string;
  phone: string;
}

interface currentPaginationType {
  current: number;
  pageSize: number;
}

interface userObjType {
  total: number;
  list: userListType[];
}

const User = () => {
  const i18n = useIntl();
  const [userObj, setUserObj] = useState<userObjType>({ total: 0, list: [] });
  const [username, setUsername] = useState<string>("");
  const [visibleCreateUser, setVisibleCreateUser] = useState<boolean>(false);
  const [currentPagination, setCurrentPagination] =
    useState<currentPaginationType>({
      current: 1,
      pageSize: 10,
    });

  const { sysUser } = useModel("system");
  const { doGetUserList } = sysUser;

  const getList = (data: getUserListType) => {
    doGetUserList
      .run({
        username: data?.username || username,
        current: data?.current || currentPagination.current,
        pageSize: data?.pageSize || currentPagination.pageSize,
      })
      .then((res: any) => {
        if (res.code != 0) return;
        setUserObj(res.data);
      });
  };

  const copyInformation = (res: any, title: string) => {
    const btn = (
      <Button
        type="primary"
        size="small"
        onClick={() => {
          copy(`username: ${res.data.username}
password: ${res.data.password}`);
          message.success({
            style: { zIndex: 1011 },
            content: i18n.formatMessage({ id: "log.item.copy.success" }),
          });
        }}
      >
        {i18n.formatMessage({ id: "sys.user.allCopy" })}
      </Button>
    );

    const description = (
      <>
        <div>username: {res.data.username}</div>
        <div>password: {res.data.password}</div>
      </>
    );
    notification.open({
      message: title,
      placement: "top",
      description,
      duration: null,
      btn,
    });
  };

  useEffect(() => {
    getList({
      ...currentPagination,
      username: username,
    });
  }, []);

  return (
    <div className={styles.user}>
      <div className={styles.filterBox}>
        <UserFilter
          setUsername={setUsername}
          onGetList={getList}
          setVisibleCreateUser={setVisibleCreateUser}
        />
      </div>
      <div className={styles.userTable}>
        <UserTable
          dataObj={userObj}
          loadList={getList}
          currentPagination={currentPagination}
          setCurrentPagination={setCurrentPagination}
          copyInformation={copyInformation}
        />
      </div>
      <CreateUser
        visibleCreateUser={visibleCreateUser}
        setVisibleCreateUser={setVisibleCreateUser}
        getList={getList}
        copyInformation={copyInformation}
      />
    </div>
  );
};

export default User;
