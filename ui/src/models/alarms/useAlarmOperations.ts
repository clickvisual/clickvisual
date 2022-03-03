import { useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";
import baseApi, { DatabaseResponse, TablesResponse } from "@/services/dataLogs";

const useAlarmOperations = () => {
  const [inputName, setInputName] = useState<string>();
  const [selectDid, setSelectDid] = useState<number>();
  const [selectTid, setSelectTid] = useState<number>();
  const [tableList, setTableList] = useState<TablesResponse[]>([]);
  const [databaseList, setDatabaseList] = useState<DatabaseResponse[]>([]);

  const getLogLibraries = useRequest(baseApi.getTableList, {
    loadingText: false,
    onSuccess: (res) => setTableList(res.data || []),
  });
  const getDatabases = useRequest(baseApi.getDatabaseList, {
    loadingText: false,
    onSuccess: (res) => setDatabaseList(res.data || []),
  });

  const onChangeInputName = (name: string) => {
    setInputName(name);
  };

  const onChangeSelectDid = (id: number | undefined) => {
    setSelectDid(id);
  };

  const onChangeSelectTid = (id: number | undefined) => {
    setSelectTid(id);
  };
  return {
    inputName,
    selectDid,
    selectTid,
    tableList,
    databaseList,
    getLogLibraries,
    getDatabases,
    onChangeInputName,
    onChangeSelectDid,
    onChangeSelectTid,
  };
};
export default useAlarmOperations;
