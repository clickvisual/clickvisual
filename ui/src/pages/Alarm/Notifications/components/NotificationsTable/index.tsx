import notificationStyles from "@/pages/Alarm/Notifications/styles/index.less";
import { Table } from "antd";
const NotificationsTable = () => {
  const column = [
    { title: "Name", dataIndex: "name" },
    { title: "Type", dataIndex: "type" },
    { title: "Options", key: "options", width: 100 },
  ];
  return (
    <div className={notificationStyles.tableMain}>
      <Table columns={column} />
    </div>
  );
};
export default NotificationsTable;
