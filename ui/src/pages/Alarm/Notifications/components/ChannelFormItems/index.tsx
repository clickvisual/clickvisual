import { Form, Input, Select } from "antd";
import useAlarmEnums from "@/pages/Alarm/hooks/useAlarmEnums";
const { Option } = Select;

export interface ChannelFormType {
  name: string;
  typ: number;
  key: string;
}

const ChannelFormItems = () => {
  const { ChannelTypes } = useAlarmEnums();
  return (
    <>
      <Form.Item name={"name"} label={"Name"} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name={"typ"} label={"Type"} rules={[{ required: true }]}>
        <Select>
          {ChannelTypes.map((item) => (
            <Option key={item.value} value={item.value}>
              {item.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name={"key"} label={"Url"} rules={[{ required: true }]}>
        <Input.TextArea autoSize={{ minRows: 3, maxRows: 3 }} allowClear />
      </Form.Item>
    </>
  );
};
export default ChannelFormItems;
