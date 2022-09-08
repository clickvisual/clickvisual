import { Form, Input, InputNumber } from "antd";
import { useIntl } from "umi";
import TextArea from "antd/lib/input/TextArea";
import JsonAsString from "./JsonAsString";
import JsonEachRow from "./JsonEachRow";

const NewTable = (props: {
  onConversionMappingJson: (str: string) => void;
  formRef: any;
  mode: number;
}) => {
  const { onConversionMappingJson, formRef, mode } = props;
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
            pattern: new RegExp(/^[a-zA-Z_0-9]+$/),
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

      {/* ? V3 : V2 */}
      {mode == 2 ? (
        <JsonAsString />
      ) : (
        <JsonEachRow
          formRef={formRef}
          onConversionMappingJson={onConversionMappingJson}
        />
      )}

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
      <Form.Item
        label={"kafkaSkipBrokenMessages"}
        name={"kafkaSkipBrokenMessages"}
        initialValue={0}
      >
        <InputNumber min={0} style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item
        label={i18n.formatMessage({
          id: "description",
        })}
        name="desc"
      >
        <TextArea
          rows={3}
          placeholder={i18n.formatMessage({
            id: "datasource.logLibrary.from.newLogLibrary.desc.placeholder",
          })}
        ></TextArea>
      </Form.Item>
    </>
  );
};
export default NewTable;
