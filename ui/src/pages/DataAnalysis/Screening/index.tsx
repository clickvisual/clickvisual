import style from "../index.less";
import { Select, Tooltip } from "antd";
import { useIntl, useModel } from "umi";
import { InstanceType } from "@/services/systemSetting";
import { useEffect } from "react";

const { Option } = Select;
const DataAnalysisScreening = () => {
  const i18n = useIntl();
  const {
    doGetDatabase,
    instances,
    onChangeCurrentInstances,
    doGetInstance,
    setInstances,
    realTimeTraffic,
  } = useModel("dataAnalysis");
  const { setDatabases, setTables } = realTimeTraffic;

  useEffect(() => {
    doGetInstance.run().then((res) => setInstances(res?.data ?? []));
  }, []);

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
          onChangeCurrentInstances(iid);
          if (iid) {
            doGetDatabase
              .run(iid as number)
              .then((res) => setDatabases(res?.data ?? []));
          }
        }}
      >
        {instances.length > 0 &&
          instances.map((item: InstanceType) => (
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
