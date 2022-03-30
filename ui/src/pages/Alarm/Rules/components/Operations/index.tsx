import alarmStyles from "@/pages/Alarm/Rules/styles/index.less";
import { Button, Input, Select, Space } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { useIntl } from "umi";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import useAlarmEnums from "@/pages/Alarm/hooks/useAlarmEnums";
import useUrlState from "@ahooksjs/use-url-state";
const { Option } = Select;
const Operations = () => {
  const [urlState, setUrlState] = useUrlState<any>();
  const { operations, alarmDraw, doGetAlarms, currentPagination } =
    useModel("alarm");

  const { tableList, databaseList, getLogLibraries, getDatabases } = operations;

  const { AlarmStatus } = useAlarmEnums();
  const i18n = useIntl();

  const handleOpenDraw = () => {
    alarmDraw.onChangeVisibleDraw(true);
  };

  const searchQuery = {
    name: operations.inputName,
    did: operations.selectDid,
    tid: operations.selectTid,
    status: operations.statusId,
    ...currentPagination,
  };

  const handleSearch = useDebounceFn(
    () => {
      doGetAlarms.run(searchQuery);
      urlChange("name", operations.inputName || undefined);
    },
    { wait: DEBOUNCE_WAIT }
  ).run;
  /**
   * 该函数不支持连续调用两次，因为两个时间的...urlState做不到同步更新
   */
  const urlChange = (key: string, value: any) => {
    const data = { ...urlState, [key]: value };
    setUrlState(data);
  };

  useEffect(() => {
    getDatabases.run();
    urlState && urlState.did && getLogLibraries.run(urlState.did * 1);
    urlState && urlState.did && operations.onChangeSelectDid(urlState.did * 1);
    urlState && urlState.tid && operations.onChangeSelectTid(urlState.tid * 1);
    urlState &&
      urlState.status &&
      operations.onChangeStatusId(urlState.status * 1);
    urlState && urlState.name && operations.onChangeInputName(urlState.name);
  }, []);

  return (
    <div className={alarmStyles.operationMain}>
      <Space>
        <Select
          showSearch
          allowClear
          value={operations.selectDid}
          onChange={(id) => {
            operations.onChangeSelectDid(id);
            operations.onChangeSelectTid(undefined);
            // urlChange("did", id);
            // urlChange("tid", undefined);
            if (id) getLogLibraries.run(id);
            doGetAlarms.run({ ...searchQuery, did: id });
            setUrlState({ ...urlState, did: id, tid: undefined });
          }}
          className={alarmStyles.selectedBar}
          placeholder={`${i18n.formatMessage({
            id: "alarm.rules.selected.placeholder.database",
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
          allowClear
          value={operations.selectTid}
          onChange={(id) => {
            operations.onChangeSelectTid(id);
            doGetAlarms.run({ ...searchQuery, tid: id });
            urlChange("tid", id);
          }}
          className={alarmStyles.selectedBar}
          placeholder={`${i18n.formatMessage({
            id: "alarm.rules.selected.placeholder.logLibrary",
          })}`}
        >
          {tableList.length > 0 &&
            tableList.map((item) => (
              <Option key={item.id} value={item.id}>
                {item.tableName}
              </Option>
            ))}
        </Select>
        <Select
          allowClear
          value={operations.statusId}
          className={alarmStyles.selectedBar}
          placeholder={`${i18n.formatMessage({
            id: "alarm.rules.selected.placeholder.status",
          })}`}
          onChange={(id) => {
            operations.onChangeStatusId(id);
            doGetAlarms.run({ ...searchQuery, status: id });
            urlChange("status", id);
          }}
        >
          {AlarmStatus.map((item) => (
            <Option key={item.status} value={item.status}>
              {item.label}
            </Option>
          ))}
        </Select>
        <Button icon={<PlusOutlined />} type="primary" onClick={handleOpenDraw}>
          {i18n.formatMessage({ id: "alarm.rules.button.created" })}
        </Button>
      </Space>
      <Space>
        <Input
          allowClear
          className={alarmStyles.selectedBar}
          value={operations.inputName}
          placeholder={`${i18n.formatMessage({
            id: "alarm.rules.form.placeholder.alarmName",
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
