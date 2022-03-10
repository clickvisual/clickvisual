import notificationStyles from "@/pages/Alarm/Notifications/styles/index.less";
import classNames from "classnames";
import Operations from "@/pages/Alarm/Notifications/components/Operations";
import NotificationsTable from "@/pages/Alarm/Notifications/components/NotificationsTable";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useState } from "react";
import { ChannelType } from "@/services/alarm";
import CreateChannelModal from "@/pages/Alarm/Notifications/components/CreateChannelModal";
import UpdateChannelModal from "@/pages/Alarm/Notifications/components/UpdateChaneelModal";
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
