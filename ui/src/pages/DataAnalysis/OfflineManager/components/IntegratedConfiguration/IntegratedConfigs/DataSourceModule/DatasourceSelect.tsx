import { useCallback, useEffect, useMemo, useState } from "react";
import { BigDataSourceType } from "@/services/bigDataWorkflow";
import {
  Button,
  Col,
  Form,
  message,
  notification,
  Row,
  Select,
  Space,
} from "antd";
import { SourceCardProps } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/SourceCard";
import {
  DataSourceTypeEnums,
  FormItemEnums,
  TypeOptions,
} from "@/pages/DataAnalysis/OfflineManager/config";
import { useModel } from "@@/plugin-model/useModel";
import Request from "umi-request";
import { OpenTypeEnums } from "@/models/dataanalysis/useIntegratedConfigs";
import { ClusterMode } from "@/models/clusters";
import { TertiaryEnums } from "@/pages/DataAnalysis/service/enums";

export interface DatasourceSelectProps extends SourceCardProps {
  itemNamePath: string[];
  onChangeColumns: (columns: any[], isChange?: boolean) => void;
  sourceType?: DataSourceTypeEnums;
  openModal: any;
  node: any;
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
  openModal,
  node,
  source,
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
    doStructuralTransfer,
    // selectNode,
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
    doStructuralTransfer: model.integratedConfigs.doStructuralTransfer,
    // selectNode: model.manageNode.selectNode,
  }));

  const currentSource = useMemo(() => {
    return form.getFieldValue([...itemNamePath]);
  }, [itemNamePath]);

  const parentNamePath: string[] = useMemo(() => {
    return itemNamePath.filter(
      (item) => item !== "target" && item !== "source"
    );
  }, []);

  const initTypeValue = useMemo(() => {
    switch (node.tertiary) {
      case TertiaryEnums.realtime:
        return (
          itemNamePath.includes("source") && DataSourceTypeEnums.ClickHouse
        );
      case TertiaryEnums.offline:
        if (itemNamePath.includes("source")) {
          return DataSourceTypeEnums.MySQL;
        }
        if (itemNamePath.includes("target")) {
          return DataSourceTypeEnums.ClickHouse;
        }
    }
    return undefined;
  }, [itemNamePath, node]);

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
    switch (node.tertiary) {
      case TertiaryEnums.realtime:
        if (!itemNamePath.includes("target")) {
          return TypeOptions;
        }
        return TypeOptions.filter(
          (item) =>
            item.value !==
            form.getFieldValue([...parentNamePath, "source", "type"])
        );
      case TertiaryEnums.offline:
        if (itemNamePath.includes("source")) {
          return TypeOptions.filter(
            (item) => item.value === DataSourceTypeEnums.MySQL
          );
        }
        if (itemNamePath.includes("target")) {
          return TypeOptions.filter(
            (item) => item.value === DataSourceTypeEnums.ClickHouse
          );
        }
        return TypeOptions;
      default:
        return TypeOptions;
    }
  }, [sourceType, node, parentNamePath, currentSource]);

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
            .then((res: any) => {
              if (res?.code !== 0) return;
              setDatabaseList(res?.data || []);
            });
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
            .then((res: any) => {
              if (res?.code !== 0) return;
              setDatasourceList(res?.data || []);
            });
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
        .then((res: any) => {
          if (res?.code !== 0) return;
          setDatabaseList(res?.data || []);
        });
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
            .then((res: any) => {
              if (res?.code !== 0) return;
              setSourceTableList(res?.data || []);
            });
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
            .then((res: any) => {
              if (res?.code !== 0) return;
              setSourceTableList(res?.data || []);
            });
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
      <Row gutter={8}>
        <Col span={10}>
          <Form.Item
            label={"Type"}
            name={[...itemNamePath, "type"]}
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
            initialValue={initTypeValue}
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
        </Col>
        <Col span={14}>
          <Form.Item noStyle shouldUpdate={handleFormUpdate}>
            {({ getFieldValue }) => {
              const type = getFieldValue([...itemNamePath, "type"]);
              if (
                type === DataSourceTypeEnums.ClickHouse &&
                instances.find((item) => item.id === currentInstance)?.mode ===
                  ClusterMode.cluster
              ) {
                return (
                  <Form.Item
                    label={"Cluster"}
                    name={[...itemNamePath, "cluster"]}
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                  >
                    <Select
                      showSearch
                      options={ClusterOptions}
                      disabled={isLock}
                    />
                  </Form.Item>
                );
              }
              if (type === DataSourceTypeEnums.MySQL) {
                return (
                  <Form.Item
                    label={"Datasource"}
                    name={[...itemNamePath, "datasource"]}
                    labelCol={{ span: 9 }}
                    wrapperCol={{ span: 15 }}
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
        </Col>
      </Row>
      <Form.Item name={[...itemNamePath, "database"]} label={"Database"}>
        <Select
          showSearch
          disabled={isLock || !form.getFieldValue([...itemNamePath, "type"])}
          options={DataBaseOptions}
          onSelect={handleSelectDatabase}
          onChange={(value: any) => {
            if (!value) return;
            handleChangeSelect(FormItemEnums.database);
          }}
        />
      </Form.Item>
      <Form.Item label={"Table"}>
        <Row gutter={12}>
          <Col span={itemNamePath.includes("target") ? 13 : 19}>
            <Form.Item noStyle name={[...itemNamePath, "table"]}>
              <Select
                showSearch
                disabled={isLock}
                options={SourceTableOptions}
                onSelect={(value: any) => {
                  handleSelectTable(value, true);
                }}
              />
            </Form.Item>
          </Col>
          <Col span={itemNamePath.includes("target") ? 11 : 5}>
            <Space>
              <Button
                type={"primary"}
                onClick={() => {
                  const table = form.getFieldValue([...itemNamePath, "table"]);
                  if (itemNamePath.includes("source")) {
                    openModal(OpenTypeEnums.source, table);
                  }
                  if (itemNamePath.includes("target")) {
                    openModal(OpenTypeEnums.target, table);
                  }
                }}
              >
                表结构
              </Button>
              {itemNamePath.includes("target") ? (
                <Button
                  type={"primary"}
                  onClick={() => {
                    const table = form.getFieldValue(["source", "table"]);
                    console.log(itemNamePath, "itemNamePath", table, source);
                    if (source.length == 0) {
                      message.warning("数据来源表结构为空");
                      return;
                    }
                    doStructuralTransfer
                      .run({
                        source: "mysql",
                        target: "clickhouse",
                        columns: source,
                      })
                      .then((res: any) => {
                        if (res.code != 0 || !res.data) return;
                        notification.open({
                          message: `字段展示`,
                          description: res.data,
                          placement: "top",
                          duration: null,
                        });
                      });
                  }}
                >
                  字段生成
                </Button>
              ) : null}
            </Space>
          </Col>
        </Row>
      </Form.Item>
    </>
  );
};
export default DatasourceSelect;
