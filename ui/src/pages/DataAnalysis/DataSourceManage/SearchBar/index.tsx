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
    doGetSourceList,
    currentTyp,
    changeSourceList,
  } = dataSourceManage;

  const onSearch = (file: { typ: number }) => {
    doGetSourceList
      .run({ iid: currentInstances as number, typ: file.typ as number })
      .then((res: any) => {
        if (res.code == 0) {
          changeSourceList(res.data);
        }
      });
  };

  const handleCreate = () => {
    changeVisibleDataSource(true);
  };

  // useEffect(() => {
  //   // changeCurrentTyp(DataSourceReqTypEnums.mysql);
  //   onSearch();
  // }, []);

  useEffect(() => {
    changeSourceList([]);
    dataSourceFormRef.current?.resetFields();
  }, [currentInstances]);

  return (
    <div className={style.searchBar}>
      {/* <Space>
        <span className={style.label}>数据源类型： </span>
        <Select
          style={{ width: "300px" }}
          value={currentTyp}
          onChange={(value: number) => {
            changeCurrentTyp(value);
            onSearch();
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
        <Button type="primary" onClick={onSearch}>
          搜索
        </Button>
        <Button type="primary" onClick={handleCreate}>
          新增数据源
        </Button>
      </Space> */}

      <Form
        ref={dataSourceFormRef}
        onFinish={onSearch}
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
                onSearch({ typ: value as number });
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
                onSearch({ typ: currentTyp as number });
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
