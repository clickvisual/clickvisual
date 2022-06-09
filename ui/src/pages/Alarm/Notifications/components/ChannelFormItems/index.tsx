import { Form, Input, Select } from "antd";
import useAlarmEnums from "@/pages/Alarm/hooks/useAlarmEnums";
const { Option } = Select;
import { useIntl } from "umi";

export interface ChannelFormType {
  name: string;
  typ: number;
  key: string;
}

const ChannelFormItems = () => {
  const i18n = useIntl();
  const { ChannelTypes } = useAlarmEnums();
  return (
    <>
      <Form.Item name={"name"} label={"Name"} rules={[{ required: true }]}>
        <Input
          placeholder={i18n.formatMessage({
            id: "alarm.notify.name.placeholder",
          })}
        />
      </Form.Item>
      <Form.Item name={"typ"} label={"Type"} rules={[{ required: true }]}>
        <Select
          placeholder={i18n.formatMessage({
            id: "alarm.notify.type.placeholder",
          })}
        >
          {ChannelTypes.map((item) => (
            <Option key={item.value} value={item.value}>
              {item.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name={"key"} label={"Url"} rules={[{ required: true }]}>
        <Input.TextArea
          autoSize={{ minRows: 3, maxRows: 3 }}
          allowClear
          placeholder={i18n.formatMessage({
            id: "alarm.notify.url.placeholder",
          })}
        />
      </Form.Item>
    </>
  );
};
export default ChannelFormItems;
