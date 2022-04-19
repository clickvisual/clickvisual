import databaseDrawStyle from "@/pages/DataLogs/components/SelectedDatabaseDraw/index.less";
import {
  Button,
  Drawer,
  Input,
  message,
  // Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { useModel } from "@@/plugin-model/useModel";
import type { DatabaseResponse } from "@/services/dataLogs";
import type { AlignType } from "rc-table/lib/interface";
import { useEffect, useState } from "react";
// import type { InstanceType } from "@/services/systemSetting";
// import FilterTableColumn from "@/components/FilterTableColumn";
import { useIntl } from "umi";
import CreatedDatabaseModal from "@/pages/DataLogs/components/SelectedDatabaseDraw/CreatedDatabaseModal";
import IconFont from "@/components/IconFont";
import classNames from "classnames";
import instanceTableStyles from "@/pages/SystemSetting/InstancePanel/components/InstanceTable/index.less";
import DeletedModal from "@/components/DeletedModal";
import viewDrawStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/DatabaseViewsDraw/index.less";
import { ColumnsType } from "antd/es/table";
import useUrlState from "@ahooksjs/use-url-state";
import { RestUrlStates } from "@/pages/DataLogs/hooks/useLogUrlParams";

// const { Option } = Select;
const { Search } = Input;
const SelectedDataBaseDraw = () => {
  const [, setUrlState] = useUrlState();
  const [treeDatabaseList, setTreeDatabaseList] = useState<any>([]);
  const {
    databaseList,
    currentDatabase,
    onChangeCurrentDatabase,
    getDatabases,
    visibleDataBaseDraw,
    doSelectedDatabase,
    doGetDatabaseList,
    onChangeLogLibrary,
    onChangeVisibleDatabaseDraw,
    logPanesHelper,
  } = useModel("dataLogs");
  const { resetPane } = logPanesHelper;
  const {
    doGetInstanceList,
    getInstanceList,
    instanceList,
    selectedInstance,
    onChangeSelectedInstance,
  } = useModel("instances");
  const { deletedDatabase, onChangeCreatedDatabaseModal } =
    useModel("database");
  const i18n = useIntl();

  const datasourceTypeList = [{ name: "ClickHouse", value: "ch" }];

  const doDeletedDatabase = (record: DatabaseResponse) => {
    DeletedModal({
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
            if (currentDatabase?.id === record.id) {
              onChangeCurrentDatabase(undefined);
            }
            doGetDatabaseList(selectedInstance);
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
  // lodash.cloneDeep(logPanes)

  useEffect(() => {
    getTreeDatabaseList(databaseList);
  }, [databaseList, visibleDataBaseDraw]);

  /**
   * 搜索事件
   * @param str
   */
  const handleSearch = (str: any) => {
    let arrList: any = [];
    databaseList.map((item: any) => {
      item.name.indexOf(str) != -1 && arrList.push(item);
    });
    getTreeDatabaseList(arrList);
  };

  /**
   * 将原始数据库接口转换成树状的数据库接口
   * @param dataList 数据源
   */
  const getTreeDatabaseList = (dataList: any) => {
    let arrList: any[] = [];
    instanceList.map((item: any) => {
      arrList.push({ newInstanceName: item.name, key: item.id });
    });
    dataList.map((item: any) => {
      arrList.map((items: any) => {
        if (item.instanceName == items.newInstanceName) {
          items.children
            ? items.children.push(item)
            : (items.children = [item]);
        }
      });
    });
    let newArrList: any[] = [];
    arrList.map((item: any) => {
      !!item.children && newArrList.push(item);
    });
    setTreeDatabaseList(newArrList);
  };

  useEffect(() => {
    if (visibleDataBaseDraw) doGetDatabaseList(selectedInstance);
  }, [selectedInstance, visibleDataBaseDraw]);

  useEffect(() => {
    if (visibleDataBaseDraw) {
      doGetInstanceList();
    } else {
      onChangeSelectedInstance(undefined);
    }
  }, [visibleDataBaseDraw]);

  const column: ColumnsType<any> = [
    {
      title: i18n.formatMessage({ id: "datasource.draw.table.instance" }),
      dataIndex: "newInstanceName",
      align: "center" as AlignType,
      width: "25%",
      render: (instanceName: string) => (
        <Tooltip title={instanceName}>
          <span>{instanceName}</span>
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "datasource.draw.table.datasource" }),
      dataIndex: "name",
      width: "40%",
      align: "center" as AlignType,
      ellipsis: { showTitle: false },
      // ...FilterTableColumn("databaseName"),
      render: (databaseName: string, record: DatabaseResponse) => (
        <Tooltip title={databaseName}>
          <Button
            onClick={() => {
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
      title: i18n.formatMessage({ id: "datasource.draw.table.deployment" }),
      dataIndex: "mode",
      align: "center" as AlignType,
      width: "25%",
      render: (mode: number) => (
        <Tooltip title={mode}>
          <span>
            {mode == 1
              ? i18n.formatMessage({ id: "instance.form.title.cluster" })
              : mode == 0
              ? i18n.formatMessage({
                  id: "instance.form.title.modeType.single",
                })
              : ""}
          </span>
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "instance.form.title.cluster" }),
      dataIndex: "clusters",
      align: "center" as AlignType,
      width: "50%",
      render: (clusters: string[]) => (
        <Tooltip title={clusters}>
          {clusters?.map((item: string) => {
            return <Tag color="lime">{item}</Tag>;
          })}
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "datasource.draw.table.type" }),
      dataIndex: "datasourceType",
      width: "25%",
      align: "center" as AlignType,
      ellipsis: { showTitle: false },
      render: (datasourceType: string) => {
        const result =
          datasourceTypeList.filter(
            (item: { name: string; value: string }) =>
              item.value === datasourceType
          ) || [];
        if (result.length > 0) {
          return (
            <Tooltip title={result[0].name}>
              <span>{result[0].name}</span>
            </Tooltip>
          );
        } else if (result == null) {
          return (
            <Tooltip
              title={i18n.formatMessage({
                id: "datasource.draw.table.empty.type.tip",
              })}
            >
              <span>-</span>
            </Tooltip>
          );
        } else {
          return <></>;
        }
      },
    },
    {
      title: i18n.formatMessage({ id: "operation" }),
      dataIndex: "name",
      key: "operation",
      align: "center" as AlignType,
      width: "10%",
      render: (name: any, record: DatabaseResponse) => (
        <>
          {name && (
            <Tooltip title={i18n.formatMessage({ id: "delete" })}>
              <IconFont
                onClick={() => doDeletedDatabase(record)}
                className={viewDrawStyles.buttonIcon}
                type={"icon-delete"}
              />
            </Tooltip>
          )}
        </>
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
          </Space>
        </div>
      }
      className={databaseDrawStyle.databaseDrawMain}
      placement="left"
      closable
      visible={visibleDataBaseDraw}
      getContainer={false}
      width={"50vw"}
      onClose={() => onChangeVisibleDatabaseDraw(false)}
      bodyStyle={{ padding: 10 }}
      headerStyle={{ padding: 10 }}
    >
      <div className={databaseDrawStyle.tableWrap}>
        <Table
          loading={getInstanceList.loading || getDatabases.loading}
          bordered
          rowKey={(record: any) => record.key || `${record.iid}-${record.id}`}
          // rowKey={(record: DatabaseResponse) => `${record.iid}-${record.id}`}
          size={"small"}
          columns={column}
          dataSource={treeDatabaseList}
          pagination={{
            responsive: true,
            showSizeChanger: true,
            size: "small",
          }}
        />
      </div>
      <CreatedDatabaseModal />
    </Drawer>
  );
};
export default SelectedDataBaseDraw;
