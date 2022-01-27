import instanceTableStyles from "@/pages/SystemSetting/InstancePanel/components/InstanceTable/index.less";
import { Divider, Space, Table, Tooltip } from "antd";
import type { AlignType, FixedType } from "rc-table/lib/interface";
import { EditOutlined } from "@ant-design/icons";
import IconFont from "@/components/IconFont";
import classNames from "classnames";
import { InstancePanelContext } from "@/pages/SystemSetting/InstancePanel";
import { useContext } from "react";
import DeletedModal from "@/components/DeletedModal";
import { useModel } from "@@/plugin-model/useModel";
import type { InstanceType } from "@/services/systemSetting";
import TooltipRender from "@/utils/tooltipUtils/TooltipRender";
import { useIntl } from "umi";

type InstanceTableProps = {
  list: InstanceType[];
};

const InstanceTable = (props: InstanceTableProps) => {
  const { list } = props;
  const { onChangeVisible, onChangeIsEditor, onChangeCurrentInstance } =
    useContext(InstancePanelContext);
  const { doDeletedInstance, doGetInstanceList, listLoading } =
    useModel("instances");

  const i18n = useIntl();

  const column = [
    {
      title: `${i18n.formatMessage({
        id: "instance.instanceName",
      })}`,
      align: "center" as AlignType,
      dataIndex: "instanceName",
      width: 160,
      ellipsis: { showTitle: false },
      render: TooltipRender({ placement: "right" }),
    },
    {
      title: "DSN",
      align: "center" as AlignType,
      dataIndex: "dsn",
      ellipsis: { showTitle: false },
      render: TooltipRender({ placement: "right" }),
    },
    {
      title: `${i18n.formatMessage({
        id: "operation",
      })}`,
      align: "center" as AlignType,
      width: 100,
      fixed: "right" as FixedType,
      dataIndex: "operations",
      render: (_: any, record: InstanceType) => {
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
                    onChangeVisible &&
                    onChangeIsEditor &&
                    onChangeCurrentInstance
                  ) {
                    onChangeIsEditor(true);
                    onChangeVisible(true);
                    onChangeCurrentInstance(record);
                  }
                }}
                className={instanceTableStyles.instanceTableIcon}
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
                        { instanceName: record.instanceName }
                      ),
                    },
                    doDeletedInstance.loading
                  )
                }
                className={classNames(instanceTableStyles.instanceTableIcon)}
                type={"icon-delete"}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div className={instanceTableStyles.instanceTableMain}>
      <Table
        rowKey={"id"}
        loading={listLoading}
        size={"small"}
        columns={column}
        dataSource={list}
        pagination={{ responsive: true, showSizeChanger: true, size: "small" }}
      />
    </div>
  );
};
export default InstanceTable;
