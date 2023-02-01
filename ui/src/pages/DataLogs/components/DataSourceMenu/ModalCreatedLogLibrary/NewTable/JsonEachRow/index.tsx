import {useIntl} from "umi";
import {Button, Form, Input, message, Select} from "antd";
import {logLibraryTypes} from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import styles from "./index.less";
import TextArea from "antd/lib/input/TextArea";

const { Option } = Select;

const JsonEachRow = ({
  formRef,
  onConversionMappingJson,
}: {
  formRef: any;
  onConversionMappingJson: any;
}) => {
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
            <Button className={styles.sourceButton} onClick={handelConversion}>
              {i18n.formatMessage({
                id: "datasource.logLibrary.conversionBtn",
              })}
            </Button>
            <Button
              type="link"
              href="https://clickvisual.gocn.vip/zh/clickvisual/02install/quick-start.html#第六步-创建日志库"
              target="_blank"
            >
              {i18n.formatMessage({ id: "datasource.logLibrary.documentBtn" })}
            </Button>
          </div>
        </div>
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({
          id: "datasource.logLibrary.from.rawLogField",
        })}
        name={"rawLogField"}
        rules={[
          {
            required: true,
            message: i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.rawLogField",
            }),
          },
        ]}
      >
        <Input disabled />
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
    </>
  );
};
export default JsonEachRow;
