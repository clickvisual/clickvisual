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
        message.success("删除成功");
        onSearch(currentInstances as number, { typ: currentTyp as number });
      }
    });
  };

  const column: ColumnsType<any> = [
    {
      title: `数据源名称`,
      align: "center",
      dataIndex: "name",
      ellipsis: { showTitle: false },
      render: (_, record: any) => {
        return <Tooltip title={record.name}>{record.name}</Tooltip>;
      },
    },
    {
      title: `数据源类型`,
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
      title: `连接信息`,
      align: "center",
      dataIndex: "url",
      ellipsis: { showTitle: false },
      render: (_, record: any) => {
        return <Tooltip title={record.url}>{record.url}</Tooltip>;
      },
    },
    {
      title: `数据源描述`,
      align: "center",
      dataIndex: "desc",
      ellipsis: { showTitle: false },
      render: (_, record: any) => {
        return <Tooltip title={record.desc}>{record.desc}</Tooltip>;
      },
    },
    {
      title: `创建时间`,
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
                title={`确认删除数据源「${record.name}」吗？`}
                okText="是"
                cancelText="否"
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
