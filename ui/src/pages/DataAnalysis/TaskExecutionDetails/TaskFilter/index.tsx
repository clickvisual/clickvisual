import styles from "./index.less";
import { DatePicker, Input, Select, Space } from "antd";
import moment from "moment";

const { RangePicker } = DatePicker;
const { Option } = Select;

export interface TaskFilterType {
  onGetList: (data: {
    end?: number;
    start?: number;
    nodeName?: string;
    tertiary?: number;
  }) => void;
  setNodeName: (str: string) => void;
  setEndTime: (num: number) => void;
  setStartTime: (num: number) => void;
  setTertiary: (num: number) => void;
  endTime?: number;
  startTime?: number;
}
const TaskFilter = (props: TaskFilterType) => {
  //   const [nodeValue, setNodeValue] = useState<string>("");
  const {
    setNodeName,
    onGetList,
    endTime,
    startTime,
    setStartTime,
    setEndTime,
    setTertiary,
  } = props;

  const handleSelectChange = (num: number) => {
    setTertiary(num);
    onGetList({ tertiary: num });
  };

  return (
    <div className={styles.taskFilter}>
      <Space>
        <div className={styles.node}>
          <Space>
            <span>节点搜索：</span>
            <Input
              allowClear
              size="small"
              onPressEnter={(e: any) => {
                const nodeName = e.target.value;
                setNodeName(nodeName);
                onGetList({ nodeName });
              }}
            />
          </Space>
        </div>
        <div className={styles.time}>
          <span>时间：</span>
          <RangePicker
            size="small"
            showTime
            allowClear
            value={[
              startTime ? moment(startTime / 1000, "X") : null,
              endTime ? moment(endTime / 1000, "X") : null,
            ]}
            onChange={(timeList: any) => {
              const start = timeList && timeList.length > 1 ? +timeList[0] : 0;
              const end = timeList && timeList.length > 1 ? +timeList[1] : 0;
              setStartTime(start);
              setEndTime(end);
              onGetList({
                start: Math.floor(start / 1000),
                end: Math.floor(end / 1000),
              });
            }}
          />
        </div>
        <div className={styles.type}>
          <span>类型：</span>
          <Select
            style={{ width: 120 }}
            onChange={handleSelectChange}
            allowClear
            size="small"
          >
            <Option value={10}>ClickHouse</Option>
            <Option value={11}>MySQL</Option>
            <Option value={20}>OfflineSync</Option>
          </Select>
        </div>
      </Space>
    </div>
  );
};
export default TaskFilter;
