import instanceTableStyles from "@/pages/SystemSetting/InstancePanel/components/InstanceTable/index.less";
import { Divider, Space, Table, Tooltip, Tag, message } from "antd";
import type { AlignType, FixedType } from "rc-table/lib/interface";
import { EditOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import IconFont from "@/components/IconFont";
import classNames from "classnames";
import { InstancePanelContext } from "@/pages/SystemSetting/InstancePanel";
import { useContext } from "react";
import deletedModal from "@/components/DeletedModal";
import { useModel } from "@@/plugin-model/useModel";
import type { InstanceType } from "@/services/systemSetting";
import TooltipRender from "@/utils/tooltipUtils/TooltipRender";
import { useIntl } from "umi";
import useAlarmStorages from "@/pages/SystemSetting/InstancePanel/hooks/useAlarmStorages";
import { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { CheckPermission } from "@/services/pms";
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

  const { AlarmStorages } = useAlarmStorages();

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
        id: "instance.instanceName",
      })}`,
      align: "center" as AlignType,
      dataIndex: "name",
      width: 160,
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
      width: 100,
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
      width: 120,
      title: i18n.formatMessage({ id: "instance.form.title.ruleStoreType" }),
      align: "center" as AlignType,
      dataIndex: "ruleStoreType",
      render: (type: number) => (
        <span>
          {AlarmStorages.find((item) => item.value === type)?.label || "-"}
        </span>
      ),
    },
    {
      title: "Prometheus",
      align: "center" as AlignType,
      dataIndex: "prometheusTarget",
      ellipsis: { showTitle: false },
      width: 200,
      render: (_: any, record: any) => {
        if (record.ruleStoreType === 0) return <>-</>;
        return TooltipUtil(_);
      },
    },
    {
      title: i18n.formatMessage({ id: "DescAsAlias" }),
      align: "center" as AlignType,
      dataIndex: "desc",
      ellipsis: { showTitle: false },
      width: 200,
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
