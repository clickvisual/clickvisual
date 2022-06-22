import style from "@/pages/DataAnalysis/DataSourceManage/index.less";
import { Button, Form, FormInstance, Select, Space } from "antd";
import { useModel } from "umi";
import { useEffect, useRef } from "react";
const { Option } = Select;
const SearchBar = () => {
  const { dataSourceManage, currentInstances } = useModel("dataAnalysis");
  const dataSourceFormRef = useRef<FormInstance>(null);
  const {
    changeCurrentTyp,
    changeVisibleDataSource,
    typList,
    onSearch,
    currentTyp,
    changeSourceList,
  } = dataSourceManage;

  const handleCreate = () => {
    changeVisibleDataSource(true);
  };

  useEffect(() => {
    changeSourceList([]);
    dataSourceFormRef.current?.resetFields();
  }, [currentInstances]);

  return (
    <div className={style.searchBar}>
      <Form
        ref={dataSourceFormRef}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        layout="inline"
      >
        <Space>
          <Form.Item
            label="数据源类型"
            style={{ margin: 0 }}
            name="typ"
            shouldUpdate
          >
            <Select
              style={{ width: "300px" }}
              placeholder={"请选择数据源类型"}
              allowClear
              onChange={(value: number) => {
                changeCurrentTyp(value);
                onSearch(currentInstances as number, { typ: value as number });
              }}
            >
              {typList.map((item: { value: number; title: string }) => {
                return (
                  <Option value={item.value} key={item.value}>
                    {item.title}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              onClick={() => {
                onSearch(currentInstances as number, {
                  typ: currentTyp as number,
                });
              }}
            >
              搜索
            </Button>
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleCreate}>
              新增数据源
            </Button>
          </Form.Item>
        </Space>
      </Form>
    </div>
  );
};
export default SearchBar;
