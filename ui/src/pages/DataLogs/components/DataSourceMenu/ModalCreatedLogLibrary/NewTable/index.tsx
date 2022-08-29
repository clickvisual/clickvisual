import { Button, Form, Input, InputNumber, message, Select } from "antd";
import { logLibraryTypes } from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import { useIntl } from "umi";
import styles from "./index.less";
import TextArea from "antd/lib/input/TextArea";

const { Option } = Select;

const NewTable = (props: {
  onConversionMappingJson: (str: string) => void;
  formRef: any;
}) => {
  const { onConversionMappingJson, formRef } = props;
  const i18n = useIntl();

  const handelConversion = () => {
    const sourceValue = formRef.current.getFieldValue("source");
    if (sourceValue && sourceValue.trim().length > 0) {
      onConversionMappingJson(sourceValue);
      return;
    }
    message.warning(
      i18n.formatMessage({ id: "datasource.logLibrary.conversion.warning" })
    );
  };

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
      <Form.Item label={"source"} required>
        <div className={styles.sourceRow}>
          <Form.Item
            name="source"
            noStyle
            required
            rules={[
              {
                required: true,
                message: i18n.formatMessage({
                  id: "datasource.logLibrary.placeholder.source",
                }),
              },
            ]}
          >
            <TextArea
              autoSize={{ minRows: 3, maxRows: 8 }}
              placeholder={i18n.formatMessage({
                id: "datasource.logLibrary.placeholder.source",
              })}
            ></TextArea>
          </Form.Item>
          <div className={styles.buttonBox}>
            <Button
              className={styles.sourceButton}
              onClick={handelConversion}
              // loading={doGetMappingJson.loading}
            >
              {i18n.formatMessage({
                id: "datasource.logLibrary.conversionBtn",
              })}
            </Button>
            <Button
              type="link"
              href="https://clickvisual.gocn.vip/clickvisual/02install/quick-start.html#source-%E8%AF%B4%E6%98%8E"
              target="_blank"
            >
              {i18n.formatMessage({ id: "datasource.logLibrary.documentBtn" })}
            </Button>
          </div>
        </div>
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({
          id: "datasource.logLibrary.from.timeField",
        })}
        name={"timeField"}
        rules={[
          {
            required: true,
            message: i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.timeField",
            }),
          },
        ]}
      >
        <Input disabled />
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({ id: "datasource.logLibrary.from.type" })}
        name={"timeFieldType"}
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
