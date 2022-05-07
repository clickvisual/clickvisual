import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import { useModel } from "@@/plugin-model/useModel";
import { Table } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { ColumnsType } from "antd/es/table";
import classNames from "classnames";
import { useIntl } from "umi";

const DefaultScrollY = 400;
const HeightDifference = 34;

const StatisticalTableContent = () => {
  const i18n = useIntl();
  const { statisticalChartsHelper } = useModel("dataLogs");
  const { logChart, doGetStatisticalTable } = statisticalChartsHelper;
  const [data, setData] = useState<any[]>([]);
  const [tableScrollY, setTableScrollY] = useState<number>(DefaultScrollY);

  const tableRef = useRef(null);

  const columns: ColumnsType<any> = useMemo(() => {
    const columnArr: ColumnsType = [];
    if (logChart.logs?.length > 0) {
      const fields = Object.keys(logChart.logs[0]) || [];
      const list = [];
      for (const itemIndex in logChart.logs) {
        list.push({
          ...logChart.logs[itemIndex],
          key: parseInt(itemIndex) + 1,
        });
      }
      setData(list);

      columnArr.push({
        title: "line",
        dataIndex: "key",
        align: "center",
        width: 60,
        fixed: "left",
      });
      for (const fieldIndex in fields) {
        columnArr.push({
          title: fields[fieldIndex],
          dataIndex: fields[fieldIndex],
          width: 200,
          align: "left",
        });
      }
    }
    return columnArr;
  }, [logChart]);
  const ResetTableScrollY = () => {
    if (
      !tableRef.current ||
      tableRef.current["clientHeight"] - tableScrollY === HeightDifference
    ) {
      return;
    }
    setTableScrollY(tableRef.current["clientHeight"] - HeightDifference);
  };

  useEffect(() => {
    ResetTableScrollY();
    window.addEventListener("resize", ResetTableScrollY);
    return () => {
      removeEventListener("resize", ResetTableScrollY);
    };
  }, []);

  return (
    <div
      ref={tableRef}
      className={classNames(
        queryResultStyles.content,
        queryResultStyles.tableContent
      )}
    >
      <div className={classNames(queryResultStyles.sqlTip)}>
        <span>{i18n.formatMessage({ id: "log.table.note" })}</span>
      </div>
      <Table
        loading={doGetStatisticalTable.loading}
        size={"small"}
        scroll={{ x: "max-content", y: tableScrollY }}
        columns={columns}
        dataSource={data}
        pagination={false}
      />
    </div>
  );
};
export default StatisticalTableContent;
