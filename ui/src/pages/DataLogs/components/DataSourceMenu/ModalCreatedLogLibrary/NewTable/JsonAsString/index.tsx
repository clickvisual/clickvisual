import { Form, Input, Select, Switch } from "antd";
import styles from "./index.less";
import { logLibraryTypes } from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import { useIntl } from "umi";

const { Option } = Select;

const JsonAsString = () => {
  const i18n = useIntl();

  return (
    <>
      <Form.Item
        label={i18n.formatMessage({
          id: "datasource.logLibrary.isLinkLogLibrary",
        })}
        name="v3TableType"
        initialValue={false}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({
          id: "datasource.logLibrary.usingSystemTime",
        })}
        name="isKafkaTimestamp"
        initialValue={true}
        valuePropName="checked"
      >
        <Switch defaultChecked />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(pre, next) =>
          pre.isKafkaTimestamp != next.isKafkaTimestamp
        }
      >
        {({ getFieldValue }) => {
          const isKafkaTimestamp = getFieldValue("isKafkaTimestamp");
          if (Number(isKafkaTimestamp) == 1) return <></>;
          return (
            <Form.Item label=" " colon={false}>
              <div className={styles.flexBox}>
                <div className={styles.lableBox}>
                  <div>
                    {i18n.formatMessage({
                      id: "datasource.logLibrary.from.timeField",
                    })}
                  </div>
                  <div>
                    {i18n.formatMessage({
                      id: "datasource.logLibrary.from.type",
                    })}
                  </div>
                </div>
                <div className={styles.itemBox}>
                  <div className={styles.timeField}>
                    <Form.Item name={"timeField"}>
                      <Input placeholder="timestamp" />
                    </Form.Item>
                  </div>
                  <div className={styles.timeFieldType}>
                    <Form.Item name={"timeFieldType"}>
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
                  </div>
                </div>
              </div>
            </Form.Item>
          );
        }}
      </Form.Item>
    </>
  );
};
export default JsonAsString;
