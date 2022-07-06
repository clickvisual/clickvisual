import notificationStyles from "@/pages/Alarm/Notifications/styles/index.less";
import { Button, Divider, message, Space, Table, Tooltip } from "antd";
import { ColumnsType } from "antd/es/table";
import useAlarmEnums from "@/pages/Alarm/hooks/useAlarmEnums";
import { ChannelType } from "@/services/alarm";
import { useIntl } from "umi";
import IconFont from "@/components/IconFont";
import { EditOutlined } from "@ant-design/icons";
import { useModel } from "@@/plugin-model/useModel";
import deletedModal from "@/components/DeletedModal";

type NotificationProps = {
  dataList: ChannelType[];
  loadList: () => void;
};
const NotificationsTable = ({ loadList, dataList }: NotificationProps) => {
  const { ChannelTypes } = useAlarmEnums();
  const { alarmChannel, alarmChannelModal } = useModel("alarm");
  const { doDeletedChannel, doGetChannelInfo, setCurrentChannel } =
    alarmChannel;
  const { setVisibleUpdate } = alarmChannelModal;
  const i18n = useIntl();

  const doDeleted = (record: ChannelType) => {
    const hideMessage = message.loading(
      {
        content: i18n.formatMessage(
          { id: "alarm.notify.deleted.loading" },
          { channelName: record.name }
        ),
        key: "delete-channel",
      },
      0
    );

    doDeletedChannel
      .run(record.id)
      .then((res) => {
        if (res?.code !== 0) {
          hideMessage();
          return;
        }
        message.success(
          {
            content: i18n.formatMessage(
              { id: "alarm.notify.deleted.success" },
              { channelName: record.name }
            ),
            key: "delete-channel",
          },
          3
        );
        loadList();
      })
      .catch(() => hideMessage());
  };

  const handleDelete = (record: ChannelType) => {
    deletedModal({
      title: i18n.formatMessage({ id: "alarm.notify.modal.title" }),
      content: i18n.formatMessage(
        { id: "alarm.notify.modal.content" },
        { channelName: record.name }
      ),
      onOk: () => doDeleted(record),
    });
  };

  const doGetInfo = (id: number) => {
    doGetChannelInfo.run(id).then((res) => {
      if (res?.code !== 0) return;
      setCurrentChannel(res.data);
      setVisibleUpdate(true);
    });
  };

  const column: ColumnsType<any> = [
    { title: "Name", dataIndex: "name", align: "center" },
    {
      title: "Type",
      dataIndex: "typ",
      align: "center",
      width: 200,
      render: (value) => (
        <span>{ChannelTypes.find((item) => item.value === value)?.name}</span>
      ),
    },
    {
      title: "Options",
      key: "options",
      width: 100,
      align: "center",
      render: (_: any, record: ChannelType) => (
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
              onClick={() => doGetInfo(record.id)}
            />
          </Tooltip>
          <Divider type="vertical" />
          <Tooltip title={i18n.formatMessage({ id: "delete" })}>
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
    <div className={notificationStyles.tableMain}>
      <Table
        size={"small"}
        dataSource={dataList}
        columns={column}
        pagination={false}
      />
    </div>
  );
};
export default NotificationsTable;
