import historyStyles from "@/pages/Alarm/Rules/components/AlarmHistory/index.less";
import { AlarmHistoryRequest, AlarmHistoryType } from "@/services/alarm";
import { useModel } from "@umijs/max";
import { Table } from "antd";
import { ColumnsType } from "antd/es/table";
import moment from "moment";
import { useIntl } from "umi";

type HistoryTableProps = {
  dataList: AlarmHistoryType[];
  loadList: (params?: AlarmHistoryRequest) => void;
};
const HistoryTable = ({ dataList, loadList }: HistoryTableProps) => {
  const { alarmHistory } = useModel("alarm");
  const {
    doGetAlarmHistoryList,
    currentAlarm,
    currentPagination,
    setCurrentPagination,
  } = alarmHistory;
  const i18n = useIntl();

  const column: ColumnsType<any> = [
    {
      title: i18n.formatMessage({ id: "alarm.rules.history.column.isPushed" }),
      dataIndex: "isPushed",
      align: "center",
      render: (value) => {
        switch (value) {
          case 0:
            return (
              <span>
                {i18n.formatMessage({
                  id: "alarm.rules.history.isPushed.zero",
                })}
              </span>
            );
          case 1:
            return (
              <span>
                {i18n.formatMessage({
                  id: "alarm.rules.history.isPushed.true",
                })}
              </span>
            );
          default:
            return (
              <span>
                {i18n.formatMessage({
                  id: "alarm.rules.history.isPushed.false",
                })}
              </span>
            );
        }
      },
    },
    {
      title: i18n.formatMessage({ id: "alarm.rules.history.column.ctime" }),
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
          loading={doGetAlarmHistoryList.loading}
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
