import {Form, Input, InputNumber} from "antd";
import {useIntl} from "umi";

export interface TemplateTableType {
  //   formRef: any;
}
const TemplateTableILogtail = (props: TemplateTableType) => {
  const i18n = useIntl();

  return (
    <>
        <Form.Item
            name={"name"}
            label= {i18n.formatMessage({ id: "datasource.logLibrary.from.tableName" })}
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
                placeholder={i18n.formatMessage(
                    { id: "input.placeholder" },
                    { name: "table name" }
                )}
            />
        </Form.Item>
      <Form.Item
        name={"brokers"}
        label={i18n.formatMessage({
            id: "datasource.logLibrary.from.brokers",
        })}
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
        name={"topic"}
        label={"Topic"}
        rules={[{ required: true }]}
      >
        <Input
          placeholder={i18n.formatMessage(
            { id: "input.placeholder" },
            { name: "kafka topic" }
          )}
        />
      </Form.Item>
      <Form.Item
        name={"days"}
        label={"TTL(day)"}
        rules={[{ required: true }]}
      >
        <InputNumber
          placeholder={i18n.formatMessage(
            { id: "input.placeholder" },
            { name: "TTL" }
          )}
        />
      </Form.Item>
    </>
  );
};
export default TemplateTableILogtail;
