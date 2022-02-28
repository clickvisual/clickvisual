import notificationStyles from "@/pages/Alarm/Notifications/styles/index.less";
import classNames from "classnames";
import Operations from "@/pages/Alarm/Notifications/components/Operations";
const Notifications = () => {
  return (
    <div className={classNames(notificationStyles.notificationMain)}>
      <Operations />
    </div>
  );
};
export default Notifications;
