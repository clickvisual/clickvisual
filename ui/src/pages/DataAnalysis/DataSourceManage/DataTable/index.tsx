import style from "@/pages/DataAnalysis/DataSourceManage/index.less";
import { SourceInfoType } from "@/services/dataSourceManage";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Divider, message, Popconfirm, Space, Table, Tooltip } from "antd";
import { ColumnsType } from "antd/lib/table";
import moment from "moment";
import { useModel, useIntl } from "umi";

const DataTable = () => {
  const i18n = useIntl();
  const { dataSourceManage, currentInstances } = useModel("dataAnalysis");
  const {
    doGetSourceList,
    sourceList,
    typList,
    currentTyp,
    doDeleteSource,
    onSearch,
    changeIsUpdate,
    changeVisibleDataSource,
    changeCurrentDataSource,
  } = dataSourceManage;

  const deleteDataSource = (id: number) => {
    doDeleteSource.run(id).then((res: any) => {
      if (res.code == 0) {
        message.success(
          i18n.formatMessage({ id: "systemSetting.role.delete.success" })
        );
        onSearch(currentInstances as number, { typ: currentTyp as number });
      }
    });
  };

  const column: ColumnsType<any> = [
    {
      title: i18n.formatMessage({
        id: "bigdata.dataSourceManage.dataTable.dataSourceName",
      }),
      align: "center",
      dataIndex: "name",
      ellipsis: { showTitle: false },
      render: (_, record: any) => {
        return <Tooltip title={record.name}>{record.name}</Tooltip>;
      },
    },
    {
      title: i18n.formatMessage({
        id: "log.editDatabaseModel.label.datasourceType",
      }),
      align: "center",
      dataIndex: "typ",
      ellipsis: { showTitle: false },
      render: (_: any, record: SourceInfoType) => {
        return (
          <>
            {typList.filter((item: any) => item.value == record.typ)[0].title}
          </>
        );
      },
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.dataSourceManage.dataTable.linkInformation",
      }),
      align: "center",
      dataIndex: "url",
      ellipsis: { showTitle: false },
      render: (_, record: any) => {
        return <Tooltip title={record.url}>{record.url}</Tooltip>;
      },
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.dataSourceManage.dataTable.dataSourceDesc",
      }),
      align: "center",
      dataIndex: "desc",
      ellipsis: { showTitle: false },
      render: (_, record: any) => {
        return <Tooltip title={record.desc}>{record.desc}</Tooltip>;
      },
    },
    {
      title: i18n.formatMessage({ id: "alarm.rules.historyBorad.ctime" }),
      align: "center",
      dataIndex: "ctime",
      ellipsis: { showTitle: false },
      render: (_: any, record: SourceInfoType) => (
        <>
          {record.ctime &&
            moment(record.ctime * 1000).format("YYYY-MM-DD hh:mm:ss")}
        </>
      ),
    },
    {
      title: `${i18n.formatMessage({
        id: "operation",
      })}`,
      align: "center",
      width: 100,
      fixed: "right",
      dataIndex: "operations",
      render: (_: any, record: SourceInfoType) => {
        return (
          <Space>
            <Tooltip
              title={i18n.formatMessage({
                id: "edit",
              })}
            >
              <EditOutlined
                onClick={() => {
                  changeIsUpdate(true);
                  changeVisibleDataSource(true);
                  changeCurrentDataSource(record);
                }}
              />
            </Tooltip>
            <Divider type="vertical" />
            <Tooltip
              title={i18n.formatMessage({
                id: "delete",
              })}
            >
              <Popconfirm
                title={i18n.formatMessage(
                  {
                    id: "bigdata.dataSourceManage.dataTable.deleteDataSourceTips",
                  },
                  { dataSource: record.name }
                )}
                okText={i18n.formatMessage({
                  id: "alarm.rules.history.isPushed.true",
                })}
                cancelText={i18n.formatMessage({
                  id: "alarm.rules.history.isPushed.false",
                })}
                placement="left"
                onConfirm={() => deleteDataSource(record.id)}
              >
                <DeleteOutlined />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      },
    },
  ];
  return (
    <div className={style.table}>
      <Table
        rowKey={"id"}
        loading={doGetSourceList.loading}
        size={"small"}
        columns={column}
        dataSource={sourceList}
        pagination={{ responsive: true, showSizeChanger: true, size: "small" }}
      />
    </div>
  );
};
export default DataTable;
