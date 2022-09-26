import { useMemo, useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";
import baseApi, { DatabaseResponse, TablesResponse } from "@/services/dataLogs";
import systemApi, { InstanceType } from "@/services/systemSetting";
import useAlarm from "@/models/alarms/useAlarm";

const useAlarmOperations = () => {
  const [inputName, setInputName] = useState<string>();
  const [alarmId, setAlarmId] = useState<number | string>();
  const [selectIid, setSelectIid] = useState<number>();
  const [selectDid, setSelectDid] = useState<number>();
  const [selectTid, setSelectTid] = useState<number>();
  const [statusId, setStatusId] = useState<number>();
  const [tableList, setTableList] = useState<TablesResponse[]>([]);
  const [databaseList, setDatabaseList] = useState<DatabaseResponse[]>([]);
  const [instanceList, setInstanceList] = useState<InstanceType[]>([]);

  const { currentPagination } = useAlarm();

  const searchQuery = useMemo(
    () => ({
      name: inputName,
      alarmId: alarmId,
      did: selectDid,
      tid: selectTid,
      iid: selectIid,
      status: statusId,
      ...currentPagination,
    }),
    [
      inputName,
      alarmId,
      selectTid,
      selectDid,
      selectIid,
      currentPagination.current,
      currentPagination.pageSize,
      currentPagination.total,
    ]
  );

  const getLogLibraries = useRequest(baseApi.getTableList, {
    loadingText: false,
    onSuccess: (res) => setTableList(res.data || []),
  });

  const getInstanceList = useRequest(systemApi.getInstances, {
    loadingText: false,
    onSuccess: (res) => setInstanceList(res.data || []),
  });

  const getDatabases = useRequest(baseApi.getDatabaseList, {
    loadingText: false,
    onSuccess: (res) => setDatabaseList(res.data || []),
  });

  const onChangeInputName = (name: string | undefined) => {
    setInputName(name);
  };
  const onChangeAlarmId = (alarmId: number | string | undefined) => {
    setAlarmId(alarmId);
  };

  const onChangeSelectIid = (id: number | undefined) => {
    setSelectIid(id);
  };

  const onChangeSelectDid = (id: number | undefined) => {
    setSelectDid(id);
  };

  const onChangeSelectTid = (id: number | undefined) => {
    setSelectTid(id);
  };

  const onChangeStatusId = (id: number | undefined) => {
    setStatusId(id);
  };
  return {
    inputName,
    alarmId,
    selectIid,
    selectDid,
    selectTid,
    tableList,
    statusId,
    databaseList,
    getLogLibraries,
    getDatabases,
    instanceList,
    getInstanceList,
    searchQuery,
    onChangeInputName,
    onChangeAlarmId,
    onChangeSelectIid,
    onChangeSelectDid,
    onChangeSelectTid,
    onChangeStatusId,
  };
};
export default useAlarmOperations;
