import alarmStyles from "@/pages/Alarm/Rules/styles/index.less";
import { Divider, message, Space, Table, Tag, Tooltip } from "antd";
import { ColumnsType } from "antd/es/table";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import useTimeUnits from "@/hooks/useTimeUnits";
import { AlarmType } from "@/services/alarm";
import IconFont from "@/components/IconFont";
import {
  EditOutlined,
  FileTextOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";
import DeletedModal from "@/components/DeletedModal";
import classNames from "classnames";
import { useDebounceFn } from "ahooks";

const AlarmTable = () => {
  const i18n = useIntl();
  const { FixedTimeUnits } = useTimeUnits();

  const {
    alarmList,
    operations,
    alarmHistory,
    alarmDraw,
    doGetAlarms,
    doDeletedAlarm,
    currentPagination,
    onChangeRowAlarm,
    AlarmStatus,
    onChangePagination,
  } = useModel("alarm");

  const searchQuery = {
    name: operations.inputName,
    did: operations.selectDid,
    tid: operations.selectTid,
    status: operations.statusId,
    ...currentPagination,
  };

  const handleHistory = (id: number) => {
    alarmDraw.doGetAlarmInfo.run(id).then((res) => {
      if (res?.code !== 0) return;
      alarmHistory.setCurrentAlarm({ ...res.data, id });
      alarmHistory.setHistoryVisible(true);
    });
  };

  const handleEdit = (record: AlarmType) => {
    alarmDraw.onChangeIsEditor(true);
    onChangeRowAlarm(record);
    alarmDraw.onChangeVisibleDraw(true);
  };

  const handleInfo = (id: number) => {
    alarmDraw.doGetAlarmInfo.run(id).then((res) => {
      if (res?.code !== 0) return;
      alarmDraw.setAlarmInfo(res.data);
      alarmDraw.onChangeVisibleInfo(true);
    });
  };

  const handleDelete = (record: AlarmType) => {
    DeletedModal({
      content: i18n.formatMessage(
        { id: "alarm.rules.deleted.content" },
        { alarm: record.alarmName }
      ),
      onOk: () => {
        const hideMessage = message.loading(
          {
            content: i18n.formatMessage({ id: "alarm.rules.deleted.loading" }),
            key: "alarm",
          },
          0
        );
        doDeletedAlarm
          .run(record.id)
          .then((res) => {
            if (res?.code !== 0) {
              hideMessage();
              return;
            }
            doGetAlarms.run(searchQuery);
            message.success(
              {
                content: i18n.formatMessage({ id: "alarm.rules.deleted" }),
                key: "alarm",
              },
              3
            );
          })
          .catch(() => hideMessage());
      },
    });
  };

  const doUpdateStatus = useDebounceFn(
    (alarm: AlarmType) => {
      const isOpen = alarm.status !== 1;
      const hideMessage = message.loading(
        {
          content: i18n.formatMessage(
            {
              id: `alarm.rules.${isOpen ? "close" : "open"}.loading`,
            },
            { alarmName: alarm.alarmName }
          ),
          key: "status",
        },
        0
      );
      alarmDraw.doUpdatedAlarm
        .run(alarm.id, { status: isOpen ? 1 : 2 })
        .then((res) => {
          if (res?.code !== 0) {
            hideMessage();
            return;
          }
          message.success(
            {
              content: i18n.formatMessage(
                { id: `alarm.rules.${isOpen ? "close" : "open"}.success` },
                { alarmName: alarm.alarmName }
              ),
              key: "status",
            },
            3
          );
          doGetAlarms.run(searchQuery);
        })
        .catch(() => hideMessage());
    },
    { wait: 500 }
  ).run;

  useEffect(() => {
    doGetAlarms.run(searchQuery);
  }, []);

  const column: ColumnsType<any> = [
    {
      title: i18n.formatMessage({ id: "alarm.rules.table.alarmName" }),
      dataIndex: "alarmName",
      align: "center",
      ellipsis: { showTitle: true },
      render: (alarmName: string, record: AlarmType) => (
        <Tooltip title={alarmName}>
          <div
            style={{ color: "red" }}
            className={classNames(
              alarmStyles.columnsEllipsis,
              alarmStyles.columnsTag
            )}
          >
            <a onClick={() => handleHistory(record.id)}>
              <span>{alarmName}</span>
            </a>
          </div>
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "alarm.rules.inspectionFrequency" }),
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
      title: i18n.formatMessage({ id: "status" }),
      dataIndex: "status",
      width: 100,
      align: "center",
      render: (value) => {
        const status = AlarmStatus.find((item) => value === item.status);
        if (!status) return <>-</>;
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: i18n.formatMessage({ id: "operation" }),
      dataIndex: "operations",
      align: "center",
      width: 180,
      render: (_: any, record: AlarmType) => (
        <Space>
          {record.status !== 0 && (
            <>
              <Tooltip
                title={i18n.formatMessage({
                  id: `alarm.rules.switch.${
                    record.status === 1 ? "open" : "close"
                  }`,
                })}
              >
                <a onClick={() => doUpdateStatus(record)}>
                  <PoweroffOutlined />
                </a>
              </Tooltip>
              <Divider type="vertical" />
            </>
          )}

          <Tooltip
            title={i18n.formatMessage({
              id: "edit",
            })}
          >
            <a onClick={() => handleEdit(record)}>
              <EditOutlined />
            </a>
          </Tooltip>
          <Divider type="vertical" />
          <Tooltip title={i18n.formatMessage({ id: "alarm.rules.info.title" })}>
            <a onClick={() => handleInfo(record.id)}>
              <FileTextOutlined />
            </a>
          </Tooltip>
          <Divider type="vertical" />
          <Tooltip
            title={i18n.formatMessage({
              id: "delete",
            })}
          >
            <a onClick={() => handleDelete(record)}>
              <IconFont type={"icon-delete"} />
            </a>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className={alarmStyles.tableMain}>
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
          ...currentPagination,
          onChange: (page, pageSize) => {
            onChangePagination({
              ...currentPagination,
              current: page,
              pageSize,
            });
            doGetAlarms.run({ ...searchQuery, current: page, pageSize });
          },
        }}
      />
    </div>
  );
};
export default AlarmTable;
