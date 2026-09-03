import ModalCreatedLogLibrary from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import api, { DatabaseResponse } from "@/services/dataLogs";
import { CheckRoot } from "@/services/pms";
import systemSettingApi, { InstanceType } from "@/services/systemSetting";
import {
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useModel } from "@umijs/max";
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Spin,
  Table,
  Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { history, useIntl } from "umi";
import styles from "./index.less";

interface LogLibraryRow {
  id: number;
  iid: number;
  tableName: string;
  instanceName: string;
  databaseId: number;
  databaseName: string;
  desc?: string;
}

interface InspectorTarget {
  kind: "columns" | "ddl";
  iid: number;
  instanceName: string;
  databaseName: string;
  tableName: string;
}

interface TableColumnMetadata {
  name: string;
  type: number;
  typeDesc: string;
}

const LogLibraryManagement = () => {
  const i18n = useIntl();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [instances, setInstances] = useState<InstanceType[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<number>();
  const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<number>();
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<LogLibraryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [inspector, setInspector] = useState<InspectorTarget>();
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorError, setInspectorError] = useState(false);
  const [columns, setColumns] = useState<TableColumnMetadata[]>([]);
  const [ddl, setDdl] = useState("");
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
      const flattened: LogLibraryRow[] = [];
      list.forEach((instance: any) => {
        (instance.databases || []).forEach((database: any) => {
          (database.tables || []).forEach((table: any) => {
            flattened.push({
              ...table,
              iid: instance.id,
              instanceName: instance.name || instance.instanceName,
              databaseId: database.id,
              databaseName: database.databaseName || database.name,
            } as LogLibraryRow);
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

  const loadInspector = useCallback(async (target: InspectorTarget) => {
    setInspector(target);
    setInspectorLoading(true);
    setInspectorError(false);
    setColumns([]);
    setDdl("");
    try {
      if (target.kind === "columns") {
        const res = await api.getLogLibraryManagementTableColumns(
          target.iid,
          target.databaseName,
          target.tableName
        );
        if (res?.code !== 0) throw new Error(res?.msg || "request failed");
        setColumns(res.data || []);
      } else {
        const res = await api.getLogLibraryManagementTableDDL(
          target.iid,
          target.databaseName,
          target.tableName
        );
        if (res?.code !== 0) throw new Error(res?.msg || "request failed");
        setDdl(res.data?.ddl || "");
      }
    } catch (error) {
      setInspectorError(true);
    } finally {
      setInspectorLoading(false);
    }
  }, []);

  const openInspector = (kind: InspectorTarget["kind"], row: LogLibraryRow) =>
    loadInspector({
      kind,
      iid: row.iid,
      instanceName: row.instanceName,
      databaseName: row.databaseName,
      tableName: row.tableName,
    });

  const copyDDL = async () => {
    if (!ddl) return;
    try {
      await navigator.clipboard.writeText(ddl);
      message.success(i18n.formatMessage({ id: "logLibraryManagement.ddl.copied" }));
    } catch (error) {
      message.error(i18n.formatMessage({ id: "logLibraryManagement.ddl.copyError" }));
    }
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
              width: 280,
              render: (_: unknown, record: LogLibraryRow) => (
                <>
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => openInspector("columns", record)}
                  >
                    {i18n.formatMessage({ id: "logLibraryManagement.schema" })}
                  </Button>
                  <Button
                    type="link"
                    icon={<CodeOutlined />}
                    onClick={() => openInspector("ddl", record)}
                  >
                    {i18n.formatMessage({ id: "logLibraryManagement.ddl" })}
                  </Button>
                  <Button
                    danger
                    type="link"
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(record)}
                  >
                    {i18n.formatMessage({ id: "delete" })}
                  </Button>
                </>
              ),
            },
          ]}
        />
      </div>
      <ModalCreatedLogLibrary onGetList={loadData} />
      <Drawer
        width={720}
        open={!!inspector}
        destroyOnClose
        title={
          inspector ? (
            <div>
              <div>
                {inspector.kind === "columns"
                  ? i18n.formatMessage({ id: "logLibraryManagement.schema" })
                  : i18n.formatMessage({ id: "logLibraryManagement.ddl" })}
              </div>
              <Typography.Text type="secondary">
                {inspector.instanceName} / {inspector.databaseName} / {inspector.tableName}
              </Typography.Text>
            </div>
          ) : null
        }
        onClose={() => setInspector(undefined)}
      >
        {inspectorLoading ? (
          <div className={styles.inspectorState}>
            <Spin />
          </div>
        ) : inspectorError ? (
          <div className={styles.inspectorState}>
            <Alert
              type="error"
              showIcon
              message={i18n.formatMessage({ id: "logLibraryManagement.inspectError" })}
            />
            {inspector ? (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadInspector(inspector)}
              >
                {i18n.formatMessage({ id: "retry" })}
              </Button>
            ) : null}
          </div>
        ) : inspector?.kind === "columns" ? (
          <Table<TableColumnMetadata>
            rowKey="name"
            size="small"
            pagination={false}
            dataSource={columns}
            columns={[
              {
                title: i18n.formatMessage({ id: "logLibraryManagement.column.name" }),
                dataIndex: "name",
              },
              {
                title: i18n.formatMessage({ id: "logLibraryManagement.column.type" }),
                dataIndex: "typeDesc",
              },
            ]}
          />
        ) : (
          <>
            <div className={styles.inspectorToolbar}>
              <Button icon={<CopyOutlined />} onClick={copyDDL} disabled={!ddl}>
                {i18n.formatMessage({ id: "logLibraryManagement.ddl.copy" })}
              </Button>
            </div>
            <Input.TextArea value={ddl} readOnly autoSize={{ minRows: 12, maxRows: 28 }} />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default LogLibraryManagement;
