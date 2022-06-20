import useRequest from "@/hooks/useRequest/useRequest";
import systemApi from "@/services/systemSetting";
import dataLogsApi from "@/services/dataLogs";
import useRealTimeTraffic from "@/models/dataanalysis/useRealTimeTraffic";
import useTemporaryQuery from "@/models/dataanalysis/useTemporaryQuery";
import useDataSourceManage from "@/models/dataanalysis/useDataSourceManage";
import { InstanceType } from "@/services/systemSetting";
import { useEffect, useState } from "react";
import useWorkflow from "@/models/dataanalysis/useWorkflow";

const DataAnalysis = () => {
  const [navKey, setNavKey] = useState<string>();
  const [instances, setInstances] = useState<InstanceType[]>([]);
  const [currentInstances, setCurrentInstances] = useState<number>();
  const [sqlQueryResults, setSqlQueryResults] = useState<any>();
  const [visibleSqlQuery, setVisibleSqlQuery] = useState<boolean>(false);

  const realTimeTraffic = useRealTimeTraffic();
  const temporaryQuery = useTemporaryQuery();
  const workflow = useWorkflow();
  const dataSourceManage = useDataSourceManage();

  const onChangeNavKey = (key: string) => {
    setNavKey(key);
  };

  const changeSqlQueryResults = (data: any) => {
    setSqlQueryResults(data);
  };

  const changeVisibleSqlQuery = (flag: boolean) => {
    setVisibleSqlQuery(flag);
  };

  const onChangeCurrentInstances = (value: number) => {
    setCurrentInstances(value);
  };

  const doGetInstance = useRequest(systemApi.getInstances, {
    loadingText: false,
  });

  const doGetDatabase = useRequest(dataLogsApi.getDatabaseList, {
    loadingText: false,
  });

  const doGetTables = useRequest(dataLogsApi.getTableList, {
    loadingText: false,
  });

  useEffect(() => {
    temporaryQuery.changeOpenNodeId(0);
    temporaryQuery.changeOpenNodeParentId(0);
    temporaryQuery.changeOpenNodeData(undefined);
    temporaryQuery.changeFolderContent("");
  }, [navKey]);

  return {
    instances,
    currentInstances,
    navKey,
    sqlQueryResults,
    visibleSqlQuery,

    setInstances,
    onChangeCurrentInstances,
    onChangeNavKey,
    changeSqlQueryResults,
    changeVisibleSqlQuery,

    doGetInstance,
    doGetDatabase,
    doGetTables,

    realTimeTraffic,
    temporaryQuery,
    workflow,
    dataSourceManage,
  };
};

export default DataAnalysis;
