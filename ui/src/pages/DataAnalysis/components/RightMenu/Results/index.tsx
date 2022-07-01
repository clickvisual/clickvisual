import { Drawer, Form, Select, Table, Tabs } from "antd";
import { ColumnsType } from "antd/lib/table";
import { useEffect, useMemo, useState } from "react";
import style from "./index.less";
import MonacoEditor from "react-monaco-editor";
import { useModel } from "umi";

const { Option } = Select;
const { TabPane } = Tabs;

const Results = (props: {
  visible: boolean;
  setVisible: (flag: boolean) => void;
}) => {
  const [SQLForm] = Form.useForm();
  const { visible, setVisible } = props;
  const { sqlQueryResults } = useModel("dataAnalysis");
  const [sqlQueryData, setSqlQueryData] = useState<any>([]);
  const [SQLContent, setSQLcontent] = useState<string>("");

  const onClose = () => {
    setVisible(false);
  };

  const SQLList = Object.keys(sqlQueryResults?.involvedSQLs || {}) || [];

  const columns: ColumnsType<any> = useMemo(() => {
    const columnArr: ColumnsType = [];
    if (
      sqlQueryResults &&
      sqlQueryResults?.logs &&
      sqlQueryResults.logs?.length > 0
    ) {
      const fields = Object.keys(sqlQueryResults.logs[0]) || [];
      const list = [];
      for (const itemIndex in sqlQueryResults.logs) {
        list.push({
          ...sqlQueryResults.logs[itemIndex],
          key: parseInt(itemIndex) + 1,
        });
      }
      setSqlQueryData(list);
      for (const fieldIndex in fields) {
        columnArr.push({
          title: fields[fieldIndex],
          dataIndex: fields[fieldIndex],
          width: 200,
          align: "left",
        });
      }
    } else {
      setSqlQueryData([]);
    }
    return columnArr;
  }, [sqlQueryResults]);

  useEffect(() => {
    if (visible) {
      if (SQLList.length > 0) {
        const key = sqlQueryResults?.involvedSQLs[SQLList[0]];
        SQLForm.setFieldsValue({ key: key });
        setSQLcontent(key);
      }
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setSQLcontent("");
      setSqlQueryData([]);
      SQLForm.resetFields();
    }
  }, [visible]);

  const involvedSQLsContent = (
    <div className={style.involvedSQLsContent}>
      <div className={style.select}>
        <Form form={SQLForm}>
          <Form.Item name={"key"} label={"key"}>
            <Select
              showSearch
              allowClear
              style={{ width: "278px" }}
              placeholder={"请选择查看"}
              onChange={(value: string) => {
                setSQLcontent(sqlQueryResults?.involvedSQLs[value]);
              }}
            >
              {SQLList.map((item: string) => {
                return (
                  <Option key={item} value={item}>
                    {item}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
        </Form>
      </div>
      <div className={style.monacoEditor}>
        <MonacoEditor
          height={"100%"}
          language={"mysql"}
          theme="vs-white"
          options={{
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: {
              enabled: true,
            },
            readOnly: true,
          }}
          value={SQLContent}
        />
      </div>
    </div>
  );

  return (
    <Drawer
      title="运行结果"
      placement="right"
      onClose={onClose}
      visible={visible}
      width={"50vw"}
    >
      <div className={style.infoList}>
        <div className={style.infoItem}>
          <div className={style.infoKey}>message: </div>
          <div className={style.infoValue}>
            {sqlQueryResults?.message && sqlQueryResults.message.length > 0
              ? sqlQueryResults.message
              : "-"}
          </div>
        </div>
      </div>

      <Tabs defaultActiveKey="logs">
        <TabPane tab="logs" key="logs">
          <Table
            size={"small"}
            scroll={{ x: "max-content" }}
            columns={columns}
            dataSource={sqlQueryData}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
            }}
          />
        </TabPane>
        <TabPane tab="involvedSQLs" key="involvedSQLs">
          {involvedSQLsContent}
        </TabPane>
      </Tabs>
    </Drawer>
  );
};

export default Results;
