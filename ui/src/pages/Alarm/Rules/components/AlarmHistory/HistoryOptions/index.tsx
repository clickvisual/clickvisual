import historyStyles from "@/pages/Alarm/Rules/components/AlarmHistory/index.less";
import moment from "moment";
import { Button, DatePicker, Space } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { AlarmHistoryRequest } from "@/services/alarm";
import { useIntl } from "umi";

const { RangePicker } = DatePicker;

type HistoryOptionsProps = {
  loadList: (params?: AlarmHistoryRequest) => void;
};
const HistoryOptions = ({ loadList }: HistoryOptionsProps) => {
  const i18n = useIntl();
  const { alarmHistory } = useModel("alarm");
  const { query, setQuery } = alarmHistory;
  const handleResetTime = () => {
    setQuery({ ...query, startTime: undefined, endTime: undefined });
    loadList({ ...query, startTime: undefined, endTime: undefined });
  };
  const handleRefreshTime = () => {
    loadList({ ...query });
  };
  return (
    <div className={historyStyles.options}>
      <Space>
        <RangePicker
          showTime
          value={
            query?.startTime && query?.endTime
              ? [moment(query?.startTime, "X"), moment(query?.endTime, "X")]
              : [null, null]
          }
          ranges={{
            [i18n.formatMessage(
              { id: "dateTime.option.minutes" },
              { num: 1, plural: "" }
            )]: [moment().subtract(1, "minutes"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.minutes" },
              { num: 5, plural: "s" }
            )]: [moment().subtract(5, "minutes"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.minutes" },
              { num: 15, plural: "s" }
            )]: [moment().subtract(15, "minutes"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.hours" },
              { num: 1, plural: "" }
            )]: [moment().subtract(1, "hours"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.hours" },
              { num: 2, plural: "s" }
            )]: [moment().subtract(2, "hours"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.hours" },
              { num: 3, plural: "s" }
            )]: [moment().subtract(3, "hours"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.hours" },
              { num: 4, plural: "s" }
            )]: [moment().subtract(4, "hours"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.days" },
              { num: 1, plural: "" }
            )]: [moment().subtract(1, "day"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.days" },
              { num: 3, plural: "s" }
            )]: [moment().subtract(3, "day"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.weeks" },
              { num: 1, plural: "" }
            )]: [moment().subtract(1, "weeks"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.months" },
              { num: 1, plural: "" }
            )]: [moment().subtract(1, "month"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.months" },
              { num: 3, plural: "s" }
            )]: [moment().subtract(3, "month"), moment()],
            [i18n.formatMessage(
              { id: "dateTime.option.years" },
              { num: 1, plural: "" }
            )]: [moment().subtract(1, "year"), moment()],
          }}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              const startTime = dates[0].unix();
              const endTime = dates[1].unix();
              setQuery({ ...query, startTime, endTime });
              loadList({ ...query, startTime, endTime });
            } else {
              setQuery({ ...query, startTime: undefined, endTime: undefined });
              loadList({ ...query, startTime: undefined, endTime: undefined });
            }
          }}
        />
        <Button onClick={() => handleResetTime()}>
          {i18n.formatMessage({ id: "table.column.filter.reset" })}
        </Button>
        <Button onClick={() => handleRefreshTime()}>
          {i18n.formatMessage({ id: "table.column.filter.refresh" })}
        </Button>
      </Space>
    </div>
  );
};

export default HistoryOptions;
