import { Drawer, Table } from "antd";
import { ColumnsType } from "antd/lib/table";
// import classNames from "classnames";
import { useMemo, useState } from "react";
import { useModel, useIntl } from "umi";

const SqlTable = () => {
  const i18n = useIntl();
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
      title={i18n.formatMessage({ id: "bigdata.components.SQLEditor.results" })}
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
