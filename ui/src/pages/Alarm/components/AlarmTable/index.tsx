import alarmStyles from "@/pages/Alarm/styles/index.less";
import { Button, Divider, message, Space, Table, Tooltip } from "antd";
import { ColumnsType } from "antd/es/table";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import useTimeUnits from "@/hooks/useTimeUnits";
import { AlarmType } from "@/services/alarm";
import IconFont from "@/components/IconFont";
import { EditOutlined } from "@ant-design/icons";
import DeletedModal from "@/components/DeletedModal";

const AlarmTable = () => {
  const i18n = useIntl();
  const { FixedTimeUnits } = useTimeUnits();

  const {
    alarmList,
    operations,
    alarmDraw,
    doGetAlarms,
    doDeletedAlarm,
    currentPagination,
    onChangeRowAlarm,
    onChangePagination,
  } = useModel("alarm");

  const searchQuery = {
    name: operations.inputName,
    did: operations.selectDid,
    tid: operations.selectTid,
    ...currentPagination,
  };

  const handleEdit = (record: AlarmType) => {
    alarmDraw.onChangeIsEditor(true);
    onChangeRowAlarm(record);
    alarmDraw.onChangeVisibleDraw(true);
  };

  const handleDelete = (record: AlarmType) => {
    DeletedModal({
      content: i18n.formatMessage(
        { id: "alarm.deleted.content" },
        { alarm: record.alarmName }
      ),
      onOk: () => {
        const hideMessage = message.loading(
          {
            content: i18n.formatMessage({ id: "alarm.deleted.loading" }),
            key: "alarm",
          },
          0
        );
        doDeletedAlarm
          .run(record.id)
          .then((res) => {
            if (res?.code !== 0) hideMessage();
            doGetAlarms.run(searchQuery);
            message.success(
              {
                content: i18n.formatMessage({ id: "alarm.deleted" }),
                key: "alarm",
              },
              3
            );
          })
          .catch(() => hideMessage());
      },
    });
  };

  useEffect(() => {
    doGetAlarms.run(searchQuery);
  }, []);

  const column: ColumnsType<any> = [
    {
      title: i18n.formatMessage({ id: "alarm.table.alarmName" }),
      dataIndex: "alarmName",
      align: "center",
    },
    {
      title: i18n.formatMessage({ id: "alarm.inspectionFrequency" }),
      dataIndex: "interval",
      align: "center",
      render: (interval: number, record: AlarmType) => {
        const unit = FixedTimeUnits.filter(
          (item) => item.key === record.unit
        )[0];
        return (
          <span>
            {interval}&nbsp;{unit.label}
          </span>
        );
      },
    },
    {
      title: i18n.formatMessage({ id: "description" }),
      dataIndex: "desc",
      align: "center",
      width: "50%",
      ellipsis: { showTitle: true },
      render: (desc: string) => (
        <Tooltip title={desc}>
          <div className={alarmStyles.columnsEllipsis}>
            <span>{desc}</span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "operation" }),
      dataIndex: "operations",
      align: "center",
      width: 100,
      render: (_: any, record: AlarmType) => (
        <Space>
          <Tooltip
            title={i18n.formatMessage({
              id: "edit",
            })}
          >
            <Button
              size={"small"}
              type={"link"}
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Divider type="vertical" />
          <Tooltip
            title={i18n.formatMessage({
              id: "delete",
            })}
          >
            <Button
              size={"small"}
              type={"link"}
              icon={<IconFont type={"icon-delete"} />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      loading={doGetAlarms.loading}
      rowKey={"id"}
      size={"small"}
      columns={column}
      dataSource={alarmList}
      rowClassName={alarmStyles.tableWrapper}
      pagination={{
        responsive: true,
        showSizeChanger: true,
        size: "small",
        onChange: (page, pageSize) => {
          onChangePagination({ ...currentPagination, current: page, pageSize });
          doGetAlarms.run({ ...searchQuery, current: page, pageSize });
        },
      }}
    />
  );
};
export default AlarmTable;
