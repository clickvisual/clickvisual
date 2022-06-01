import alarmStyles from "@/pages/Alarm/Rules/styles/index.less";
import { Button, Input, Select, Space, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { useIntl } from "umi";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import useAlarmEnums from "@/pages/Alarm/hooks/useAlarmEnums";
import useUrlState from "@ahooksjs/use-url-state";
import { AlarmsResponse } from "@/services/alarm";

const { Option } = Select;

export interface urlStateType {
  iid?: string | number;
  did?: string | number;
  tid?: string | number;
  status?: string | number;
  name?: string;
}

const Operations = () => {
  const [urlState, setUrlState] = useUrlState<urlStateType>();
  const { operations, alarmDraw, doGetAlarms } = useModel("alarm");

  const {
    tableList,
    databaseList,
    instanceList,
    getLogLibraries,
    getDatabases,
    getInstanceList,
  } = operations;

  const { AlarmStatus } = useAlarmEnums();
  const i18n = useIntl();

  const handleOpenDraw = () => {
    alarmDraw.onChangeVisibleDraw(true);
  };

  const handleSearch = useDebounceFn(
    () => {
      doGetAlarms.run({
        ...operations.searchQuery,
        did: operations.searchQuery.tid
          ? undefined
          : operations.searchQuery.did,
        iid:
          operations.searchQuery.tid || operations.searchQuery.did
            ? undefined
            : operations.searchQuery.iid,
      });
      urlChange("name", operations.inputName || undefined);
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  const handleSelect = (params: AlarmsResponse) => {
    doGetAlarms.run({
      ...params,
      did: params.tid ? undefined : params.did,
      iid: params.tid || params.did ? undefined : params.iid,
    });
    urlChange("name", operations.inputName || undefined);
  };

  /**
   * 该函数不支持连续调用两次，因为两个时间的...urlState做不到同步更新
   */
  const urlChange = (key: string, value: any) => {
    const data = { ...urlState, [key]: value };
    setUrlState(data);
  };

  useEffect(() => {
    getInstanceList.run();
    getDatabases.run().then((res) => {
      if (res?.code !== 0 || !urlState) return;
      urlState.did && getLogLibraries.run(parseInt(urlState.did));
      urlState.iid && operations.onChangeSelectIid(parseInt(urlState.iid));
      urlState.did && operations.onChangeSelectDid(parseInt(urlState.did));
      urlState.tid && operations.onChangeSelectTid(parseInt(urlState.tid));
      urlState.status && operations.onChangeStatusId(parseInt(urlState.status));
      urlState.name && operations.onChangeInputName(urlState.name);
    });
  }, []);

  return (
    <div className={alarmStyles.operationMain}>
      <Space>
        <Select
          showSearch
          allowClear
          value={operations.selectIid}
          onChange={(id) => {
            operations.onChangeSelectIid(id);
            operations.onChangeSelectDid(undefined);
            operations.onChangeSelectTid(undefined);
            handleSelect({
              ...operations.searchQuery,
              iid: id,
              did: undefined,
              tid: undefined,
            });
            setUrlState({
              ...urlState,
              iid: id,
              did: undefined,
              tid: undefined,
            });
          }}
          className={alarmStyles.selectedBar}
          placeholder={`${i18n.formatMessage({
            id: "datasource.draw.selected",
          })}`}
        >
          {instanceList.length > 0 &&
            instanceList.map((item) => (
              <Option key={item.id} value={item.id as number}>
                <Tooltip
                  title={item.name + (item.desc ? `(${item.desc})` : "")}
                >
                  {item.name}
                  {item.desc ? `(${item.desc})` : ""}
                </Tooltip>
              </Option>
            ))}
        </Select>
        <Select
          disabled={!operations.selectIid}
          showSearch
          allowClear
          value={operations.selectDid}
          onChange={(id) => {
            operations.onChangeSelectDid(id);
            operations.onChangeSelectTid(undefined);
            if (id) getLogLibraries.run(id);
            handleSelect({
              ...operations.searchQuery,
              did: id,
              tid: undefined,
            });
            setUrlState({ ...urlState, did: id, tid: undefined });
          }}
          className={alarmStyles.selectedBar}
          placeholder={`${i18n.formatMessage({
            id: "alarm.rules.selected.placeholder.database",
          })}`}
        >
          {databaseList.length > 0 &&
            operations.selectIid &&
            databaseList
              .filter((item) => item.iid === operations.selectIid)
              .map((item) => (
                <Option key={item.id} value={item.id}>
                  <Tooltip
                    title={item.name + (item.desc ? `(${item.desc})` : "")}
                  >
                    {item.name}
                    {item.desc ? `(${item.desc})` : ""}
                  </Tooltip>
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
            handleSelect({ ...operations.searchQuery, tid: id });
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
                <Tooltip
                  title={item.tableName + (item.desc ? `(${item.desc})` : "")}
                >
                  {item.tableName}
                  {item.desc ? `(${item.desc})` : ""}
                </Tooltip>
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
            handleSelect({ ...operations.searchQuery, status: id });
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
