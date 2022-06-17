import style from "@/pages/DataAnalysis/DataSourceManage/index.less";
import { EditOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import { Divider, Space, Table, Tooltip } from "antd";
import { ColumnsType } from "antd/lib/table";
import { useModel, useIntl } from "umi";

const DataTable = () => {
  const { dataSourceManage } = useModel("dataAnalysis");
  const { doGetSourceList, sourceList } = dataSourceManage;
  const i18n = useIntl();
  const column: ColumnsType<any> = [
    {
      title: `${i18n.formatMessage({
        id: "数据源名称",
      })}`,
      align: "center",
      dataIndex: "name",
      ellipsis: { showTitle: false },
      // render: TooltipRender({ placement: "right" }),
    },
    {
      title: `${i18n.formatMessage({
        id: "数据源类型",
      })}`,
      align: "center",
      dataIndex: "name",
      ellipsis: { showTitle: false },
      // render: TooltipRender({ placement: "right" }),
    },
    {
      title: `${i18n.formatMessage({
        id: "连接信息",
      })}`,
      align: "center",
      dataIndex: "name",
      ellipsis: { showTitle: false },
      // render: TooltipRender({ placement: "right" }),
    },
    {
      title: `${i18n.formatMessage({
        id: "数据源描述",
      })}`,
      align: "center",
      dataIndex: "name",
      ellipsis: { showTitle: false },
      // render: TooltipRender({ placement: "right" }),
    },
    {
      title: `${i18n.formatMessage({
        id: "创建时间",
      })}`,
      align: "center",
      dataIndex: "name",
      ellipsis: { showTitle: false },
      // render: TooltipRender({ placement: "right" }),
    },
    {
      title: `${i18n.formatMessage({
        id: "operation",
      })}`,
      align: "center",
      width: 100,
      fixed: "right",
      dataIndex: "operations",
      render: (_: any, record: any) => {
        return (
          <Space>
            <Tooltip
              title={i18n.formatMessage({
                id: "edit",
              })}
            >
              <EditOutlined
                onClick={() => {
                  // if (
                  //   onChangeVisible &&
                  //   onChangeIsEditor &&
                  //   onChangeCurrentInstance
                  // ) {
                  //   onChangeIsEditor(true);
                  //   onChangeVisible(true);
                  //   onChangeCurrentInstance(record);
                  // }
                }}
                // className={style}
              />
            </Tooltip>
            <Divider type="vertical" />
            <a
            // onClick={() => {
            //   CheckPermission({
            //     userId: 0,
            //     objectType: "instance",
            //     objectIdx: `${record.id}`,
            //     acts: ["role"],
            //     domainType: "system",
            //   }).then((r: any) => {
            //     if (r.code !== 0) {
            //       message.error(r.msg);
            //       return;
            //     }
            //     setInstance(record);
            //     setIID(record.id);
            //     setRoleAssignVisible(true);
            //   });
            // }}
            >
              <Tooltip title={i18n.formatMessage({ id: "instance.role.tip" })}>
                <UsergroupAddOutlined />
              </Tooltip>
            </a>
            <Divider type="vertical" />
            <Tooltip
              title={i18n.formatMessage({
                id: "delete",
              })}
            >
              {/* <IconFont
                onClick={() =>
                  DeletedModal(
                    {
                      onOk: () => {
                        if (record.id)
                          doDeletedInstance
                            .run(record.id)
                            .then(() => doGetInstanceList());
                      },
                      content: i18n.formatMessage(
                        {
                          id: "instance.delete.confirmTip",
                        },
                        { name: record.name }
                      ),
                    },
                    doDeletedInstance.loading
                  )
                }
                className={classNames(instanceTableStyles.instanceTableIcon)}
                type={"icon-delete"}
              /> */}
            </Tooltip>
          </Space>
        );
      },
    },
    // {
    //   title: i18n.formatMessage({ id: "instance.form.title.mode" }),
    //   dataIndex: "mode",
    //   align: "center" as AlignType,
    //   width: 100,
    //   render: (mode: number) => {
    //     if (mode === 1 || mode === 0) {
    //       return (
    //         <Tooltip
    //           title={i18n.formatMessage({
    //             id:
    //               mode === 1
    //                 ? "instance.form.title.cluster"
    //                 : "instance.form.title.modeType.single",
    //           })}
    //         >
    //           <span>
    //             {i18n.formatMessage({
    //               id:
    //                 mode === 1
    //                   ? "instance.form.title.cluster"
    //                   : "instance.form.title.modeType.single",
    //             })}
    //           </span>
    //         </Tooltip>
    //       );
    //     }
    //     return <></>;
    //   },
    // },
    // {
    //   title: i18n.formatMessage({ id: "instance.form.title.cluster" }),
    //   dataIndex: "clusters",
    //   align: "center" as AlignType,
    //   width: 100,
    //   render: (clusters: string[]) => (
    //     <Tooltip title={clusters}>
    //       {clusters?.map((item: string, index: number) => {
    //         return (
    //           <Tag color="lime" key={index}>
    //             {item}
    //           </Tag>
    //         );
    //       })}
    //     </Tooltip>
    //   ),
    // },
    // {
    //   width: 120,
    //   title: i18n.formatMessage({ id: "instance.form.title.ruleStoreType" }),
    //   align: "center" as AlignType,
    //   dataIndex: "ruleStoreType",
    //   render: (type: number) => (
    //     <span>
    //       {AlarmStorages.find((item) => item.value === type)?.label || "-"}
    //     </span>
    //   ),
    // },
    // {
    //   title: "Prometheus",
    //   align: "center" as AlignType,
    //   dataIndex: "prometheusTarget",
    //   ellipsis: { showTitle: false },
    //   width: 200,
    //   render: (_: any, record: any) => {
    //     if (record.ruleStoreType === 0) return <>-</>;
    //     return TooltipUtil(_);
    //   },
    // },
    // {
    //   title: i18n.formatMessage({ id: "DescAsAlias" }),
    //   align: "center" as AlignType,
    //   dataIndex: "desc",
    //   ellipsis: { showTitle: false },
    //   width: 200,
    //   render: (_: any) => TooltipUtil(_),
    // },
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
