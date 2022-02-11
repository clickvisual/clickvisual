import databaseDrawStyle from "@/pages/DataLogs/components/SelectedDatabaseDraw/index.less";
import { Button, Drawer, Select, Space, Table, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import type { DatabaseResponse } from "@/services/dataLogs";
import type { AlignType } from "rc-table/lib/interface";
import { useEffect } from "react";
import type { InstanceType } from "@/services/systemSetting";
import FilterTableColumn from "@/components/FilterTableColumn";
import { useIntl } from "umi";
import CreatedDatabaseModal from "@/pages/DataLogs/components/SelectedDatabaseDraw/CreatedDatabaseModal";
import IconFont from "@/components/IconFont";
import classNames from "classnames";
import instanceTableStyles from "@/pages/SystemSetting/InstancePanel/components/InstanceTable/index.less";

const { Option } = Select;
const SelectedDataBaseDraw = () => {
  const {
    databaseList,
    getDatabases,
    visibleDataBaseDraw,
    doSelectedDatabase,
    doGetDatabaseList,
    onChangeLogLibrary,
    onChangeVisibleDatabaseDraw,
    onChangeLogPanes,
  } = useModel("dataLogs");
  const {
    doGetInstanceList,
    getInstanceList,
    instanceList,
    selectedInstance,
    onChangeSelectedInstance,
  } = useModel("instances");
  const { onChangeCreatedDatabaseModal } = useModel("database");
  const i18n = useIntl();

  const datasourceTypeList = [{ name: "ClickHouse", value: "ch" }];

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

  const column = [
    {
      title: i18n.formatMessage({ id: "datasource.draw.table.datasource" }),
      dataIndex: "name",
      width: "40%",
      align: "center" as AlignType,
      ellipsis: { showTitle: false },
      ...FilterTableColumn("databaseName"),
      render: (databaseName: string, record: DatabaseResponse) => (
        <Tooltip title={databaseName}>
          <Button
            onClick={() => {
              doSelectedDatabase(record);
              onChangeLogLibrary(undefined);
              onChangeVisibleDatabaseDraw(false);
              onChangeLogPanes([]);
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
      title: i18n.formatMessage({ id: "datasource.draw.table.instance" }),
      dataIndex: "iid",
      align: "center" as AlignType,
      width: "30%",
      render: (iid: number) => {
        const instance = instanceList.find((item) => item.id === iid);
        if (!instance) return <span>-</span>;
        return (
          <Tooltip title={instance.instanceName}>
            <span>{instance.instanceName}</span>
          </Tooltip>
        );
      },
    },
    {
      title: i18n.formatMessage({ id: "datasource.draw.table.type" }),
      dataIndex: "datasourceType",
      width: "30%",
      align: "center" as AlignType,
      ellipsis: { showTitle: false },
      render: (datasourceType: string) => {
        const result =
          datasourceTypeList.filter(
            (item: { name: string; value: string }) =>
              item.value === datasourceType
          ) || [];
        if (result.length > 0)
          return (
            <Tooltip title={result[0].name}>
              <span>{result[0].name}</span>
            </Tooltip>
          );
        return (
          <Tooltip
            title={i18n.formatMessage({
              id: "datasource.draw.table.empty.type.tip",
            })}
          >
            <span>-</span>
          </Tooltip>
        );
      },
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
            <Select
              allowClear
              value={selectedInstance}
              style={{ width: "100%" }}
              placeholder={`${i18n.formatMessage({
                id: "datasource.draw.selected",
              })}`}
              onChange={(value: number) => {
                onChangeSelectedInstance(value);
              }}
            >
              {instanceList.map((item: InstanceType, index: number) => (
                <Option key={index} value={item.id as number}>
                  {item.instanceName}
                </Option>
              ))}
            </Select>
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
      placement="right"
      closable
      visible={visibleDataBaseDraw}
      getContainer={false}
      width={"35vw"}
      onClose={() => onChangeVisibleDatabaseDraw(false)}
      bodyStyle={{ padding: 10 }}
      headerStyle={{ padding: 10 }}
    >
      <Table
        loading={getInstanceList.loading || getDatabases.loading}
        bordered
        rowKey={(record: DatabaseResponse) => `${record.iid}-${record.id}`}
        size={"small"}
        columns={column}
        dataSource={databaseList}
        pagination={{ responsive: true, showSizeChanger: true, size: "small" }}
      />
      <CreatedDatabaseModal />
    </Drawer>
  );
};
export default SelectedDataBaseDraw;
