import style from "@/pages/DataAnalysis/DataSourceManage/index.less";
import { Button, Form, FormInstance, Select, Space } from "antd";
import { useModel, useIntl } from "umi";
import { useEffect, useRef } from "react";
const { Option } = Select;
const SearchBar = () => {
  const i18n = useIntl();
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

  useEffect(() => {
    onSearch(currentInstances as number);
  }, []);

  return (
    <div className={style.searchBar}>
      <Form
        ref={dataSourceFormRef}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        layout="inline"
      >
        <Space>
          <Form.Item
            label={i18n.formatMessage({
              id: "log.editDatabaseModel.label.datasourceType",
            })}
            style={{ margin: 0 }}
            name="typ"
            shouldUpdate
          >
            <Select
              style={{ width: "300px" }}
              placeholder={i18n.formatMessage({
                id: "bigdata.dataSourceManage.searchBar.dataSourceType.placeholder",
              })}
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
          <Form.Item noStyle>
            <Button
              // type="primary"
              onClick={() => {
                onSearch(currentInstances as number, {
                  typ: currentTyp as number,
                });
              }}
            >
              {i18n.formatMessage({ id: "search" })}
            </Button>
          </Form.Item>
          <Form.Item noStyle>
            <Button type="primary" onClick={handleCreate}>
              {i18n.formatMessage({
                id: "bigdata.dataSourceManage.searchBar.dataSourceType.create",
              })}
            </Button>
          </Form.Item>
        </Space>
      </Form>
    </div>
  );
};
export default SearchBar;
