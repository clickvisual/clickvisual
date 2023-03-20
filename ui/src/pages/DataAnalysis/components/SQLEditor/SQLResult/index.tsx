import ExportExcelButton from "@/components/ExportExcelButton";
import { SaveOutlined } from "@ant-design/icons";
import { Button, message, Spin, Tabs, Tooltip } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useIntl, useModel } from "umi";
import styles from "../index.less";

const SQLResult = (props: {
  resultsList: any[];
  nodeId: number;
  lockUid: number;
  currentPaneActiveKey: string;
}) => {
  const i18n = useIntl();
  const { resultsList, nodeId, lockUid, currentPaneActiveKey } = props;
  const {
    doResultsInfo,
    doModifyResults,
    luckysheetData,
    onChangeLuckysheetData,
  } = useModel("dataAnalysis");
  const { currentUser } = useModel("@@initialState").initialState || {};
  const [defaultResultsData, setDefaultResultsData] = useState<any>({});
  const [resultsId, setResultsId] = useState<number>(0);
  const [updatedResults, setUpdatedResults] = useState<any>({});
  const [activeKey, setActiveKey] = useState<string>("");

  const handleTabsChange = (val: any) => {
    setActiveKey(val);
    setResultsId(parseInt(val));
    setUpdatedResults([]);
    getResultsInfo(parseInt(val));
  };

  const getResultsInfo = (resultId: number) => {
    doResultsInfo.run(nodeId, resultId).then((res: any) => {
      if (res.code != 0) return;
      setDefaultResultsData(JSON.parse(res.data.result));
      res?.data?.excelProcess &&
        res.data?.excelProcess.length > 0 &&
        setUpdatedResults(JSON.parse(res.data.excelProcess));
    });
  };

  const handleSave = () => {
    if (!resultsId) {
      message.error(
        i18n.formatMessage({
          id: "bigdata.components.RightMenu.results.notResultsId",
        })
      );
      return;
    }
    if (
      !luckysheetData ||
      !luckysheetData[0] ||
      !luckysheetData[0]?.celldata ||
      luckysheetData[0].celldata?.length == 0
    )
      return;
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
      .run(resultsId, {
        excelProcess: excelProcess,
      })
      .then((res: any) => {
        if (res.code != 0) return;
        getResultsInfo(parseInt(activeKey));
        message.success(
          i18n.formatMessage({ id: "log.index.manage.message.save.success" })
        );
      });
  };

  useEffect(() => {
    // 当前tab是本页面的时候才执行
    if (parseInt(currentPaneActiveKey) != nodeId) return;
    if (updatedResults && updatedResults.length > 0) {
      onChangeLuckysheetData([
        {
          name: "luckysheet",
          celldata: updatedResults,
        },
      ]);
      return;
    }
    if (
      Object.keys(defaultResultsData).length == 0 ||
      defaultResultsData.logs?.length == 0
    ) {
      onChangeLuckysheetData([
        {
          name: "luckysheet",
          celldata: [],
        },
      ]);
      return;
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
    onChangeLuckysheetData([{ name: "luckysheet", celldata: columnArr }]);
  }, [defaultResultsData, updatedResults, currentPaneActiveKey]);

  useEffect(() => {
    if (resultsList && resultsList.length > 0 && resultsList[0]?.id) {
      setUpdatedResults({});
      setDefaultResultsData({});
      setActiveKey(resultsList[0]?.id);
      getResultsInfo(resultsList[0]?.id);
      setResultsId(resultsList[0]?.id);
    } else {
      setDefaultResultsData({});
      setResultsId(0);
      setUpdatedResults({});
      setActiveKey("");
    }
  }, [resultsList]);

  const items = useMemo(() => {
    let arr: any[] = [];
    resultsList.map((item: any, index: number) => {
      arr.push({
        key: item.id,
        label: `result ${index + 1}`,
      });
    });
    return arr;
  }, [resultsList]);

  return (
    <div className={styles.sqlResult}>
      <Spin spinning={doResultsInfo.loading || doModifyResults.loading}>
        <div className={styles.title}>
          {resultsId ? (
            <Tooltip
              title={i18n.formatMessage({
                id: "bigdata.components.sqlSaveTips",
              })}
              placement="left"
            >
              <Button
                type="text"
                className={styles.saveIcon}
                disabled={lockUid != currentUser?.id}
                onClick={handleSave}
                icon={<SaveOutlined />}
              ></Button>
            </Tooltip>
          ) : null}
          {defaultResultsData?.logs && (
            <ExportExcelButton
              data={defaultResultsData.logs}
              style={{ position: "absolute", left: "-7px" }}
              type="link"
              placement="left"
            />
          )}
        </div>
        <div className={styles.resultTabs}>
          <div className={styles.tabList}>
            {resultsList.length > 0 ? (
              <Tabs
                items={items}
                onChange={handleTabsChange}
                activeKey={activeKey}
              />
            ) : null}
          </div>
        </div>
      </Spin>
    </div>
  );
};
export default SQLResult;
