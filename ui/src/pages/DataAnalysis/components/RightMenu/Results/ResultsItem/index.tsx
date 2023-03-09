import { Drawer, Form, Select, Tabs } from "antd";
import { useEffect, useMemo, useState } from "react";
import MonacoEditor from "react-monaco-editor";
import { format } from "sql-formatter";
import { useIntl, useModel } from "umi";
import style from "./index.less";

const { Option } = Select;

const Results = (props: {
  visible: boolean;
  nodeId: number | undefined;
  setVisible: (flag: boolean) => void;
  resultId?: number;
}) => {
  const [SQLForm] = Form.useForm();
  const i18n = useIntl();
  const { visible, setVisible, nodeId, resultId } = props;
  const { doResultsInfo } = useModel("dataAnalysis");
  const [SQLContent, setSQLcontent] = useState<string>("");
  const [activeKey, setActiveKey] = useState<string>("logs");
  const [defaultResultsData, setDefaultResultsData] = useState<any>({});

  const onClose = () => {
    setVisible(false);
  };

  const SQLList = useMemo(() => {
    return Object.keys(defaultResultsData?.involvedSQLs || {}) || [];
  }, [defaultResultsData]);

  useEffect(() => {
    if (visible) {
      if (SQLList.length > 0) {
        const key = defaultResultsData?.involvedSQLs[SQLList[0]];
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
      setDefaultResultsData({});
    }
  }, [visible]);

  const getResultsInfo = (resultId: number) => {
    nodeId &&
      doResultsInfo.run(nodeId, resultId).then((res: any) => {
        if (res.code != 0) return;
        setDefaultResultsData(JSON.parse(res.data.result));
      });
  };

  useEffect(() => {
    resultId && getResultsInfo(resultId);
  }, [resultId]);

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
                setSQLcontent(defaultResultsData?.involvedSQLs[value]);
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
            wordWrap: "on",
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

  const items = [
    {
      key: "logs",
      label: "logs",
      children: (
        <div
          style={{
            height: "50vh",
            position: "relative",
            border: "1px solid #ccc",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <MonacoEditor
            height={"100%"}
            language={"json"}
            theme="vs-white"
            options={{
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              minimap: {
                enabled: true,
              },
              readOnly: true,
            }}
            value={format(
              (defaultResultsData?.logs &&
                JSON.stringify(defaultResultsData?.logs)) ||
                ""
            )}
          />
        </div>
      ),
    },
    {
      key: "involvedSQLs",
      label: "sqls",
      children: involvedSQLsContent,
    },
  ];

  return (
    <Drawer
      title={i18n.formatMessage({
        id: "bigdata.components.RightMenu.results.tips",
      })}
      placement="bottom"
      onClose={onClose}
      open={visible}
      height={"80vh"}
    >
      <div className={style.infoList}>
        <div className={style.infoItem}>
          <div className={style.infoKey}>message: </div>
          <div className={style.infoValue}>
            {defaultResultsData?.message &&
            defaultResultsData.message.length > 0
              ? defaultResultsData.message
              : "-"}
          </div>
        </div>
      </div>
      <Tabs
        items={items}
        activeKey={activeKey}
        onTabClick={(e) => setActiveKey(e)}
      />
    </Drawer>
  );
};

export default Results;
