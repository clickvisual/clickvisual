import { Form, Input, InputNumber, Select } from "antd";
import { logLibraryTypes } from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import { useIntl } from "umi";

const { Option } = Select;

const NewTable = () => {
  const i18n = useIntl();
  return (
    <>
      <Form.Item
        label={i18n.formatMessage({
          id: "datasource.logLibrary.from.tableName",
        })}
        name={"tableName"}
        rules={[
          {
            required: true,
            message: i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.tableName",
            }),
          },
          {
            pattern: new RegExp(/^[a-zA-Z_]+$/),
            message: i18n.formatMessage({
              id: "datasource.logLibrary.from.rule.tableName",
            }),
          },
        ]}
      >
        <Input
          placeholder={`${i18n.formatMessage({
            id: "datasource.logLibrary.placeholder.tableName",
          })}`}
        />
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({ id: "datasource.logLibrary.from.type" })}
        name={"typ"}
        rules={[
          {
            required: true,
            message: i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.type",
            }),
          },
        ]}
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
      <Form.Item
        label={i18n.formatMessage({ id: "datasource.logLibrary.from.days" })}
        name={"days"}
        rules={[
          {
            required: true,
            message: i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.days",
            }),
          },
        ]}
      >
        <InputNumber
          placeholder={`${i18n.formatMessage({
            id: "datasource.logLibrary.placeholder.days",
          })}`}
          min={0}
          style={{ width: "100%" }}
        />
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({
          id: "datasource.logLibrary.from.brokers",
        })}
        name={"brokers"}
        rules={[
          {
            required: true,
            message: i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.brokers",
            }),
          },
        ]}
      >
        <Input
          placeholder={`${i18n.formatMessage({
            id: "datasource.logLibrary.placeholder.brokers",
          })}`}
        />
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({
          id: "datasource.logLibrary.from.topics",
        })}
        name={"topics"}
        rules={[
          {
            required: true,
            message: i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.topics",
            }),
          },
          {
            pattern: new RegExp(/^[a-zA-Z0-9\-_.]+$/),
            message: i18n.formatMessage({
              id: "datasource.logLibrary.from.rule.topics",
            }),
          },
        ]}
      >
        <Input
          placeholder={`${i18n.formatMessage({
            id: "datasource.logLibrary.placeholder.topics",
          })}`}
        />
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({
          id: "datasource.logLibrary.from.consumers",
        })}
        name={"consumers"}
        rules={[
          {
            required: true,
            message: i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.consumers",
            }),
          },
        ]}
        initialValue={1}
      >
        <InputNumber
          min={0}
          style={{ width: "100%" }}
          placeholder={`${i18n.formatMessage({
            id: "datasource.logLibrary.placeholder.consumers",
          })}`}
        />
      </Form.Item>
    </>
  );
};
export default NewTable;
