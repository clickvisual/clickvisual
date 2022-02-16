import frequencyStyle from "@/pages/Alarm/components/FormAlarmDraw/InspectionFrequencyItem/index.less";
import { Form, InputNumber, Select, Space } from "antd";
import { NamePath, StoreValue } from "rc-field-form/es/interface";
const { Option } = Select;

const InspectionFrequencyItem = () => {
  const FrequencyTypes = [
    { key: 0, value: "每小时" },
    { key: 1, value: "每天" },
    { key: 2, value: "每周" },
    { key: 3, value: "固定时间" },
  ];

  const HourTime = () => (
    <Form.Item name={"time"} initialValue={"00:00"}>
      <Select className={frequencyStyle.selectHours}>
        {[...new Array(24)].map((value, index) => (
          <Option
            key={index}
            value={`${index > 10 ? `0${index}` : index}:00`}
          >{`${index < 10 ? `0${index}` : index}:00`}</Option>
        ))}
      </Select>
    </Form.Item>
  );

  const Weeks = () => {
    const weekList = [
      { key: 0, value: "周一" },
      { key: 1, value: "周二" },
      { key: 2, value: "周三" },
      { key: 3, value: "周四" },
      { key: 4, value: "周五" },
      { key: 5, value: "周六" },
      { key: 6, value: "周日" },
    ];
    return (
      <Form.Item name={"week"} initialValue={0}>
        <Select className={frequencyStyle.selectHours}>
          {weekList.map((value) => (
            <Option key={value.key} value={value.key}>
              {value.value}
            </Option>
          ))}
        </Select>
      </Form.Item>
    );
  };

  const FixedInterval = () => {
    const numberTypes = [
      { key: 1, value: "天" },
      { key: 2, value: "小时" },
      { key: 3, value: "分钟" },
    ];
    return (
      <Space>
        <Form.Item name={"number"} initialValue={15}>
          <InputNumber min={1} />
        </Form.Item>
        <Form.Item name={"numberType"} initialValue={3}>
          <Select style={{ width: 70 }}>
            {numberTypes.map((item) => (
              <Option key={item.key} value={item.key}>
                {item.value}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Space>
    );
  };

  const switchFrequencyType = (
    getFieldValue: (name: NamePath) => StoreValue
  ) => {
    const type = getFieldValue("type");
    switch (type) {
      case 0:
        return <></>;
      case 1:
        return <HourTime />;
      case 2:
        return (
          <Space>
            <Weeks />
            <HourTime />
          </Space>
        );
      case 3:
        return <FixedInterval />;
      default:
        return <></>;
    }
  };

  return (
    <div>
      <span>检查频率：</span>
      <Space className={frequencyStyle.spaceMain}>
        <Form.Item name={"type"} initialValue={3}>
          <Select className={frequencyStyle.selectType}>
            {FrequencyTypes.map((type) => (
              <Select.Option key={type.key} value={type.key}>
                {type.value}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, nextValues) =>
            prevValues.type !== nextValues.type
          }
        >
          {({ getFieldValue }) => switchFrequencyType(getFieldValue)}
        </Form.Item>
      </Space>
    </div>
  );
};
export default InspectionFrequencyItem;
