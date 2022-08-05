import SourceCard from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/SourceCard";
import { useModel } from "@@/plugin-model/useModel";
import TargetCard from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/TargetCard";
import { FormInstance } from "antd";
import { useCallback, useState } from "react";
import { DataSourceTypeEnums } from "@/pages/DataAnalysis/OfflineManager/config";
import TableColumns from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/TableColumns";
import { OpenTypeEnums } from "@/models/dataanalysis/useIntegratedConfigs";

export interface DataSourceModuleProps {
  form: FormInstance<any>;
  iid: number;
  file: any;
  setSource: (arr: any[]) => void;
  setTarget: (arr: any[]) => void;
  setMapping: (arr: any[]) => void;
  source: any;
  target: any;
  openVisible: boolean;
  setOpenVisible: (val: boolean) => void;
  openType: any;
  setOpenType: (val: OpenTypeEnums | undefined) => void;
  tableName: any;
  setTableName: (val: string | undefined) => void;
  node: any;
}

const DataSourceModule = (props: DataSourceModuleProps) => {
  const generalModel = useModel("dataAnalysis", (model) => ({
    doGetSources: model.integratedConfigs.doGetSources,
    doGetSqlSource: model.dataSourceManage.doGetSourceList,
    doGetSourceTable: model.integratedConfigs.doGetSourceTables,
    doGetColumns: model.integratedConfigs.doGetColumns,
  }));
  const [sourceType, setSourceType] = useState<DataSourceTypeEnums>(
    DataSourceTypeEnums.ClickHouse
  );
  const { currentUser } = useModel("@@initialState").initialState || {};
  const {
    file,
    setSource,
    setTarget,
    setMapping,
    source,
    target,
    setOpenVisible,
    openType,
    setOpenType,
    tableName,
    setTableName,
    openVisible,
    node,
  } = props;
  const isLock =
    !file.lockUid || file?.lockUid === 0 || file?.lockUid !== currentUser?.id;

  const handleChangeSourceType = useCallback((type: DataSourceTypeEnums) => {
    setSourceType(type);
  }, []);

  const openModal = (type: OpenTypeEnums, tableName: string) => {
    setOpenType(type);
    setTableName(tableName);
    setOpenVisible(true);
  };

  return (
    <div
      style={{
        display: "flex",
        padding: 10,
      }}
    >
      <SourceCard
        onSelectType={handleChangeSourceType}
        {...props}
        {...generalModel}
        isLock={isLock}
        setSource={setSource}
        setMapping={setMapping}
        openModal={openModal}
        node={node}
      />
      <TargetCard
        sourceType={sourceType}
        {...props}
        {...generalModel}
        isLock={isLock}
        setTarget={setTarget}
        setMapping={setMapping}
        openModal={openModal}
        node={node}
      />
      <TableColumns
        source={source}
        target={target}
        openVisible={openVisible}
        setOpenVisible={setOpenVisible}
        openType={openType}
        setOpenType={setOpenType}
        tableName={tableName}
        setTableName={setTableName}
      />
    </div>
  );
};

export default DataSourceModule;
