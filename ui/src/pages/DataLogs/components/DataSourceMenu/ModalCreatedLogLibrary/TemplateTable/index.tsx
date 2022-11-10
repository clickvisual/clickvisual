import { Form, Input } from "antd";
import { useIntl } from "umi";

export interface TemplateTableType {
  //   formRef: any;
}
const TemplateTable = (props: TemplateTableType) => {
  const i18n = useIntl();

  return (
    <>
      <Form.Item
        name={"brokers"}
        label={"Brokers"}
        rules={[{ required: true }]}
      >
        <Input
          placeholder={i18n.formatMessage(
            { id: "input.placeholder" },
            { name: "Brokers" }
          )}
        />
      </Form.Item>
      <Form.Item
        name={"topicsApp"}
        label={"App stdout topic"}
        rules={[{ required: true }]}
      >
        <Input
          placeholder={i18n.formatMessage(
            { id: "input.placeholder" },
            { name: "App stdout topic" }
          )}
        />
      </Form.Item>
      <Form.Item
        name={"topicsEgo"}
        label={"Ego stdout topic"}
        rules={[{ required: true }]}
      >
        <Input
          placeholder={i18n.formatMessage(
            { id: "input.placeholder" },
            { name: "Ego stdout topic" }
          )}
        />
      </Form.Item>
      <Form.Item
        name={"topicsIngressStderr"}
        label={"Ingress stdout topic"}
        rules={[{ required: true }]}
      >
        <Input
          placeholder={i18n.formatMessage(
            { id: "input.placeholder" },
            { name: "Ingress stdout topic" }
          )}
        />
      </Form.Item>
      <Form.Item
        name={"topicsIngressStdout"}
        label={"Ingress stderr topic"}
        rules={[{ required: true }]}
      >
        <Input
          placeholder={i18n.formatMessage(
            { id: "input.placeholder" },
            { name: "Ingress stderr topic" }
          )}
        />
      </Form.Item>
    </>
  );
};
export default TemplateTable;
