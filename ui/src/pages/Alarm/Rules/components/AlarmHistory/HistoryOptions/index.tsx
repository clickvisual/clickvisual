import historyStyles from "@/pages/Alarm/Rules/components/AlarmHistory/index.less";
import { AlarmHistoryRequest } from "@/services/alarm";
import { useModel } from "@umijs/max";
import { Button, DatePicker, Space } from "antd";
import dayjs from "dayjs";
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
              ? [dayjs(query?.startTime, "X"), dayjs(query?.endTime, "X")]
              : [null, null]
          }
          presets={[
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.minutes" },
                { num: 1, plural: "" }
              ),
              value: [dayjs().add(-1, "m"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.minutes" },
                { num: 5, plural: "" }
              ),
              value: [dayjs().add(-5, "m"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.minutes" },
                { num: 15, plural: "" }
              ),
              value: [dayjs().add(-15, "m"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.minutes" },
                { num: 30, plural: "" }
              ),
              value: [dayjs().add(-30, "m"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.hours" },
                { num: 1, plural: "" }
              ),
              value: [dayjs().add(-1, "h"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.hours" },
                { num: 3, plural: "" }
              ),
              value: [dayjs().add(-3, "h"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.hours" },
                { num: 12, plural: "" }
              ),
              value: [dayjs().add(-12, "h"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.days" },
                { num: 1, plural: "" }
              ),
              value: [dayjs().add(-1, "d"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.days" },
                { num: 3, plural: "" }
              ),
              value: [dayjs().add(-3, "d"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.weeks" },
                { num: 1, plural: "" }
              ),
              value: [dayjs().add(-1, "w"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.months" },
                { num: 1, plural: "" }
              ),
              value: [dayjs().add(-1, "m"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.months" },
                { num: 3, plural: "" }
              ),
              value: [dayjs().add(-1, "m"), dayjs()],
            },
            {
              label: i18n.formatMessage(
                { id: "dateTime.option.years" },
                { num: 1, plural: "" }
              ),
              value: [dayjs().add(-1, "year"), dayjs()],
            },
          ]}
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
