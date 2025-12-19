import { DEBOUNCE_WAIT } from "@/config/config";
import useAlarmEnums from "@/pages/Alarm/hooks/useAlarmEnums";
import alarmStyles from "@/pages/Alarm/Rules/styles/index.less";
import { AlarmsResponse } from "@/services/alarm";
import useUrlState from "@ahooksjs/use-url-state";
import { PlusOutlined, RedoOutlined, SearchOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { useDebounceFn } from "ahooks";
import { Button, Input, Select, Space, Tooltip } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useIntl } from "umi";

export interface urlStateType {
  iid?: string | number;
  did?: string | number;
  tid?: string | number;
  status?: string | number;
  name?: string;
  alarmId?: string;
}

const Operations = () => {
  const [urlState, setUrlState] = useUrlState<urlStateType>();
  const { operations, alarmDraw, doGetAlarms } = useModel("alarm");
  const [localInputName, setLocalInputName] = useState<string>("");
  const [localAlarmId, setLocalAlarmId] = useState<string>("");

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
    (isReload?: Boolean) => {
      // 同步本地输入值到 operations
      operations.onChangeInputName(localInputName || undefined);
      operations.onChangeAlarmId(
        localAlarmId ? parseInt(localAlarmId) : undefined
      );

      doGetAlarms.run({
        ...operations.searchQuery,
        name: localInputName || undefined,
        alarmId: localAlarmId ? parseInt(localAlarmId) : undefined,
        isReload: isReload ? 1 : undefined,
        did: operations.searchQuery.tid
          ? undefined
          : operations.searchQuery.did,
        iid:
          operations.searchQuery.tid || operations.searchQuery.did
            ? undefined
            : operations.searchQuery.iid,
      });
      setUrlState({
        name: localInputName || undefined,
        alarmId: localAlarmId || undefined,
      });
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  const handleSelect = (params: AlarmsResponse) => {
    doGetAlarms.run({
      ...params,
      did: params.tid ? undefined : params.did,
      iid: params.tid || params.did ? undefined : params.iid,
    });
    setUrlState({
      name: localInputName || undefined,
      alarmId: localAlarmId || undefined,
    });
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
      if (urlState.name) {
        setLocalInputName(urlState.name);
        operations.onChangeInputName(urlState.name);
      }
      if (urlState.alarmId) {
        setLocalAlarmId(urlState.alarmId);
        operations.onChangeAlarmId(urlState.alarmId);
      }
    });
  }, []);

  const instanceOpt = useMemo(() => {
    let arr: any[] = [];

    instanceList.map((item) =>
      arr.push({
        value: item.id as number,
        label: (
          <Tooltip title={item.name + (item.desc ? `(${item.desc})` : "")}>
            {item.name}
            {item.desc ? `(${item.desc})` : ""}
          </Tooltip>
        ),
      })
    );

    return arr;
  }, [instanceList]);

  const databaseOpt = useMemo(() => {
    let arr: any[] = [];
    if (databaseList.length > 0 && operations.selectIid) {
      databaseList
        .filter((item) => item.iid === operations.selectIid)
        .map((item) => {
          arr.push({
            value: item.id,
            label: (
              <Tooltip title={item.name + (item.desc ? `(${item.desc})` : "")}>
                {item.name}
                {item.desc ? `(${item.desc})` : ""}
              </Tooltip>
            ),
          });
        });
    }
    return arr;
  }, [databaseList, operations?.selectIid]);

  const tableOpt = useMemo(() => {
    let arr: any[] = [];
    if (tableList.length > 0) {
      tableList.map((item) => {
        arr.push({
          value: item.id,
          label: (
            <Tooltip
              title={item.tableName + (item.desc ? `(${item.desc})` : "")}
            >
              {item.tableName}
              {item.desc ? `(${item.desc})` : ""}
            </Tooltip>
          ),
          data_label: item.tableName + (item?.desc || ""),
        });
      });
    }

    return arr;
  }, [tableList]);

  const AlarmStatusOpt = useMemo(() => {
    let arr: any[] = [];

    AlarmStatus.map((item) => {
      arr.push({
        value: item.status,
        label: item.label,
      });
    });
    return arr;
  }, [AlarmStatus]);

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
          options={instanceOpt}
        />
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
          options={databaseOpt}
        />
        <Select
          disabled={!operations.selectDid}
          showSearch
          allowClear
          value={operations.selectTid}
          filterOption={(input, option) =>
            (option?.data_label ?? "")
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          onChange={(id) => {
            operations.onChangeSelectTid(id);
            handleSelect({ ...operations.searchQuery, tid: id });
            urlChange("tid", id);
          }}
          className={alarmStyles.selectedBar}
          placeholder={`${i18n.formatMessage({
            id: "alarm.rules.selected.placeholder.logLibrary",
          })}`}
          options={tableOpt}
        />
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
          options={AlarmStatusOpt}
        />
        <Button icon={<PlusOutlined />} type="primary" onClick={handleOpenDraw}>
          {i18n.formatMessage({ id: "alarm.rules.button.created" })}
        </Button>
        <Button
          loading={doGetAlarms.loading}
          icon={<RedoOutlined />}
          onClick={() => handleSearch(true)}
        >
          {i18n.formatMessage({ id: "table.column.filter.refresh" })}
        </Button>
      </Space>
      <Space>
        <Input
          allowClear
          className={alarmStyles.selectedBar}
          value={localInputName}
          placeholder={`${i18n.formatMessage({
            id: "alarm.rules.form.placeholder.alarmName",
          })}`}
          onChange={(e) => setLocalInputName(e.target.value)}
          onPressEnter={() => handleSearch()}
        />
        <Input
          allowClear
          className={alarmStyles.selectedBar}
          value={localAlarmId}
          placeholder={`${i18n.formatMessage({
            id: "alarm.rules.form.placeholder.alarmId",
          })}`}
          onChange={(e) => setLocalAlarmId(e.target.value)}
          onPressEnter={() => handleSearch()}
        />
        <Button
          loading={doGetAlarms.loading}
          icon={<SearchOutlined />}
          type="primary"
          onClick={() => handleSearch()}
        >
          {i18n.formatMessage({ id: "search" })}
        </Button>
      </Space>
    </div>
  );
};
export default Operations;
