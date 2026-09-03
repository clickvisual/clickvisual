import { CheckRoot } from "@/services/pms";
import { Alert, Button, Empty, Spin } from "antd";
import { useEffect, useState } from "react";
import { history, useIntl } from "umi";
import styles from "./index.less";

const LogLibraryManagement = () => {
  const i18n = useIntl();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;
    CheckRoot()
      .then((res: any) => {
        if (!mounted) return;
        setAuthorized(res?.code === 0);
      })
      .catch(() => {
        if (mounted) setAuthorized(false);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return (
      <div className={styles.state}>
        <Spin tip={i18n.formatMessage({ id: "spin" })} />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className={styles.state}>
        <Alert
          type="warning"
          showIcon
          message={i18n.formatMessage({ id: "logLibraryManagement.forbidden" })}
        />
        <Button onClick={() => history.push("/query")}>
          {i18n.formatMessage({ id: "logLibraryManagement.backToQuery" })}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2>{i18n.formatMessage({ id: "logLibraryManagement.title" })}</h2>
          <span>
            {i18n.formatMessage({ id: "logLibraryManagement.description" })}
          </span>
        </div>
        <Button type="primary" disabled>
          {i18n.formatMessage({ id: "logLibraryManagement.create" })}
        </Button>
      </div>
      <div className={styles.content}>
        <Empty
          description={i18n.formatMessage({
            id: "logLibraryManagement.loadingList",
          })}
        />
      </div>
    </div>
  );
};

export default LogLibraryManagement;
