import alarmStyles from "@/pages/Alarm/styles/index.less";
import { Button, Select, Space } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { useIntl } from "umi";
import { PlusOutlined } from "@ant-design/icons";
const { Option } = Select;
const Operations = () => {
  const { databaseList, logLibraryList, getLogLibraries, doGetDatabaseList } =
    useModel("dataLogs");

  const { operations, alarmDraw } = useModel("alarm");

  const i18n = useIntl();

  const handleOpenDraw = () => {
    alarmDraw.onChangeVisibleDraw(true);
  };

  useEffect(() => {
    doGetDatabaseList();
  }, []);

  return (
    <div className={alarmStyles.operationMain}>
      <Space>
        <Select
          showSearch
          value={operations.selectDid}
          onChange={(id) => {
            operations.onChangeSelectDid(id);
            getLogLibraries.run(id);
          }}
          className={alarmStyles.selectedBar}
          placeholder={`${i18n.formatMessage({
            id: "alarm.selected.placeholder.database",
          })}`}
        >
          {databaseList.length > 0 &&
            databaseList.map((item) => (
              <Option key={item.id} value={item.id}>
                {item.name}
              </Option>
            ))}
        </Select>
        <Select
          disabled={!operations.selectDid}
          showSearch
          value={operations.selectTid}
          onChange={operations.onChangeSelectTid}
          className={alarmStyles.selectedBar}
          placeholder={`${i18n.formatMessage({
            id: "alarm.selected.placeholder.logLibrary",
          })}`}
        >
          {logLibraryList.length > 0 &&
            logLibraryList.map((item) => (
              <Option key={item.id} value={item.id}>
                {item.tableName}
              </Option>
            ))}
        </Select>
        <Button icon={<PlusOutlined />} type="primary" onClick={handleOpenDraw}>
          {i18n.formatMessage({ id: "alarm.button.created" })}
        </Button>
      </Space>
    </div>
  );
};
export default Operations;
