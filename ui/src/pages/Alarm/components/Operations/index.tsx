import alarmStyles from "@/pages/Alarm/styles/index.less";
import { Select } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
const { Option } = Select;
const Operations = () => {
  const { databaseList, doGetDatabaseList } = useModel("dataLogs");

  useEffect(() => {
    doGetDatabaseList();
  }, []);
  return (
    <div className={alarmStyles.operationMain}>
      <Select>{databaseList.length > 0 && <Option>11</Option>}</Select>
    </div>
  );
};
export default Operations;
