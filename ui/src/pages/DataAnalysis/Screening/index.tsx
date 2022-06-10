import style from "../index.less";
import { Select, Tooltip } from "antd";
import { useIntl, useModel } from "umi";

const { Option } = Select;
const DataAnalysisScreening = () => {
  const i18n = useIntl();
  const { doGetDatabase, realTimeTraffic } = useModel("dataAnalysis");
  const { instances, setDatabases, setTables, onChangeCurrentInstances } =
    realTimeTraffic;
  return (
    <div className={style.screeningRow}>
      <Select
        showSearch
        allowClear
        size="small"
        style={{ width: "278px" }}
        placeholder={i18n.formatMessage({ id: "datasource.draw.selected" })}
        onChange={(iid: number) => {
          setDatabases([]);
          setTables([]);
          if (iid) {
            doGetDatabase
              .run(iid as number)
              .then((res) => setDatabases(res?.data ?? []));
            onChangeCurrentInstances(iid);
          }
          // form.resetFields(["dn", "tn"]);
        }}
      >
        {instances.length > 0 &&
          instances.map((item) => (
            <Option key={item.id} value={item.id as number}>
              <Tooltip title={item.name + (item.desc ? `(${item.desc})` : "")}>
                {item.name}
                {item.desc ? `(${item.desc})` : ""}
              </Tooltip>
            </Option>
          ))}
      </Select>
    </div>
  );
};
export default DataAnalysisScreening;
