import { Button, Form, Select } from 'antd';
import { useModel } from '@@/plugin-model/useModel';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import styles from './index.less';
const { Option } = Select;
const DetailList = () => {
  const { commonInfo } = useModel('pms');
  return (
    <Form.List
      name={'details'}
      rules={[
        {
          validator: async (_, details) => {
            if (!details || details.length < 1) {
              return Promise.reject(new Error('请增加资源授权'));
            }
            return undefined;
          },
        },
      ]}
    >
      {(fields, option, { errors }) => (
        <>
          {fields.map((field) => (
            <div key={`details-${field.key}`} className={styles.formList}>
              <Form.Item
                {...field}
                fieldKey={field.fieldKey}
                label={'子资源'}
                name={[field.name, 'subResources']}
                className={styles.formActItem}
                rules={[
                  {
                    required: true,
                    message: '请选择子资源',
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  allowClear
                  placeholder={'请选择子资源'}
                  onChange={(val) => {}}
                >
                  {commonInfo?.app_subResources_info.map((item) => (
                    <Option key={`acts-${item.name}`} value={item.name}>
                      {item.desc}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                {...field}
                fieldKey={field.fieldKey}
                label={'准许操作'}
                name={[field.name, 'acts']}
                className={styles.formSourceItem}
                rules={[
                  {
                    required: true,
                    message: '请选择准许操作',
                  },
                ]}
              >
                <Select mode="multiple" allowClear placeholder={'请选择准许操作'}>
                  {commonInfo?.all_acts_info.map((item) => (
                    <Option key={`subResources-${item.name}`} value={item.name}>
                      {item.desc}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <MinusCircleOutlined
                className={styles.icon}
                onClick={() => option.remove(field.name)}
              />
            </div>
          ))}
          <Form.Item noStyle>
            <Button type="dashed" onClick={() => option.add()} block icon={<PlusOutlined />}>
              新增资源授权
            </Button>
            <Form.ErrorList errors={errors} />
          </Form.Item>
        </>
      )}
    </Form.List>
  );
};
export default DetailList;
