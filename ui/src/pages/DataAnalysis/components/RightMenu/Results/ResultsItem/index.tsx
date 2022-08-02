import { Button, Drawer, Form, message, Select, Tabs } from "antd";
import { useEffect, useMemo, useState } from "react";
import style from "./index.less";
import MonacoEditor from "react-monaco-editor";
import Luckysheet from "@/components/Luckysheet";
import { useModel, useIntl } from "umi";
import { format } from "sql-formatter";

const { Option } = Select;
const { TabPane } = Tabs;

const Results = (props: {
  visible: boolean;
  nodeId: number | undefined;
  setVisible: (flag: boolean) => void;
}) => {
  const [SQLForm] = Form.useForm();
  const i18n = useIntl();
  const { visible, setVisible, nodeId } = props;
  const { doModifyResults, doResultsInfo, resultId } = useModel("dataAnalysis");
  const [SQLContent, setSQLcontent] = useState<string>("");
  const [activeKey, setActiveKey] = useState<string>("logs");
  const [defaultResultsData, setDefaultResultsData] = useState<any>({});
  const [updatedResults, setUpdatedResults] = useState<any>({});

  const onClose = () => {
    setVisible(false);
  };

  const currentResults = useMemo(() => {
    return updatedResults.length > 0 ? updatedResults : defaultResultsData;
  }, [defaultResultsData, updatedResults]);

  const SQLList = useMemo(() => {
    return Object.keys(currentResults?.involvedSQLs || {}) || [];
  }, [currentResults]);

  const luckysheetData: any = useMemo(() => {
    if (updatedResults && updatedResults.length > 0) {
      return [
        {
          name: "luckysheet",
          celldata: updatedResults,
        },
      ];
    }
    if (
      Object.keys(defaultResultsData).length == 0 ||
      defaultResultsData.logs?.length == 0
    ) {
      return [
        {
          name: "luckysheet",
          celldata: [],
        },
      ];
    }

    const columnArr: any = [];

    if (
      defaultResultsData &&
      defaultResultsData?.logs &&
      defaultResultsData.logs?.length > 0
    ) {
      const fields = Object.keys(defaultResultsData.logs[0]) || [];
      for (const fieldIndex in fields) {
        columnArr.push({
          r: 0,
          c: parseInt(fieldIndex),
          v: {
            ct: { fa: "General", t: "g" },
            m: fields[fieldIndex],
            v: fields[fieldIndex],
            fc: "#EE2F6C",
            vt: 0,
          },
        });
      }
      for (const itemIndex in defaultResultsData.logs) {
        for (const fieldIndex in fields) {
          columnArr.push({
            r: parseInt(itemIndex) + 1,
            c: parseInt(fieldIndex),
            v: {
              ct: { fa: "General", t: "g" },
              m: defaultResultsData.logs[itemIndex][fields[fieldIndex]],
              v: defaultResultsData.logs[itemIndex][fields[fieldIndex]],
              vt: 0,
            },
          });
        }
      }
    }

    return [{ name: "luckysheet", celldata: columnArr }];
  }, [defaultResultsData, updatedResults]);

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
      setUpdatedResults({});
      setDefaultResultsData({});
    }
  }, [visible]);

  const getResultsInfo = (resultId: number) => {
    nodeId &&
      doResultsInfo.run(nodeId, resultId).then((res: any) => {
        if (res.code != 0) return;
        setDefaultResultsData(JSON.parse(res.data.result));
        res?.data?.excelProcess &&
          res.data?.excelProcess.length > 0 &&
          setUpdatedResults(JSON.parse(res.data.excelProcess));
      });
  };

  useEffect(() => {
    resultId && getResultsInfo(resultId);
  }, [resultId]);

  const handleSave = () => {
    const luckysheet = window.luckysheet;
    let boardData: any = [];
    luckysheet.getcellvalue().map((lineItem: any, lineIndex: number) => {
      lineItem.map((columnItem: any, columnIndex: number) => {
        if (columnItem != null) {
          boardData.push({
            c: columnIndex,
            r: lineIndex,
            v: columnItem,
          });
        }
      });
    });
    const excelProcess = JSON.stringify(boardData);
    doModifyResults
      .run(resultId, {
        excelProcess: excelProcess,
      })
      .then((res: any) => {
        if (res.code != 0) return;
        getResultsInfo(resultId);
        message.success(
          i18n.formatMessage({ id: "log.index.manage.message.save.success" })
        );
      });
  };

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
      <div className={style.saveBtnBox}>
        {activeKey == "logs" ? (
          <Button size="small" type="primary" onClick={handleSave}>
            {i18n.formatMessage({ id: "button.save" })}
          </Button>
        ) : null}
      </div>
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
          {visible && <Luckysheet data={luckysheetData} />}
        </TabPane>
        <TabPane tab="sqls" key="involvedSQLs">
          {involvedSQLsContent}
        </TabPane>
      </Tabs>
    </Drawer>
  );
};

export default Results;
