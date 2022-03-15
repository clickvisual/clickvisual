import classNames from "classnames";
import mangeIndexModalStyles from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/index.less";
import { Form, FormInstance, Input, Select, Space } from "antd";
import { FormListFieldData, FormListOperation } from "antd/es/form/FormList";
import {
  FieldType,
  typeList,
} from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/TableBody/IndexItem";
import { IndexInfoType } from "@/services/dataLogs";
import { useIntl } from "umi";
import { MinusCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";
const { Option } = Select;

type JsonIndexItemProps = {
  form: FormInstance;
  index: number;
  field: FormListFieldData;
  fields: FormListFieldData[];
  indexField: FormListFieldData;
  options: FormListOperation;
  rootName: string;
};
const Index = ({
  form,
  field,
  fields,
  options,
  index,
  indexField,
  rootName,
}: JsonIndexItemProps) => {
  const i18n = useIntl();
  return (
    <div className={classNames(mangeIndexModalStyles.isJsonDiv)}>
      <Space style={{ width: "100%" }}>
        <Form.Item
          name={[field.name, "field"]}
          rules={[
            { required: true, message: "" },
            {
              validator: async (_, value) => {
                const list = form
                  .getFieldValue(["data", indexField.name, "jsonIndex"])
                  ?.map((item: IndexInfoType) => item.field);
                if (list.indexOf(value) < index) {
                  return Promise.reject();
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            style={{ width: 240 }}
            placeholder={`${i18n.formatMessage({
              id: "log.index.manage.placeholder.indexName",
            })}`}
          />
        </Form.Item>
        <Form.Item noStyle name={[field.name, "typ"]}>
          <Select style={{ width: 220 }}>
            {typeList
              .filter((item) => item.value !== 3)
              .map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.type}
                </Option>
              ))}
          </Select>
        </Form.Item>
        <Form.Item noStyle name={[field.name, "alias"]}>
          <Input
            style={{ width: 220 }}
            placeholder={`${i18n.formatMessage({
              id: "log.index.manage.placeholder.alias",
            })}`}
          />
        </Form.Item>
        <Form.Item noStyle>
          <Space>
            <PlusCircleOutlined
              onClick={() =>
                options.add({
                  typ: FieldType.String,
                  rootName: rootName,
                  alias: undefined,
                })
              }
            />
            {fields.length > 1 && (
              <MinusCircleOutlined onClick={() => options.remove(field.name)} />
            )}
          </Space>
        </Form.Item>
      </Space>
    </div>
  );
};
export default Index;
