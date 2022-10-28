import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import { useModel } from "@@/plugin-model/useModel";
import Luckysheet from "./Luckysheet/inex";
import { useMemo, useRef } from "react";
import { ColumnsType } from "antd/es/table";
import classNames from "classnames";
import { Empty } from "antd";

const StatisticalTableContent = (props: { isShare: boolean }) => {
  const { isShare } = props;
  const { statisticalChartsHelper, resizeMenuWidth, setLogExcelData } =
    useModel("dataLogs");
  const { logChart, doGetStatisticalTable } = statisticalChartsHelper;

  const tableRef = useRef(null);

  const columns: ColumnsType<any> = useMemo(() => {
    const columnArr: any = [];
    const list = [];
    if (logChart && logChart?.logs && logChart.logs?.length > 0) {
      //
      for (const itemIndex in logChart.logs) {
        list.push({
          ...logChart.logs[itemIndex],
          key: parseInt(itemIndex) + 1,
        });
      }
      setLogExcelData(list);
      let fields: string[] = [];

      if (
        logChart?.isNeedSort &&
        logChart?.sortRule.length > 1 &&
        logChart?.sortRule[0] != "*"
      ) {
        let flag = false;
        logChart?.sortRule.map((item: any) => {
          if (logChart.logs[0][item]) {
            flag = true;
          }
        });
        if (flag) {
          fields = logChart?.sortRule || Object.keys(logChart.logs[0]) || [];
        } else {
          fields = Object.keys(logChart.logs[0]) || [];
        }
      } else {
        fields = Object.keys(logChart.logs[0]) || [];
      }

      for (const fieldIndex in fields) {
        columnArr.push({
          r: 0,
          c: parseInt(fieldIndex),
          v: {
            ct: { fa: "General", t: "g" },
            m: fields[fieldIndex],
            v: fields[fieldIndex],
            fc: "#EE2F6C",
          },
        });
      }

      for (const itemIndex in logChart.logs) {
        for (const fieldIndex in fields) {
          columnArr.push({
            r: parseInt(itemIndex) + 1,
            c: parseInt(fieldIndex),
            v: {
              ct: { fa: "General", t: "g" },
              m: logChart.logs[itemIndex][fields[fieldIndex]],
              v: logChart.logs[itemIndex][fields[fieldIndex]],
            },
          });
        }
      }
    } else {
      setLogExcelData([]);
    }

    return columnArr;
  }, [logChart, logChart?.logs, logChart?.sortRule, logChart?.isNeedSort]);

  return (
    <div
      ref={tableRef}
      className={classNames(
        queryResultStyles.content,
        queryResultStyles.tableContent
      )}
    >
      <div
        style={{
          width: !isShare ? `calc(100vw - ${resizeMenuWidth}px - 83px)` : "",
        }}
        className={classNames(queryResultStyles.sqlTable)}
      >
        {columns.length > 0 && !doGetStatisticalTable.loading ? (
          <Luckysheet data={columns} />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    </div>
  );
};
export default StatisticalTableContent;
