import style from "@/pages/DataAnalysis/DataSourceManage/index.less";
import { Button, Select, Space } from "antd";
import { useModel } from "umi";
const { Option } = Select;
const SearchBar = () => {
  const { dataSourceManage } = useModel("dataAnalysis");
  const { onSearch, changeCurrentTyp, changeVisibleDataSource, typList } =
    dataSourceManage;

  const handleCreate = () => {
    changeVisibleDataSource(true);
  };

  return (
    <div className={style.searchBar}>
      <Space>
        <span className={style.label}>数据源类型： </span>
        <Select
          style={{ width: "300px" }}
          onChange={(value: number) => changeCurrentTyp(value)}
        >
          {typList.map((item: { value: number; title: string }) => {
            return (
              <Option value={item.value} key={item.value}>
                {item.title}
              </Option>
            );
          })}
        </Select>
        <Button type="primary" onClick={onSearch}>
          搜索
        </Button>
        <Button type="primary" onClick={handleCreate}>
          新增数据源
        </Button>
      </Space>

      {/* <Form
          ref={dataSourceFormRef}
          onFinish={handleSubmit}
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 19 }}
        >
          <Form.Item label="数据源类型" style={{ margin: 0 }} name="typ">
          </Form.Item>
          <Form.Item noStyle>
          </Form.Item>
        </Form> */}
    </div>
  );
};
export default SearchBar;
