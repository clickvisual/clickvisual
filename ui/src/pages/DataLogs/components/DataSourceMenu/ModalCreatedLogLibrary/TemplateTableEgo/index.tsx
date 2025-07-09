import { Form, Input, InputNumber } from "antd";
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
        initialValue="kafka-service.default:9092"
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
      <Form.Item
        name={"topicsApp"}
        label={"App stdout topic"}
        initialValue="app-stdout-logs-ilogtail"
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
        initialValue="ego-stdout-logs-ilogtail"
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
        name={"topicsIngressStdout"}
        label={"Ingress stdout topic"}
        initialValue="ingress-stdout-logs-ilogtail"
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
        name={"topicsIngressStderr"}
        label={"Ingress stderr topic"}
        initialValue="ingress-stderr-logs-ilogtail"
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
