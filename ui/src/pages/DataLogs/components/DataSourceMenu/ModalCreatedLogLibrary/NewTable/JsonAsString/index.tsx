import { Form, Input, Select } from "antd";
import { logLibraryTypes } from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import { useIntl } from "umi";

const { Option } = Select;

const JsonAsString = () => {
  const i18n = useIntl();

  return (
    <>
      <Form.Item
        label="使用kafka采集时间作为时间轴"
        name="isKafkaTimestamp"
        required
        initialValue={1}
      >
        <Select
          placeholder={`${i18n.formatMessage({
            id: "datasource.logLibrary.placeholder.type",
          })}`}
        >
          <Option value={1}>yes</Option>
          <Option value={0}>no</Option>
        </Select>
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(pre, next) =>
          pre.isKafkaTimestamp != next.isKafkaTimestamp
        }
      >
        {({ getFieldValue }) => {
          const isKafkaTimestamp = getFieldValue("isKafkaTimestamp");
          if (isKafkaTimestamp == 1) return <></>;
          return (
            <>
              <Form.Item
                label={i18n.formatMessage({
                  id: "datasource.logLibrary.from.timeField",
                })}
                name={"timeField"}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label={i18n.formatMessage({
                  id: "datasource.logLibrary.from.type",
                })}
                name={"timeFieldType"}
              >
                <Select
                  placeholder={`${i18n.formatMessage({
                    id: "datasource.logLibrary.placeholder.type",
                  })}`}
                >
                  {logLibraryTypes.map((item) => (
                    <Option key={item.value} value={item.value}>
                      {item.type}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          );
        }}
      </Form.Item>
    </>
  );
};
export default JsonAsString;
