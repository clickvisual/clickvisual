import { useCallback, useEffect, useMemo, useState } from "react";
import { BigDataSourceType } from "@/services/bigDataWorkflow";
import { Form, Select } from "antd";
import { SourceCardProps } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/SourceCard";
import {
  DataSourceTypeEnums,
  FormItemEnums,
  TypeOptions,
} from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/config";

export interface DatasourceSelectProps extends SourceCardProps {
  itemNamePath: string[];
  onChangeColumns: (columns: any[]) => void;
}

const DatasourceSelect = ({
  form,
  iid,
  doGetSources,
  doGetSqlSource,
  doGetSourceTable,
  doGetColumns,
  itemNamePath,
  onChangeColumns,
}: DatasourceSelectProps) => {
  const [databaseList, setDatabaseList] = useState<any[]>([]);
  const [datasourceList, setDatasourceList] = useState<any[]>([]);
  const [sourceTableList, setSourceTableList] = useState<any[]>([]);

  const DatasourceOptions = useMemo(() => {
    const result: any[] = [];
    for (const datasource of datasourceList) {
      result.push({ value: datasource.id, label: datasource.name });
    }
    return result;
  }, [datasourceList]);

  const DataBaseOptions = useMemo(() => {
    const result: any[] = [];

    for (const database of databaseList) {
      result.push({ value: database, label: database });
    }
    return result;
  }, [databaseList]);

  const SourceTableOptions = useMemo(() => {
    const result: any[] = [];

    for (const table of sourceTableList) {
      result.push({ value: table, label: table });
    }
    return result;
  }, [sourceTableList]);

  const handleChangeSelect = useCallback((formItem: FormItemEnums) => {
    const resetTable = [
      FormItemEnums.type,
      FormItemEnums.datasource,
      FormItemEnums.database,
    ];
    const resetDatabase = [FormItemEnums.type, FormItemEnums.datasource];
    const resetDatasource = [FormItemEnums.type];

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

  useEffect(() => {
    if (
      form.getFieldValue([...itemNamePath, "type"]) ===
      DataSourceTypeEnums.ClickHouse
    ) {
      doGetSources
        .run(iid, BigDataSourceType.instances)
        .then((res: any) => setDatabaseList(res?.data || []));
    }
  }, []);

  const handleChangeType = useCallback((type) => {
    handleChangeSelect(FormItemEnums.type);
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

  const handleChangeDatasource = useCallback((id) => {
    handleChangeSelect(FormItemEnums.database);
    doGetSources
      .run(id, BigDataSourceType.source)
      .then((res: any) => setDatabaseList(res?.data || []));
  }, []);

  const handleChangeDatabase = useCallback((database) => {
    const formValue = form.getFieldValue([...itemNamePath]);
    if (!formValue) return;
    const { id, source } =
      formValue.type === DataSourceTypeEnums.ClickHouse
        ? { id: iid, source: BigDataSourceType.instances }
        : {
            id: formValue.datasource,
            source: BigDataSourceType.source,
          };
    doGetSourceTable
      .run(id, source, { database })
      .then((res: any) => setSourceTableList(res?.data || []));
  }, []);

  const handleChangeTable = useCallback((table) => {
    const formValue = form.getFieldValue([...itemNamePath]);
    if (!formValue) return;
    const { id, source, database } =
      formValue.type === DataSourceTypeEnums.ClickHouse
        ? {
            id: iid,
            source: BigDataSourceType.instances,
            database: formValue.database,
          }
        : {
            id: formValue.datasource,
            source: BigDataSourceType.source,
            database: formValue.database,
          };
    doGetColumns.run(id, source, { database, table }).then((res: any) => {
      if (res?.code !== 0) return;
      onChangeColumns(res.data);
    });
  }, []);

  return (
    <>
      <Form.Item
        name={[...itemNamePath, "type"]}
        label={"Type"}
        initialValue={DataSourceTypeEnums.ClickHouse}
      >
        <Select options={TypeOptions} onChange={handleChangeType} />
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, nextValues) => {
          let pre: any, next: any;
          itemNamePath.forEach((path) => {
            pre = prevValues[path];
            next = nextValues[path];
          });
          return pre?.type !== next?.type;
        }}
      >
        {({ getFieldValue }) => {
          if (
            getFieldValue([...itemNamePath, "type"]) ===
            DataSourceTypeEnums.ClickHouse
          ) {
            return null;
          }
          return (
            <Form.Item
              name={[...itemNamePath, "datasource"]}
              label={"Datasource"}
            >
              <Select
                options={DatasourceOptions}
                onChange={handleChangeDatasource}
              />
            </Form.Item>
          );
        }}
      </Form.Item>
      <Form.Item name={[...itemNamePath, "database"]} label={"Database"}>
        <Select options={DataBaseOptions} onChange={handleChangeDatabase} />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, nextValues) => {
          let pre: any, next: any;
          itemNamePath.forEach((path) => {
            pre = prevValues[path];
            next = nextValues[path];
          });
          return pre?.database !== next?.database;
        }}
      >
        {({ getFieldValue }) => {
          if (!getFieldValue([...itemNamePath, "database"])) return null;
          return (
            <Form.Item name={[...itemNamePath, "table"]} label={"Table"}>
              <Select
                options={SourceTableOptions}
                onChange={handleChangeTable}
              />
            </Form.Item>
          );
        }}
      </Form.Item>
    </>
  );
};
export default DatasourceSelect;
