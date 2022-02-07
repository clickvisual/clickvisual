import { Button, Input, Space } from "antd";
import IconFont from "@/components/IconFont";
import { SearchOutlined } from "@ant-design/icons";
import { useIntl } from "umi";

const FilterTableColumn = (dataIndex: string) => {
  const i18n = useIntl();
  return {
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: any) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`${i18n.formatMessage({
            id: "table.column.filter.placeholder",
          })}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            {i18n.formatMessage({
              id: "button.search",
            })}
          </Button>
          <Button
            onClick={() => clearFilters()}
            size="small"
            style={{ width: 90 }}
          >
            {i18n.formatMessage({
              id: "table.column.filter.reset",
            })}
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: any) => (
      <IconFont
        type={"icon-search"}
        size={32}
        style={{ color: filtered ? "#1890ff" : undefined }}
      />
    ),
    onFilter: (value: any, record: any) =>
      record[dataIndex]
        ? record[dataIndex]
            .toString()
            .toLowerCase()
            .includes(value.toLowerCase())
        : "",
  };
};
export default FilterTableColumn;
