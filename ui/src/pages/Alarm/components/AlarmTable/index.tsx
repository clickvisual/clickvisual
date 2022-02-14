import { Table } from "antd";
import { ColumnsType } from "antd/es/table";
import { useIntl } from "umi";

const AlarmTable = () => {
  const i18n = useIntl();
  const column: ColumnsType<any> = [
    { title: i18n.formatMessage({ id: "operation" }), dataIndex: "operations" },
  ];
  return <Table columns={column} pagination={{ hideOnSinglePage: true }} />;
};
export default AlarmTable;
