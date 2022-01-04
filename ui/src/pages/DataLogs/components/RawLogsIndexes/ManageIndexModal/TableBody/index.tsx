import classNames from 'classnames';
import mangeIndexModalStyles from '@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/index.less';
import { Button, Form, FormInstance, Input, Select } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { FormListFieldData, FormListOperation } from 'antd/es/form/FormList';
import { IndexInfoType } from '@/services/dataLogs';

const { Option } = Select;

// 0 text 1 long 2 double 3 json
const typeList = [
  { value: 0, type: 'text' },
  { value: 1, type: 'long' },
  { value: 2, type: 'double' },
];

type TableBodyProps = {
  form: FormInstance;
  fields: FormListFieldData[];
  options: FormListOperation;
};
const TableBody = (props: TableBodyProps) => {
  const { fields, options, form } = props;
  return (
    <tbody className={classNames(mangeIndexModalStyles.tableBody)}>
      {fields.map((field, index) => (
        <tr className={classNames(mangeIndexModalStyles.tableTr)} key={field.key}>
          <td>
            <Form.Item
              name={[field.name, 'field']}
              rules={[
                { required: true, message: '' },
                {
                  validator: (_, value) => {
                    const list = form
                      .getFieldValue(['data'])
                      ?.map((item: IndexInfoType) => item.field);
                    if (list.indexOf(value) < index) {
                      return Promise.reject();
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="必填且不可重复，请输入索引名称" />
            </Form.Item>
          </td>
          <td>
            <Form.Item noStyle name={[field.name, 'typ']}>
              <Select style={{ width: '100%' }}>
                {typeList.map((item) => (
                  <Option key={item.value} value={item.value}>
                    {item.type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </td>
          <td>
            <Form.Item noStyle name={[field.name, 'alias']}>
              <Input placeholder="请输入别名" />
            </Form.Item>
          </td>
          <td>
            <Button
              onClick={() => options.remove(field.name)}
              type="primary"
              danger
              icon={<CloseOutlined />}
            >
              删除索引
            </Button>
          </td>
        </tr>
      ))}
    </tbody>
  );
};
export default TableBody;
