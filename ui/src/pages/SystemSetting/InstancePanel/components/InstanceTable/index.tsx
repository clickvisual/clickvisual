import deletedModal from "@/components/DeletedModal";
import IconFont from "@/components/IconFont";
import { InstancePanelContext } from "@/pages/SystemSetting/InstancePanel";
import instanceTableStyles from "@/pages/SystemSetting/InstancePanel/components/InstanceTable/index.less";
import { CheckPermission } from "@/services/pms";
import type { InstanceType } from "@/services/systemSetting";
import TooltipRender from "@/utils/tooltipUtils/TooltipRender";
import { EditOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { Divider, message, Space, Table, Tag, Tooltip } from "antd";
import { ColumnsType } from "antd/es/table";
import classNames from "classnames";
import type { AlignType, FixedType } from "rc-table/lib/interface";
import { useContext, useState } from "react";
import { useIntl } from "umi";
import AppRoleAssignListForm from "../RoleAssign";

type InstanceTableProps = {
  list: InstanceType[];
};

const InstanceTable = (props: InstanceTableProps) => {
  const { list } = props;
  const { onChangeVisible, onChangeIsEditor, onChangeCurrentInstance } =
    useContext(InstancePanelContext);
  const { doDeletedInstance, doGetInstanceList, listLoading } =
    useModel("instances");

  const [instance, setInstance] = useState<any>();
  const [iid, setIID] = useState<any>(0);
  const [roleAssignVisible, setRoleAssignVisible] = useState<true | false>(
    false
  );

  const TooltipUtil = (content: any) => (
    <Tooltip
      title={content}
      placement={"right"}
      overlayInnerStyle={{ maxHeight: "200px", overflowY: "auto" }}
    >
      <span style={{ cursor: "default" }}>{content || "-"}</span>
    </Tooltip>
  );

  const i18n = useIntl();

  const onChange = (flag: boolean) => {
    setRoleAssignVisible(flag);
  };

  const column: ColumnsType<any> = [
    {
      title: `${i18n.formatMessage({
        id: "instance.name",
      })}`,
      align: "left" as AlignType,
      dataIndex: "name",
      width: 100,
      ellipsis: { showTitle: false },
      render: TooltipRender({ placement: "right" }),
    },
    {
      title: i18n.formatMessage({ id: "instance.form.title.mode" }),
      dataIndex: "mode",
      align: "center" as AlignType,
      width: 100,
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
      width: 300,
      render: (clusters: string[]) => (
        <div>
          {clusters?.map((item: string, index: number) => {
            return (
              <Tag color="lime" key={index}>
                {item}
              </Tag>
            );
          })}
        </div>
      ),
    },
    {
      title: i18n.formatMessage({ id: "descAsAlias" }),
      align: "left" as AlignType,
      dataIndex: "desc",
      ellipsis: { showTitle: false },
      width: 100,
      render: (_: any) => TooltipUtil(_),
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
            <a
              onClick={() => {
                CheckPermission({
                  userId: 0,
                  objectType: "instance",
                  objectIdx: `${record.id}`,
                  acts: ["role"],
                  domainType: "system",
                }).then((r: any) => {
                  if (r.code !== 0) {
                    message.error(r.msg);
                    return;
                  }
                  setInstance(record);
                  setIID(record.id);
                  setRoleAssignVisible(true);
                });
              }}
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
              <IconFont
                onClick={() =>
                  deletedModal({
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
                  })
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
      <AppRoleAssignListForm
        iid={iid}
        instanceName={instance?.name}
        drawerVisible={roleAssignVisible}
        onChangeDrawerVisible={onChange}
      />
    </div>
  );
};
export default InstanceTable;
