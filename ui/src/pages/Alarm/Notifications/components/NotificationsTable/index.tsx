import notificationStyles from "@/pages/Alarm/Notifications/styles/index.less";
import { Table } from "antd";
import { ColumnsType } from "antd/es/table";
const NotificationsTable = () => {
  const column: ColumnsType<any> = [
    { title: "Name", dataIndex: "name", align: "center" },
    { title: "Type", dataIndex: "type", align: "center" },
    { title: "Options", key: "options", width: 100, align: "center" },
  ];
  return (
    <div className={notificationStyles.tableMain}>
      <Table columns={column} />
    </div>
  );
};
export default NotificationsTable;
