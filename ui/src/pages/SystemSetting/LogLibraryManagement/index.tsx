import ModalCreatedLogLibrary from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import api, { DatabaseResponse } from "@/services/dataLogs";
import { CheckRoot } from "@/services/pms";
import systemSettingApi, { InstanceType } from "@/services/systemSetting";
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useModel } from "@umijs/max";
import {
  Alert,
  Button,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Spin,
  Table,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { history, useIntl } from "umi";
import styles from "./index.less";

const LogLibraryManagement = () => {
  const i18n = useIntl();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [instances, setInstances] = useState<InstanceType[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<number>();
  const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<number>();
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const {
    onChangeAddLogToDatabase,
    onChangeLogLibraryCreatedModalVisible,
    doDeletedLogLibrary,
  } = useModel("dataLogs");

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await systemSettingApi.getAllInstances();
      if (res?.code !== 0) {
        message.error(
          res?.msg ||
            i18n.formatMessage({ id: "logLibraryManagement.loadError" })
        );
        return;
      }
      const list = res?.data || [];
      setInstances(list);
      const flattened: any[] = [];
      list.forEach((instance: any) => {
        (instance.databases || []).forEach((database: any) => {
          (database.tables || []).forEach((table: any) => {
            flattened.push({
              ...table,
              iid: instance.id,
              instanceName: instance.name || instance.instanceName,
              databaseId: database.id,
              databaseName: database.databaseName || database.name,
            });
          });
        });
      });
      setRows(flattened);
    } catch (e) {
      message.error(
        i18n.formatMessage({ id: "logLibraryManagement.loadError" })
      );
    } finally {
      setLoading(false);
    }
  }, [i18n]);

  useEffect(() => {
    if (authorized) loadData();
  }, [authorized, loadData]);

  const fetchDatabases = useCallback(
    async (iid?: number) => {
      setSelectedDatabase(undefined);
      if (!iid) {
        setDatabases([]);
        return;
      }
      try {
        const res: any = await api.getDatabaseList(iid);
        if (res?.code !== 0) {
          message.error(
            res?.msg ||
              i18n.formatMessage({ id: "logLibraryManagement.loadError" })
          );
          return;
        }
        setDatabases(res.data || []);
      } catch (error) {
        message.error(
          i18n.formatMessage({ id: "logLibraryManagement.loadError" })
        );
      }
    },
    [i18n]
  );

  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      if (selectedInstance && row.iid !== selectedInstance) return false;
      if (selectedDatabase && row.databaseId !== selectedDatabase) return false;
      if (!q) return true;
      return [row.tableName, row.desc, row.instanceName, row.databaseName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [rows, selectedInstance, selectedDatabase, keyword]);

  const confirmDelete = (record: any) => {
    Modal.confirm({
      title: i18n.formatMessage({ id: "logLibraryManagement.delete.title" }),
      content: i18n.formatMessage(
        { id: "logLibraryManagement.delete.content" },
        {
          instance: record.instanceName,
          database: record.databaseName,
          name: record.tableName,
        }
      ),
      okButtonProps: { danger: true },
      okText: i18n.formatMessage({ id: "button.ok" }),
      cancelText: i18n.formatMessage({ id: "button.cancel" }),
      onOk: async () => {
        try {
          const res = await doDeletedLogLibrary.run(record.id);
          if (res?.code !== 0) {
            message.error(
              res?.msg ||
                i18n.formatMessage({ id: "logLibraryManagement.delete.error" })
            );
            return;
          }
          message.success(
            i18n.formatMessage({ id: "logLibraryManagement.delete.success" })
          );
          await loadData();
        } catch (error) {
          message.error(
            i18n.formatMessage({ id: "logLibraryManagement.delete.error" })
          );
        }
      },
    });
  };

  const openCreate = (database?: DatabaseResponse) => {
    if (!database) {
      message.info(
        i18n.formatMessage({ id: "logLibraryManagement.selectDatabase" })
      );
      return;
    }
    onChangeAddLogToDatabase(database);
    onChangeLogLibraryCreatedModalVisible(true);
  };

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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!selectedDatabase}
          onClick={() =>
            openCreate(databases.find((item) => item.id === selectedDatabase))
          }
        >
          {i18n.formatMessage({ id: "logLibraryManagement.create" })}
        </Button>
      </div>
      <div className={styles.toolbar}>
        <Select
          allowClear
          placeholder={i18n.formatMessage({
            id: "logLibraryManagement.instance",
          })}
          value={selectedInstance}
          onChange={(value) => {
            setSelectedInstance(value);
            fetchDatabases(value);
          }}
          options={instances.map((item: any) => ({
            value: item.id,
            label: item.name || item.instanceName,
          }))}
        />
        <Select
          allowClear
          disabled={!selectedInstance}
          placeholder={i18n.formatMessage({
            id: "logLibraryManagement.database",
          })}
          value={selectedDatabase}
          onChange={setSelectedDatabase}
          options={databases.map((item) => ({
            value: item.id,
            label: item.name || (item as any).databaseName,
          }))}
        />
        <Input
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={i18n.formatMessage({
            id: "logLibraryManagement.search",
          })}
        />
        <Button icon={<ReloadOutlined />} onClick={loadData}>
          {i18n.formatMessage({ id: "table.column.filter.refresh" })}
        </Button>
      </div>
      <div className={styles.content}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredRows}
          pagination={{ pageSize: 20 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={i18n.formatMessage({
                  id: "logLibraryManagement.empty",
                })}
              />
            ),
          }}
          columns={[
            {
              title: i18n.formatMessage({ id: "logLibraryManagement.table" }),
              dataIndex: "tableName",
            },
            {
              title: i18n.formatMessage({
                id: "logLibraryManagement.instance",
              }),
              dataIndex: "instanceName",
            },
            {
              title: i18n.formatMessage({
                id: "logLibraryManagement.database",
              }),
              dataIndex: "databaseName",
            },
            {
              title: i18n.formatMessage({ id: "description" }),
              dataIndex: "desc",
              render: (value: string) => value || "-",
            },
            {
              title: i18n.formatMessage({ id: "operation" }),
              key: "actions",
              width: 100,
              render: (_: any, record: any) => (
                <Button
                  danger
                  type="link"
                  icon={<DeleteOutlined />}
                  onClick={() => confirmDelete(record)}
                >
                  {i18n.formatMessage({ id: "delete" })}
                </Button>
              ),
            },
          ]}
        />
      </div>
      <ModalCreatedLogLibrary onGetList={loadData} />
    </div>
  );
};

export default LogLibraryManagement;
