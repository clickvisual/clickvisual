import { Button, Drawer, Form, Select, Tabs } from "antd";
import { ColumnsType } from "antd/lib/table";
import { useEffect, useMemo, useState } from "react";
import style from "./index.less";
import MonacoEditor from "react-monaco-editor";
import Luckysheet from "../Luckysheet";
import { useModel, useIntl } from "umi";
import { format } from "sql-formatter";

const { Option } = Select;
const { TabPane } = Tabs;

const Results = (props: {
  visible: boolean;
  setVisible: (flag: boolean) => void;
}) => {
  const [SQLForm] = Form.useForm();
  const i18n = useIntl();
  const { visible, setVisible } = props;
  const { sqlQueryResults } = useModel("dataAnalysis");
  const [SQLContent, setSQLcontent] = useState<string>("");
  const [activeKey, setActiveKey] = useState<string>("logs");

  const onClose = () => {
    setVisible(false);
  };

  const currentResults = sqlQueryResults;
  const SQLList = Object.keys(currentResults?.involvedSQLs || {}) || [];

  const columns: ColumnsType<any> = useMemo(() => {
    const columnArr: any = [];
    if (
      currentResults &&
      currentResults?.logs &&
      currentResults.logs?.length > 0
    ) {
      const fields = Object.keys(currentResults.logs[0]) || [];
      for (const fieldIndex in fields) {
        columnArr.push({
          r: 0,
          c: parseInt(fieldIndex),
          v: {
            ct: { fa: "General", t: "g" },
            m: fields[fieldIndex],
            v: fields[fieldIndex],
          },
        });
      }
      for (const itemIndex in currentResults.logs) {
        for (const fieldIndex in fields) {
          columnArr.push({
            r: parseInt(itemIndex) + 1,
            c: parseInt(fieldIndex),
            v: {
              ct: { fa: "General", t: "g" },
              m: currentResults.logs[itemIndex][fields[fieldIndex]],
              v: currentResults.logs[itemIndex][fields[fieldIndex]],
            },
          });
        }
      }
    }
    // return [
    //   {
    //     r: 0,
    //     c: 0,
    //     ct: {
    //       fa: "General",
    //       t: "g",
    //     },
    //     m: "active_source",
    //     v: "active_source",
    //     fc: "#ff0000",
    //   },
    // ];
    return columnArr;
  }, [currentResults]);

  useEffect(() => {
    if (visible) {
      if (SQLList.length > 0) {
        const key = currentResults?.involvedSQLs[SQLList[0]];
        SQLForm.setFieldsValue({ key: SQLList[0] });
        setSQLcontent(key);
      }
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setSQLcontent("");
      SQLForm.resetFields();
      setActiveKey("logs");
    }
  }, [visible]);

  // const onSave = () => {
  //   const luckysheet = window.luckysheet;
  //   // console.log(luckysheet.getAllSheets());

  //   let a: any = [];
  //   luckysheet.getcellvalue().map((item: any) => {
  //     let b = item.filter((items: any) => items != null);
  //     a.push(...b);
  //   });
  //   console.log(a);
  // };

  const involvedSQLsContent = (
    <div className={style.involvedSQLsContent}>
      <div className={style.select}>
        <Form form={SQLForm}>
          <Form.Item name={"key"} label={"key"}>
            <Select
              showSearch
              allowClear
              style={{ width: "278px" }}
              placeholder={i18n.formatMessage({
                id: "bigdata.components.Results.involvedSQLs.key.placeholder",
              })}
              onChange={(value: string) => {
                setSQLcontent(currentResults?.involvedSQLs[value]);
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
          value={format(SQLContent)}
        />
      </div>
    </div>
  );

  return (
    <Drawer
      title={i18n.formatMessage({
        id: "bigdata.components.RightMenu.results.tips",
      })}
      placement="bottom"
      onClose={onClose}
      visible={visible}
      height={"80vh"}
    >
      <div className={style.infoList}>
        <div className={style.infoItem}>
          <div className={style.infoKey}>message: </div>
          <div className={style.infoValue}>
            {currentResults?.message && currentResults.message.length > 0
              ? currentResults.message
              : "-"}
          </div>
        </div>
      </div>

      {/* <Button onClick={onSave}>保存</Button> */}
      <Tabs activeKey={activeKey} onTabClick={(e) => setActiveKey(e)}>
        <TabPane
          tab="logs"
          key="logs"
          style={{
            position: "relative",
            border: "1px solid #ccc",
            minHeight: "700px",
            borderRadius: "8px",
          }}
        >
          {visible && <Luckysheet data={columns} id={15} />}
        </TabPane>
        <TabPane tab="sqls" key="involvedSQLs">
          {involvedSQLsContent}
        </TabPane>
      </Tabs>
    </Drawer>
  );
};

export default Results;
