import deletedModal from "@/components/DeletedModal";
import IconFont from "@/components/IconFont";
import { ClustersPanelContext } from "@/pages/SystemSetting/ClustersPanel";
import clusterPanelStyles from "@/pages/SystemSetting/ClustersPanel/index.less";
import type { ClusterType } from "@/services/systemSetting";
import TooltipRender from "@/utils/tooltipUtils/TooltipRender";
import { EditOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { Divider, Space, Table, Tooltip } from "antd";
import { ColumnsType } from "antd/es/table";
import classNames from "classnames";
import type { AlignType, FixedType } from "rc-table/lib/interface";
import { useContext } from "react";
import { useIntl } from "umi";

const ClustersTable = () => {
  const { onChangeVisible, onChangeIsEditor, onChangeCurrentCluster } =
    useContext(ClustersPanelContext);
  const i18n = useIntl();
  const {
    doGetClustersList,
    listLoading,
    pagination,
    clusterList,
    doDeletedCluster,
  } = useModel("clusters");

  const column: ColumnsType<any> = [
    {
      title: `${i18n.formatMessage({ id: "cluster.clusterName" })}`,
      dataIndex: "clusterName",
      align: "center" as AlignType,
      ellipsis: { showTitle: false },
      render: TooltipRender({ placement: "right" }),
    },
    {
      title: `${i18n.formatMessage({ id: "description" })}`,
      dataIndex: "description",
      align: "center" as AlignType,
      ellipsis: { showTitle: false },
      render: TooltipRender({ placement: "right" }),
    },
    {
      title: "Api Server",
      dataIndex: "apiServer",
      align: "center" as AlignType,
      ellipsis: { showTitle: false },
      render: TooltipRender({ placement: "right" }),
    },
    {
      title: `${i18n.formatMessage({ id: "cluster.k8sConfiguration" })}`,
      dataIndex: "kubeConfig",
      align: "center" as AlignType,
      ellipsis: { showTitle: false },
      render: TooltipRender({ placement: "left" }),
    },
    {
      title: `${i18n.formatMessage({
        id: "operation",
      })}`,
      align: "center" as AlignType,
      width: 100,
      fixed: "right" as FixedType,
      dataIndex: "operations",
      render: (_: any, record: ClusterType) => {
        return (
          <Space>
            <Tooltip
              title={i18n.formatMessage({
                id: "edit",
              })}
            >
              <EditOutlined
                onClick={() => {
                  if (
                    onChangeCurrentCluster &&
                    onChangeVisible &&
                    onChangeIsEditor
                  ) {
                    onChangeCurrentCluster(record);
                    onChangeIsEditor(true);
                    onChangeVisible(true);
                  }
                }}
                className={clusterPanelStyles.icon}
              />
            </Tooltip>
            <Divider type="vertical" />
            <Tooltip
              title={i18n.formatMessage({
                id: "delete",
              })}
            >
              <IconFont
                onClick={() =>
                  deletedModal({
                    onOk: () => {
                      if (record.id)
                        doDeletedCluster
                          .run(record.id)
                          .then(() => doGetClustersList());
                    },
                    content: `${i18n.formatMessage(
                      { id: "cluster.delete.confirmTip" },
                      { clusterName: record.clusterName }
                    )}`,
                  })
                }
                className={classNames(clusterPanelStyles.icon)}
                type={"icon-delete"}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div className={clusterPanelStyles.table}>
      <Table
        rowKey={"id"}
        loading={listLoading}
        columns={column}
        dataSource={clusterList}
        size={"small"}
        pagination={{
          total: pagination?.total,
          pageSize: pagination?.pageSize,
          current: pagination?.current,
          onChange: (current, pageSize) =>
            doGetClustersList({ current, pageSize }),
          responsive: true,
          showSizeChanger: true,
          size: "small",
        }}
      />
    </div>
  );
};
export default ClustersTable;
