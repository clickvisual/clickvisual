import frequencyStyle from "@/pages/Alarm/components/FormAlarmDraw/InspectionFrequencyItem/index.less";
import { Form, InputNumber, Select, Space } from "antd";
import { NamePath, StoreValue } from "rc-field-form/es/interface";
import { useIntl } from "umi";
import useTimeUnits from "@/hooks/useTimeUnits";
const { Option } = Select;

const InspectionFrequencyItem = () => {
  const i18n = useIntl();
  const { weekList, FrequencyTypes, FixedTimeUnits } = useTimeUnits();

  const HourTime = () => (
    <Form.Item noStyle name={"time"} initialValue={"00:00"}>
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
    return (
      <Form.Item noStyle name={"week"} initialValue={0}>
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
    return (
      <Space>
        <Form.Item noStyle name={"interval"} initialValue={15}>
          <InputNumber min={0} />
        </Form.Item>
        <Form.Item noStyle name={"unit"} initialValue={0}>
          <Select style={{ width: 100 }}>
            {FixedTimeUnits.map((item) => (
              <Option key={item.key} value={item.key}>
                {item.label}
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
    <Form.Item
      required
      label={i18n.formatMessage({ id: "alarm.inspectionFrequency" })}
    >
      <Space className={frequencyStyle.spaceMain}>
        <Form.Item noStyle name={"type"} initialValue={3}>
          <Select disabled className={frequencyStyle.selectType}>
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
    </Form.Item>
  );
};
export default InspectionFrequencyItem;
