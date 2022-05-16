import { Form, Select } from "antd";
import conditionStyles from "@/pages/Alarm/Rules/components/FormAlarmDraw/TriggerConditionItem/index.less";
import { useIntl } from "umi";
import { NoDataConfigList } from "@/pages/Alarm/service/type";

const { Option } = Select;

const MoreOptions = () => {
  const i18n = useIntl();
  return (
    <div className={conditionStyles.moreOptions}>
      <Form.Item
        label={i18n.formatMessage({ id: "alarm.rules.form.noDataOp" })}
        name={"noDataOp"}
        initialValue={0}
        required
      >
        <Select>
          {NoDataConfigList.map((item) => (
            <Option key={item.value} value={item.value}>
              {item.label}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </div>
  );
};
export default MoreOptions;
