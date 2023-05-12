import { DatePicker, Input, Select, Space } from "antd";
import dayjs from "dayjs";
import { useIntl } from "umi";
import { StatusType } from "..";
import styles from "./index.less";

const { RangePicker } = DatePicker;
const { Option } = Select;

export interface TaskFilterType {
  onGetList: (data: {
    end?: number;
    start?: number;
    nodeName?: string;
    tertiary?: number;
    state?: number;
  }) => void;
  setNodeName: (str: string) => void;
  setEndTime: (num: number) => void;
  setStartTime: (num: number) => void;
  setTertiary: (num: number) => void;
  setState: (num: number) => void;
  nodeName?: string;
  state?: number;
  endTime?: number;
  startTime?: number;
  tertiary?: number;
}
const TaskFilter = (props: TaskFilterType) => {
  const {
    setNodeName,
    onGetList,
    endTime,
    startTime,
    nodeName,
    state,
    setState,
    setStartTime,
    setEndTime,
    setTertiary,
    tertiary,
  } = props;
  const i18n = useIntl();

  const statusList = [
    {
      statu: StatusType.unknown,
      name: "unknown",
    },
    {
      statu: StatusType.success,
      name: i18n.formatMessage({
        id: "bigdata.dataAnalysis.taskExecutionDetails.column.status.successful",
      }),
    },
    {
      statu: StatusType.error,
      name: i18n.formatMessage({
        id: "bigdata.dataAnalysis.taskExecutionDetails.column.status.failure",
      }),
    },
  ];

  const handleSelectChange = (num: number) => {
    setTertiary(num);
    onGetList({ tertiary: num });
  };

  const handleSelectStatus = (state: number) => {
    setState(state);
    onGetList({ state: state });
  };

  return (
    <div className={styles.taskFilter}>
      <Space>
        <div className={styles.node}>
          <Input
            allowClear
            size="small"
            style={{ width: "150px" }}
            placeholder={i18n.formatMessage(
              { id: "input.placeholder" },
              {
                name: i18n.formatMessage({
                  id: "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.nodeName",
                }),
              }
            )}
            value={nodeName}
            onChange={(e) => {
              const nodeName = e.target.value;
              setNodeName(nodeName);
            }}
            onPressEnter={(e: any) => {
              const nodeName = e.target.value;
              setNodeName(nodeName);
              onGetList({ nodeName });
            }}
          />
        </div>
        <div className={styles.time}>
          <RangePicker
            size="small"
            showTime
            style={{ width: "360px" }}
            allowClear
            value={[
              startTime ? dayjs(startTime / 1000, "X") : null,
              endTime ? dayjs(endTime / 1000, "X") : null,
            ]}
            presets={[
              {
                label: i18n.formatMessage({
                  id: "bigdata.dataAnalysis.statisticalBoard.Screening.yesterday",
                }),
                value: [
                  dayjs().startOf("day").subtract(1, "d"),
                  dayjs().endOf("day").subtract(1, "d"),
                ],
              },
              {
                label: i18n.formatMessage({
                  id: "bigdata.dataAnalysis.statisticalBoard.Screening.beforeYesterday",
                }),
                value: [
                  dayjs().startOf("day").subtract(2, "d"),
                  dayjs().endOf("day").subtract(2, "d"),
                ],
              },
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
          <Select
            style={{ width: 150 }}
            onChange={handleSelectChange}
            value={tertiary}
            placeholder={i18n.formatMessage({
              id: "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.nodeType.placeholder",
            })}
            allowClear
            size="small"
          >
            <Option value={10}>ClickHouse</Option>
            <Option value={11}>MySQL</Option>
            <Option value={20}>OfflineSync</Option>
          </Select>
        </div>
        <div className={styles.state}>
          <Select
            style={{ width: 150 }}
            onChange={handleSelectStatus}
            value={state}
            placeholder={i18n.formatMessage(
              { id: "select.placeholder" },
              {
                name: i18n.formatMessage({
                  id: "bigdata.dataAnalysis.taskExecutionDetails.column.status.name",
                }),
              }
            )}
            allowClear
            size="small"
          >
            {statusList.map((item: any) => {
              return (
                <Option value={item.statu} key={item.statu}>
                  {item.name}
                </Option>
              );
            })}
          </Select>
        </div>
      </Space>
    </div>
  );
};
export default TaskFilter;
