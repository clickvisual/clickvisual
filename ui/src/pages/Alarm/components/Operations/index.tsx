import alarmStyles from "@/pages/Alarm/styles/index.less";
import { Button, Input, Select, Space } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { useIntl } from "umi";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
const { Option } = Select;
const Operations = () => {
  const { databaseList, logLibraryList, getLogLibraries, doGetDatabaseList } =
    useModel("dataLogs");

  const { operations, alarmDraw, doGetAlarms, currentPagination } =
    useModel("alarm");

  const i18n = useIntl();

  const handleOpenDraw = () => {
    alarmDraw.onChangeVisibleDraw(true);
  };

  const searchQuery = {
    name: operations.inputName,
    did: operations.selectDid,
    tid: operations.selectTid,
    ...currentPagination,
  };

  const handleSearch = useDebounceFn(
    () => {
      doGetAlarms.run(searchQuery);
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

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
            operations.onChangeSelectTid(undefined);
            getLogLibraries.run(id);
            doGetAlarms.run({ ...searchQuery, did: id });
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
          onChange={(id) => {
            operations.onChangeSelectTid(id);
            doGetAlarms.run({ ...searchQuery, tid: id });
          }}
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
      <Space>
        <Input
          allowClear
          className={alarmStyles.selectedBar}
          value={operations.inputName}
          placeholder={`${i18n.formatMessage({
            id: "alarm.form.placeholder.alarmName",
          })}`}
          onChange={(env) => operations.onChangeInputName(env.target.value)}
          onPressEnter={handleSearch}
        />
        <Button
          loading={doGetAlarms.loading}
          icon={<SearchOutlined />}
          type="primary"
          onClick={handleSearch}
        >
          {i18n.formatMessage({ id: "search" })}
        </Button>
      </Space>
    </div>
  );
};
export default Operations;
