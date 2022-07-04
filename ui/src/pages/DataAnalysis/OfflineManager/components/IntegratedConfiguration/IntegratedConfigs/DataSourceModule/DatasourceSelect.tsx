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
import Request from "umi-request";

export interface DatasourceSelectProps extends SourceCardProps {
  itemNamePath: string[];
  onChangeColumns: (columns: any[], isChange?: boolean) => void;
  sourceType?: DataSourceTypeEnums;
}

const CancelToken = Request.CancelToken;

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
  const {
    instances,
    currentInstance,
    cancelTokenTargetListRef,
    cancelTokenSourceListRef,
    cancelTokenTargetRef,
    cancelTokenSourceRef,
    cancelTokenTargetTableRef,
    cancelTokenSourceTableRef,
    cancelTokenTargetColumnsRef,
    cancelTokenSourceColumnsRef,
  } = useModel("dataAnalysis", (model) => ({
    instances: model.instances,
    currentInstance: model.currentInstances,

    cancelTokenTargetListRef: model.dataSourceManage.cancelTokenTargetListRef,
    cancelTokenSourceListRef: model.dataSourceManage.cancelTokenSourceListRef,
    cancelTokenTargetRef: model.integratedConfigs.cancelTokenTargetRef,
    cancelTokenSourceRef: model.integratedConfigs.cancelTokenSourceRef,
    cancelTokenTargetTableRef:
      model.integratedConfigs.cancelTokenTargetTableRef,
    cancelTokenSourceTableRef:
      model.integratedConfigs.cancelTokenSourceTableRef,
    cancelTokenTargetColumnsRef:
      model.integratedConfigs.cancelTokenTargetColumnsRef,
    cancelTokenSourceColumnsRef:
      model.integratedConfigs.cancelTokenSourceColumnsRef,
  }));

  const currentSource = useMemo(() => {
    return form.getFieldValue([...itemNamePath]);
  }, [itemNamePath]);

  const targetNamePath: string[] = useMemo(() => {
    if (!itemNamePath.includes("target")) return [];
    return itemNamePath.filter((item) => item !== "target");
  }, []);

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
        item.value !== form.getFieldValue([...targetNamePath, "source", "type"])
    );
  }, [sourceType, targetNamePath, currentSource]);

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

  const handleSelectType = useCallback(
    (type: DataSourceTypeEnums) => {
      switch (type) {
        case DataSourceTypeEnums.ClickHouse:
          doGetSources
            .run(
              iid,
              BigDataSourceType.instances,
              new CancelToken(function executor(c) {
                if (itemNamePath.includes("source")) {
                  cancelTokenSourceRef.current = c;
                }
                if (itemNamePath.includes("target")) {
                  cancelTokenTargetRef.current = c;
                }
              })
            )
            .then((res: any) => setDatabaseList(res?.data || []));
          break;
        case DataSourceTypeEnums.MySQL:
          doGetSqlSource
            .run(
              { iid, typ: type },
              new CancelToken(function executor(c) {
                if (itemNamePath.includes("source")) {
                  cancelTokenSourceListRef.current = c;
                }
                if (itemNamePath.includes("target")) {
                  cancelTokenTargetListRef.current = c;
                }
              })
            )
            .then((res: any) => setDatasourceList(res?.data || []));
          break;
      }
    },
    [itemNamePath]
  );

  const handleSelectDatasource = useCallback(
    (sourceId: number) => {
      doGetSources
        .run(
          sourceId,
          BigDataSourceType.source,
          new CancelToken(function executor(c) {
            if (itemNamePath.includes("source")) {
              cancelTokenSourceRef.current = c;
            }
            if (itemNamePath.includes("target")) {
              cancelTokenTargetRef.current = c;
            }
          })
        )
        .then((res: any) => setDatabaseList(res?.data || []));
    },
    [itemNamePath]
  );

  const handleSelectDatabase = useCallback(
    (database) => {
      const type = form.getFieldValue([...itemNamePath, "type"]);
      const datasource = form.getFieldValue([...itemNamePath, "datasource"]);
      switch (type) {
        case DataSourceTypeEnums.ClickHouse:
          doGetSourceTable
            .run(
              iid,
              BigDataSourceType.instances,
              { database },
              new CancelToken(function executor(c) {
                if (itemNamePath.includes("source")) {
                  cancelTokenSourceTableRef.current = c;
                }
                if (itemNamePath.includes("target")) {
                  cancelTokenTargetTableRef.current = c;
                }
              })
            )
            .then((res: any) => setSourceTableList(res?.data || []));
          break;
        case DataSourceTypeEnums.MySQL:
          doGetSourceTable
            .run(
              datasource,
              BigDataSourceType.source,
              {
                database,
              },
              new CancelToken(function executor(c) {
                if (itemNamePath.includes("source")) {
                  cancelTokenSourceColumnsRef.current = c;
                }
                if (itemNamePath.includes("target")) {
                  cancelTokenTargetColumnsRef.current = c;
                }
              })
            )
            .then((res: any) => setSourceTableList(res?.data || []));
      }
    },
    [itemNamePath]
  );

  const handleSelectTable = useCallback(
    (table: any, changeFlag?: boolean) => {
      const type = form.getFieldValue([...itemNamePath, "type"]);
      const datasource = form.getFieldValue([...itemNamePath, "datasource"]);
      const database = form.getFieldValue([...itemNamePath, "database"]);
      if (table) onChangeColumns([]);
      switch (type) {
        case DataSourceTypeEnums.ClickHouse:
          doGetColumns
            .run(
              iid,
              BigDataSourceType.instances,
              { database, table },
              new CancelToken(function executor(c) {
                if (itemNamePath.includes("source")) {
                  cancelTokenSourceTableRef.current = c;
                }
                if (itemNamePath.includes("target")) {
                  cancelTokenTargetTableRef.current = c;
                }
              })
            )
            .then((res: any) => onChangeColumns(res?.data || [], changeFlag));
          break;
        case DataSourceTypeEnums.MySQL:
          doGetColumns
            .run(
              datasource,
              BigDataSourceType.source,
              {
                database,
                table,
              },
              new CancelToken(function executor(c) {
                if (itemNamePath.includes("source")) {
                  cancelTokenSourceTableRef.current = c;
                }
                if (itemNamePath.includes("target")) {
                  cancelTokenTargetTableRef.current = c;
                }
              })
            )
            .then((res: any) => {
              if (res?.code === 0) {
                onChangeColumns(res?.data || [], changeFlag);
              }
            });
      }
    },
    [itemNamePath]
  );

  useEffect(() => {
    if (!currentSource?.type) return;
    handleSelectType(currentSource.type);
    if (
      currentSource.type === DataSourceTypeEnums.MySQL &&
      currentSource.datasource
    ) {
      handleSelectDatasource(currentSource.datasource);
    }
    if (!currentSource.database) return;
    handleSelectDatabase(currentSource.database);
    if (!currentSource.table) return;
    handleSelectTable(currentSource.table);
  }, [file, currentSource]);

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
            if (itemNamePath.includes("source")) {
              onChangeColumns([]);
              setSourceTableList([]);
              setDatabaseList([]);
              setDatasourceList([]);

              form.resetFields([
                ["target", "type"],
                ["target", "table"],
                ["target", "database"],
                ["target", "datasource"],
              ]);
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
