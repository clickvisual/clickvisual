import { Drawer, Table } from "antd";
import { ColumnsType } from "antd/lib/table";
// import classNames from "classnames";
import { useMemo, useState } from "react";
import { useModel } from "umi";

const SqlTable = () => {
  const { visibleSqlQuery, changeVisibleSqlQuery, sqlQueryResults } =
    useModel("dataAnalysis");
  const [sqlQueryData, setSqlQueryData] = useState<any>([]);

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
    } else {
      setSqlQueryData([]);
    }
    return columnArr;
  }, [sqlQueryResults]);
  return (
    <Drawer
      title="运行结果"
      placement="bottom"
      height={"70%"}
      onClose={() => changeVisibleSqlQuery(false)}
      visible={visibleSqlQuery}
    >
      {/* <div className={classNames(queryResultStyles.sqlTable)}> */}
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
      {/* </div> */}
    </Drawer>
  );
};
export default SqlTable;
