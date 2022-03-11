import historyStyles from "@/pages/Alarm/Rules/components/AlarmHistory/index.less";
import moment from "moment";
import { DatePicker, Space } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { AlarmHistoryRequest } from "@/services/alarm";

const { RangePicker } = DatePicker;

type HistoryOptionsProps = {
  loadList: (params?: AlarmHistoryRequest) => void;
};
const HistoryOptions = ({ loadList }: HistoryOptionsProps) => {
  const { alarmHistory } = useModel("alarm");
  const { query, setQuery } = alarmHistory;
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
      </Space>
    </div>
  );
};

export default HistoryOptions;
