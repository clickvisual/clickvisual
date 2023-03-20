import CreateChannelModal from "@/pages/Alarm/Notifications/components/CreateChannelModal";
import NotificationsTable from "@/pages/Alarm/Notifications/components/NotificationsTable";
import Operations from "@/pages/Alarm/Notifications/components/Operations";
import UpdateChannelModal from "@/pages/Alarm/Notifications/components/UpdateChaneelModal";
import notificationStyles from "@/pages/Alarm/Notifications/styles/index.less";
import { ChannelType } from "@/services/alarm";
import { useModel } from "@umijs/max";
import classNames from "classnames";
import { useEffect, useState } from "react";
const Notifications = () => {
  const [dataList, setDataList] = useState<ChannelType[]>([]);
  const { alarmChannel } = useModel("alarm");
  const { doGetChannels } = alarmChannel;
  const loadList = () => {
    doGetChannels.run().then((res) => {
      if (res?.code !== 0) return;
      setDataList(res.data);
    });
  };

  useEffect(() => {
    loadList();
  }, []);
  return (
    <div className={classNames(notificationStyles.notificationMain)}>
      <Operations />
      <NotificationsTable loadList={loadList} dataList={dataList} />
      <CreateChannelModal loadList={loadList} />
      <UpdateChannelModal loadList={loadList} />
    </div>
  );
};
export default Notifications;
