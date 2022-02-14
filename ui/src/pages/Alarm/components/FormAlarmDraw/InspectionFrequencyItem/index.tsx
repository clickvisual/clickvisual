import frequencyStyle from "@/pages/Alarm/components/FormAlarmDraw/InspectionFrequencyItem/index.less";
import { Form, Input, Select, Space } from "antd";
import { NamePath, StoreValue } from "rc-field-form/es/interface";

const InspectionFrequencyItem = () => {
  const FrequencyTypes = [
    { key: 0, value: "每小时" },
    { key: 1, value: "每天" },
    { key: 2, value: "每周" },
    { key: 3, value: "固定时间" },
  ];

  const switchFrequencyType = (
    getFieldValue: (name: NamePath) => StoreValue
  ) => {
    const type = getFieldValue("type");
    switch (type) {
      case 0:
        return <></>;
      case 1:
        return (
          <Form.Item name={"time"} rules={[{ required: true, message: "111" }]}>
            <Input />
          </Form.Item>
        );
      default:
        return <></>;
    }
  };

  return (
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
        shouldUpdate={(prevValues, nextValues) =>
          prevValues.type !== nextValues.type
        }
      >
        {({ getFieldValue }) => switchFrequencyType(getFieldValue)}
      </Form.Item>
    </Space>
  );
};
export default InspectionFrequencyItem;
