import historyStyles from "@/pages/Alarm/Rules/components/AlarmHistory/index.less";
import { Table } from "antd";
import { ColumnsType } from "antd/es/table";
import moment from "moment";
import { useModel } from "@@/plugin-model/useModel";
import { AlarmHistoryRequest, AlarmHistoryType } from "@/services/alarm";

type HistoryTableProps = {
  dataList: AlarmHistoryType[];
  loadList: (params?: AlarmHistoryRequest | API.Pagination) => void;
};
const HistoryTable = ({ dataList, loadList }: HistoryTableProps) => {
  const { alarmHistory } = useModel("alarm");
  const { currentAlarm, currentPagination, setCurrentPagination } =
    alarmHistory;

  const column: ColumnsType<any> = [
    {
      title: "是否成功推送报警",
      dataIndex: "isPushed",
      align: "center",
      render: (value) => {
        switch (value) {
          case 1:
            return <span>是</span>;
          default:
            return <span>否</span>;
        }
      },
    },
    {
      title: "触发时间",
      dataIndex: "ctime",
      align: "center",
      render: (value: number) =>
        value !== 0 ? (
          <span>{moment(value, "X").format("YYYY-MM-DD HH:mm:ss")}</span>
        ) : (
          "-"
        ),
    },
  ];
  return (
    <div className={historyStyles.table}>
      {currentAlarm && (
        <Table
          rowKey={"id"}
          columns={column}
          size={"small"}
          dataSource={dataList}
          pagination={{
            responsive: true,
            showSizeChanger: true,
            size: "small",
            ...currentPagination,
            onChange: (page, pageSize) => {
              setCurrentPagination({
                ...currentPagination,
                current: page,
                pageSize,
              });
              loadList({
                alarmId: currentAlarm.id,
                current: page,
                pageSize,
              });
            },
          }}
        />
      )}
    </div>
  );
};
export default HistoryTable;
