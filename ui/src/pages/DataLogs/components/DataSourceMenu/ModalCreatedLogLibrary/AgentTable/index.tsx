import { Form, Input } from "antd";
import { useIntl } from "umi";

export interface TemplateTableType {
  //   formRef: any;
}
const AgentTable = (props: TemplateTableType) => {
  const i18n = useIntl();

  return (
    <>
      <Form.Item
        name={"name"}
        label={i18n.formatMessage({
          id: "datasource.logLibrary.from.tableName",
        })}
        rules={[
          {
            required: true,
            message: i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.tableName",
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
    </>
  );
};

export default AgentTable;
