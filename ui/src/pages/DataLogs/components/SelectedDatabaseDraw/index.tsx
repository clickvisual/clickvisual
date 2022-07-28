import databaseDrawStyle from "@/pages/DataLogs/components/SelectedDatabaseDraw/index.less";
import {
  Button,
  Drawer,
  Empty,
  Input,
  message,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { useModel } from "@@/plugin-model/useModel";
import type { DatabaseResponse } from "@/services/dataLogs";
import type { AlignType } from "rc-table/lib/interface";
import { useEffect, useState } from "react";
import { useIntl } from "umi";
import CreatedDatabaseModal from "@/pages/DataLogs/components/SelectedDatabaseDraw/CreatedDatabaseModal";
import EditDatabaseModel from "@/pages/DataLogs/components/SelectedDatabaseDraw/EditDatabaseModel";
import ModalCreatedLogLibrary from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import IconFont from "@/components/IconFont";
import classNames from "classnames";
import instanceTableStyles from "@/pages/SystemSetting/InstancePanel/components/InstanceTable/index.less";
import deletedModal from "@/components/DeletedModal";
import viewDrawStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/DatabaseViewsDraw/index.less";
import { ColumnsType } from "antd/es/table";
import useUrlState from "@ahooksjs/use-url-state";
import { RestUrlStates } from "@/pages/DataLogs/hooks/useLogUrlParams";
import { PlusSquareOutlined } from "@ant-design/icons";

const { Search } = Input;
const SelectedDataBaseDraw = (props: { onGetList: any }) => {
  const { onGetList } = props;
  const [, setUrlState] = useUrlState();
  const [treeDatabaseList, setTreeDatabaseList] = useState<any>([]);
  const {
    databaseList,
    // currentDatabase,
    // onChangeCurrentDatabase,
    getDatabases,
    visibleDataBaseDraw,
    doSelectedDatabase,
    doGetDatabaseList,
    onChangeLogLibrary,
    onChangeVisibleDatabaseDraw,
    logPanesHelper,
    onChangeLogLibraryCreatedModalVisible,
    onChangeIsAccessLogLibrary,
    onChangeIsLogLibraryAllDatabase,
    onChangeAddLogToDatabase,
    onChangeIsEditDatabase,
    onChangeCurrentEditDatabase,
  } = useModel("dataLogs");
  const { resetPane } = logPanesHelper;
  const {
    doGetInstanceList,
    getInstanceList,
    instanceList,
    // selectedInstance,
    // onChangeSelectedInstance,
  } = useModel("instances");
  const { deletedDatabase, onChangeCreatedDatabaseModal } =
    useModel("database");
  const i18n = useIntl();

  const doDeletedDatabase = (record: DatabaseResponse) => {
    deletedModal({
      content: i18n.formatMessage(
        { id: "datasource.deleted.content" },
        { database: record.name }
      ),
      onOk: () => {
        const hideMessage = message.loading(
          {
            content: i18n.formatMessage(
              { id: "datasource.deleted.loading" },
              { database: record.name }
            ),
            key: "database",
          },
          0
        );
        deletedDatabase
          .run(record.id)
          .then((res) => {
            if (res?.code !== 0) {
              hideMessage();
              return;
            }
            onGetList();
            // if (currentDatabase?.id === record.id) {
            //   onChangeCurrentDatabase(undefined);
            // }
            // doGetDatabaseList(selectedInstance);
            message.success(
              {
                content: i18n.formatMessage(
                  { id: "datasource.deleted.success" },
                  { database: record.name }
                ),
                key: "database",
              },
              3
            );
          })
          .catch(() => hideMessage());
      },
    });
  };

  const doEditDatabase = (record: DatabaseResponse) => {
    onChangeIsEditDatabase(true);
    onChangeCurrentEditDatabase(record);
  };

  const handleSearch = (str: any) => {
    let arrList: any = [];
    databaseList.map((item: any) => {
      item.name.indexOf(str) != -1 && arrList.push(item);
    });
    getTreeDatabaseList(arrList);
  };

  const getTreeDatabaseList = (dataList: any) => {
    let arrList: any[] = [];
    instanceList.map((item: any) => {
      arrList.push({
        newInstanceName: item.name,
        key: `${item.id}`,
        customInstanceDesc: item.desc,
        clusters: item.clusters,
      });
    });

    dataList.map((item: any) => {
      arrList.map((instance: any) => {
        if (item.instanceName == instance.newInstanceName) {
          delete item.clusters;
          instance.children
            ? instance.children.push({ ...item, key: `${item.iid}-${item.id}` })
            : (instance.children = [
                { ...item, key: `${item.iid}-${item.id}` },
              ]);
        }
      });
    });
    setTreeDatabaseList(arrList);
  };

  // useEffect(() => {
  //   if (visibleDataBaseDraw) doGetDatabaseList(selectedInstance);
  // }, [selectedInstance, visibleDataBaseDraw]);

  useEffect(() => {
    if (!visibleDataBaseDraw) return;
    doGetInstanceList();
  }, [visibleDataBaseDraw]);

  useEffect(() => {
    if (
      !visibleDataBaseDraw ||
      instanceList?.length <= 0 ||
      databaseList?.length <= 0
    )
      return;
    getTreeDatabaseList(databaseList);
  }, [databaseList, instanceList, visibleDataBaseDraw]);

  useEffect(() => {
    if (!visibleDataBaseDraw) {
      onChangeAddLogToDatabase(undefined);
      // onChangeSelectedInstance(undefined);
    }
  }, [visibleDataBaseDraw]);

  const column: ColumnsType<any> = [
    {
      title: i18n.formatMessage({ id: "datasource.draw.table.instance" }),
      dataIndex: "newInstanceName",
      align: "center" as AlignType,
      width: "40%",
      render: (instanceName: string) => (
        <Tooltip title={instanceName}>
          <span>{instanceName}</span>
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "datasource.draw.table.instanceDesc" }),
      dataIndex: "customInstanceDesc",
      align: "center" as AlignType,
      width: "40%",
      render: (customInstanceDesc: string) => (
        <Tooltip title={customInstanceDesc}>
          <span>{customInstanceDesc}</span>
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "datasource.draw.table.datasource" }),
      dataIndex: "name",
      width: "40%",
      align: "center" as AlignType,
      ellipsis: { showTitle: false },
      render: (databaseName: string, record: DatabaseResponse) => (
        <Tooltip title={databaseName}>
          <Button
            onClick={() => {
              if (!databaseName) return;
              doSelectedDatabase(record);
              onChangeLogLibrary(undefined);
              onChangeVisibleDatabaseDraw(false);
              resetPane();
              setUrlState(RestUrlStates);
            }}
            size={"small"}
            type={"link"}
            style={{ width: "100%", padding: 0 }}
          >
            <span className={databaseDrawStyle.textOmission}>
              {databaseName}
            </span>
          </Button>
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "datasource.draw.table.datasourceDesc" }),
      dataIndex: "desc",
      align: "center" as AlignType,
      width: "40%",
      render: (desc: string) => (
        <Tooltip title={desc}>
          <span>{desc}</span>
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "instance.form.title.mode" }),
      dataIndex: "mode",
      align: "center" as AlignType,
      width: "15%",
      render: (mode: number) => {
        if (mode === 1 || mode === 0) {
          return (
            <Tooltip
              title={i18n.formatMessage({
                id:
                  mode === 1
                    ? "instance.form.title.cluster"
                    : "instance.form.title.modeType.single",
              })}
            >
              <span>
                {i18n.formatMessage({
                  id:
                    mode === 1
                      ? "instance.form.title.cluster"
                      : "instance.form.title.modeType.single",
                })}
              </span>
            </Tooltip>
          );
        }
        return <></>;
      },
    },
    {
      title: i18n.formatMessage({ id: "instance.form.title.cluster" }),
      dataIndex: "clusters",
      align: "center" as AlignType,
      width: "50%",
      render: (clusters: string[]) => (
        <Tooltip title={clusters}>
          {clusters?.map((item: string, index: number) => {
            return (
              <Tag color="lime" key={index}>
                {item}
              </Tag>
            );
          })}
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "operation" }),
      dataIndex: "name",
      key: "operation",
      align: "center" as AlignType,
      width: "20%",
      render: (name: any, record: DatabaseResponse) => (
        <Space>
          {name && (
            <>
              <Tooltip title={i18n.formatMessage({ id: "edit" })}>
                <IconFont
                  onClick={() => doEditDatabase(record)}
                  className={viewDrawStyles.buttonIcon}
                  style={{ color: "hsl(13, 80%, 57%)", fontSize: "13px" }}
                  type={"icon-database-edit"}
                />
              </Tooltip>
              <Tooltip title={i18n.formatMessage({ id: "delete" })}>
                <IconFont
                  onClick={() => doDeletedDatabase(record)}
                  className={viewDrawStyles.buttonIcon}
                  type={"icon-delete"}
                />
              </Tooltip>
              <Tooltip
                title={i18n.formatMessage({
                  id: "datasource.draw.table.operation.tip",
                })}
              >
                <PlusSquareOutlined
                  onClick={() => {
                    onChangeAddLogToDatabase(record);
                    onChangeLogLibraryCreatedModalVisible(true);
                  }}
                  className={databaseDrawStyle.addIcon}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span>{i18n.formatMessage({ id: "datasource.draw.title" })}</span>
          </div>
          <Space style={{ width: "60%" }}>
            <Search
              placeholder={i18n.formatMessage({
                id: "datasource.draw.search",
              })}
              enterButton
              allowClear
              onSearch={handleSearch}
            />
            <Tooltip
              title={i18n.formatMessage({
                id: "instance.operation.addDatabase",
              })}
              placement={"bottomRight"}
            >
              <IconFont
                onClick={() => {
                  onChangeCreatedDatabaseModal(true);
                }}
                className={classNames(instanceTableStyles.instanceTableIcon)}
                type={"icon-add-database"}
              />
            </Tooltip>
            <Tooltip
              title={i18n.formatMessage({
                id: "datasource.draw.logLibraryButton",
              })}
              placement={"bottomRight"}
            >
              <IconFont
                onClick={() => {
                  onChangeIsAccessLogLibrary(true);
                  onChangeLogLibraryCreatedModalVisible(true);
                  onChangeIsLogLibraryAllDatabase(true);
                }}
                className={classNames(instanceTableStyles.logLibraryIcon)}
                type={"icon-addLogLibrary"}
              />
            </Tooltip>
          </Space>
        </div>
      }
      className={databaseDrawStyle.databaseDrawMain}
      placement="left"
      closable
      visible={visibleDataBaseDraw}
      getContainer={false}
      width={"75vw"}
      onClose={() => onChangeVisibleDatabaseDraw(false)}
      bodyStyle={{ padding: 10 }}
      headerStyle={{ padding: 10 }}
    >
      <div className={databaseDrawStyle.tableWrap}>
        {treeDatabaseList.length > 0 ? (
          <Table
            loading={getInstanceList.loading || getDatabases.loading}
            bordered
            rowKey={"key"}
            size={"small"}
            columns={column}
            dataSource={treeDatabaseList}
            pagination={false}
            expandable={{
              expandRowByClick: true,
              defaultExpandAllRows: true,
            }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginBottom: 10 }}
            description={i18n.formatMessage({
              id: "log.index.item.empty",
            })}
          />
        )}
      </div>
      <CreatedDatabaseModal onGetList={() => {}} />
      <ModalCreatedLogLibrary onGetList={onGetList} />
      <EditDatabaseModel />
    </Drawer>
  );
};
export default SelectedDataBaseDraw;
