import { useCallback, useEffect, useMemo, useState } from "react";
import { BigDataSourceType } from "@/services/bigDataWorkflow";
import { Form, Select } from "antd";
import { SourceCardProps } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/SourceCard";
import {
  DataSourceTypeEnums,
  FormItemEnums,
  TypeOptions,
} from "@/pages/DataAnalysis/OfflineManager/config";
import { useModel } from "@@/plugin-model/useModel";

export interface DatasourceSelectProps extends SourceCardProps {
  itemNamePath: string[];
  onChangeColumns: (columns: any[], isChange?: boolean) => void;
  sourceType?: DataSourceTypeEnums;
}

const DatasourceSelect = ({
  form,
  iid,
  file,
  doGetSources,
  doGetSqlSource,
  doGetSourceTable,
  doGetColumns,
  itemNamePath,
  onChangeColumns,
  isLock,
  onSelectType,
  sourceType,
}: DatasourceSelectProps) => {
  const [databaseList, setDatabaseList] = useState<any[]>([]);
  const [datasourceList, setDatasourceList] = useState<any[]>([]);
  const [sourceTableList, setSourceTableList] = useState<any[]>([]);
  const { instances, currentInstance } = useModel("dataAnalysis", (model) => ({
    instances: model.instances,
    currentInstance: model.currentInstances,
  }));

  const namePath: string[] = useMemo(
    () => itemNamePath.filter((item) => item !== "target"),
    []
  );

  const handleFormUpdate = useCallback((prevValues) => {
    let pre: any;
    itemNamePath.forEach((path) => (pre = prevValues[path]));
    const nextValue = form.getFieldValue([...itemNamePath, "type"]);
    if (pre["type"] && nextValue) {
      return pre["type"] !== nextValue;
    }
    return false;
  }, []);

  const TypesOptions = useMemo(() => {
    if (!itemNamePath.includes("target")) return TypeOptions;
    return TypeOptions.filter(
      (item) =>
        item.value !== form.getFieldValue([...namePath, "source", "type"])
    );
  }, [sourceType]);

  const ClusterOptions = useMemo(
    () =>
      instances
        .find((item) => item.id === currentInstance)
        ?.clusters?.map((cluster) => ({ value: cluster, label: cluster })),
    [instances, currentInstance]
  );

  const DatasourceOptions = useMemo(
    () =>
      datasourceList.map((datasource) => ({
        value: datasource.id,
        label: datasource.name,
      })),
    [datasourceList]
  );

  const DataBaseOptions = useMemo(
    () =>
      databaseList.map((database) => ({ value: database, label: database })),
    [databaseList]
  );

  const SourceTableOptions = useMemo(
    () => sourceTableList.map((table) => ({ value: table, label: table })),
    [sourceTableList]
  );

  const handleChangeSelect = useCallback((formItem: FormItemEnums) => {
    const resetTable = [
      FormItemEnums.type,
      FormItemEnums.datasource,
      FormItemEnums.database,
    ];
    const resetDatabase = [FormItemEnums.type, FormItemEnums.datasource];
    const resetDatasource = [FormItemEnums.type];
    onChangeColumns([]);
    const resetList = [];
    if (resetTable.includes(formItem)) {
      setSourceTableList([]);
      resetList.push([...itemNamePath, "table"]);
    }
    if (resetDatabase.includes(formItem)) {
      setDatabaseList([]);
      resetList.push([...itemNamePath, "database"]);
    }
    if (resetDatasource.includes(formItem)) {
      setDatasourceList([]);
      resetList.push([...itemNamePath, "datasource"]);
    }
    form.resetFields(resetList);
  }, []);

  const handleSelectType = useCallback((type: DataSourceTypeEnums) => {
    switch (type) {
      case DataSourceTypeEnums.ClickHouse:
        doGetSources
          .run(iid, BigDataSourceType.instances)
          .then((res: any) => setDatabaseList(res?.data || []));
        break;
      case DataSourceTypeEnums.MySQL:
        doGetSqlSource
          .run({ iid, typ: type })
          .then((res: any) => setDatasourceList(res?.data || []));
        break;
    }
  }, []);

  const handleSelectDatasource = useCallback((sourceId: number) => {
    doGetSources
      .run(sourceId, BigDataSourceType.source)
      .then((res: any) => setDatabaseList(res?.data || []));
  }, []);

  const handleSelectDatabase = useCallback((database) => {
    const type = form.getFieldValue([...itemNamePath, "type"]);
    const datasource = form.getFieldValue([...itemNamePath, "datasource"]);
    switch (type) {
      case DataSourceTypeEnums.ClickHouse:
        doGetSourceTable
          .run(iid, BigDataSourceType.instances, { database })
          .then((res: any) => setSourceTableList(res?.data || []));
        break;
      case DataSourceTypeEnums.MySQL:
        doGetSourceTable
          .run(datasource, BigDataSourceType.source, {
            database,
          })
          .then((res: any) => setSourceTableList(res?.data || []));
    }
  }, []);

  const handleSelectTable = useCallback((table: any, changeFlag?: boolean) => {
    const type = form.getFieldValue([...itemNamePath, "type"]);
    const datasource = form.getFieldValue([...itemNamePath, "datasource"]);
    const database = form.getFieldValue([...itemNamePath, "database"]);
    if (table) onChangeColumns([]);
    switch (type) {
      case DataSourceTypeEnums.ClickHouse:
        doGetColumns
          .run(iid, BigDataSourceType.instances, { database, table })
          .then((res: any) => onChangeColumns(res?.data || [], changeFlag));
        break;
      case DataSourceTypeEnums.MySQL:
        doGetColumns
          .run(datasource, BigDataSourceType.source, {
            database,
            table,
          })
          .then((res: any) => onChangeColumns(res?.data || [], changeFlag));
    }
  }, []);

  useEffect(() => {
    const current = form.getFieldValue([...itemNamePath]);
    if (!current.type) return;
    handleSelectType(current.type);
    if (current.type === DataSourceTypeEnums.MySQL && current.datasource) {
      handleSelectDatasource(current.datasource);
    }
    if (!current.database) return;
    handleSelectDatabase(current.database);
    if (!current.table) return;
    handleSelectTable(current.table);
  }, [file]);

  useEffect(() => {
    if (itemNamePath.includes("source") || !sourceType) return;
    if (
      itemNamePath.includes("target") &&
      sourceType === form.getFieldValue([...itemNamePath, "type"])
    ) {
      form.resetFields([
        [...itemNamePath, "type"],
        [...itemNamePath, "table"],
        [...itemNamePath, "database"],
        [...itemNamePath, "datasource"],
      ]);
    }
  }, [sourceType, itemNamePath]);

  return (
    <>
      <Form.Item
        name={[...itemNamePath, "type"]}
        label={"Type"}
        initialValue={
          !itemNamePath.includes("target") && DataSourceTypeEnums.ClickHouse
        }
      >
        <Select
          disabled={isLock}
          options={TypesOptions}
          onSelect={handleSelectType}
          onChange={(value: any) => {
            if (!value) return;
            if (itemNamePath.includes("source") && onSelectType) {
              onSelectType?.(value);
            }
            handleChangeSelect(FormItemEnums.type);
          }}
        />
      </Form.Item>

      <Form.Item noStyle shouldUpdate={handleFormUpdate}>
        {({ getFieldValue }) => {
          const type = getFieldValue([...itemNamePath, "type"]);
          // todo: 1 为集群，没有枚举
          if (
            type === DataSourceTypeEnums.ClickHouse &&
            instances.find((item) => item.id === currentInstance)?.mode === 1
          ) {
            return (
              <Form.Item name={[...itemNamePath, "cluster"]} label={"Cluster"}>
                <Select showSearch options={ClusterOptions} disabled={isLock} />
              </Form.Item>
            );
          }
          if (type === DataSourceTypeEnums.MySQL) {
            return (
              <Form.Item
                name={[...itemNamePath, "datasource"]}
                label={"Datasource"}
              >
                <Select
                  showSearch
                  disabled={isLock}
                  options={DatasourceOptions}
                  onSelect={handleSelectDatasource}
                  onChange={(value: any) => {
                    if (!value) return;
                    handleChangeSelect(FormItemEnums.datasource);
                  }}
                />
              </Form.Item>
            );
          }
          return null;
        }}
      </Form.Item>
      <Form.Item name={[...itemNamePath, "database"]} label={"Database"}>
        <Select
          showSearch
          disabled={isLock}
          options={DataBaseOptions}
          onSelect={handleSelectDatabase}
          onChange={(value: any) => {
            if (!value) return;
            handleChangeSelect(FormItemEnums.database);
          }}
        />
      </Form.Item>
      <Form.Item name={[...itemNamePath, "table"]} label={"Table"}>
        <Select
          showSearch
          disabled={isLock}
          options={SourceTableOptions}
          onSelect={(value: any) => {
            handleSelectTable(value, true);
          }}
        />
      </Form.Item>
    </>
  );
};
export default DatasourceSelect;
