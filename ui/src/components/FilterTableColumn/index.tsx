import { Button, Input, Space } from 'antd';
import IconFont from '@/components/IconFont';
import { SearchOutlined } from '@ant-design/icons';

const FilterTableColumn = (dataIndex: string) => {
  return {
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={'请输入查询条件'}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: any) => (
      <IconFont
        type={'icon-search'}
        size={32}
        style={{ color: filtered ? '#1890ff' : undefined }}
      />
    ),
    onFilter: (value: any, record: any) =>
      record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : '',
  };
};
export default FilterTableColumn;
