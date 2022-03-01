import notificationStyles from "@/pages/Alarm/Notifications/styles/index.less";
import classNames from "classnames";
import Operations from "@/pages/Alarm/Notifications/components/Operations";
import NotificationsTable from "@/pages/Alarm/Notifications/components/NotificationsTable";
const Notifications = () => {
  return (
    <div className={classNames(notificationStyles.notificationMain)}>
      <Operations />
      <NotificationsTable />
    </div>
  );
};
export default Notifications;
