import classNames from "classnames";
import mangeIndexModalStyles from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/index.less";
import { Button, Form, FormInstance, Input, Select } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { FormListFieldData, FormListOperation } from "antd/es/form/FormList";
import { IndexInfoType } from "@/services/dataLogs";
import { useIntl } from "umi";

const { Option } = Select;

// 0 text 1 long 2 double 3 json
const typeList = [
  { value: 0, type: "string" },
  { value: 1, type: "int" },
  { value: 2, type: "float" },
];

type TableBodyProps = {
  form: FormInstance;
  fields: FormListFieldData[];
  options: FormListOperation;
};
const TableBody = (props: TableBodyProps) => {
  const { fields, options, form } = props;
  const i18n = useIntl();
  return (
    <tbody className={classNames(mangeIndexModalStyles.tableBody)}>
      {fields.map((field, index) => (
        <tr
          className={classNames(mangeIndexModalStyles.tableTr)}
          key={field.key}
        >
          <td>
            <Form.Item
              name={[field.name, "field"]}
              rules={[
                { required: true, message: "" },
                {
                  validator: (_, value) => {
                    const list = form
                      .getFieldValue(["data"])
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
                placeholder={`${i18n.formatMessage({
                  id: "log.index.manage.placeholder.indexName",
                })}`}
              />
            </Form.Item>
          </td>
          <td>
            <Form.Item noStyle name={[field.name, "typ"]}>
              <Select style={{ width: "100%" }}>
                {typeList.map((item) => (
                  <Option key={item.value} value={item.value}>
                    {item.type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </td>
          <td>
            <Form.Item noStyle name={[field.name, "alias"]}>
              <Input
                placeholder={`${i18n.formatMessage({
                  id: "log.index.manage.placeholder.alias",
                })}`}
              />
            </Form.Item>
          </td>
          <td>
            <Button
              onClick={() => options.remove(field.name)}
              type="primary"
              danger
              icon={<CloseOutlined />}
            >
              {i18n.formatMessage({ id: "log.index.manage.button.deleted" })}
            </Button>
          </td>
        </tr>
      ))}
    </tbody>
  );
};
export default TableBody;
