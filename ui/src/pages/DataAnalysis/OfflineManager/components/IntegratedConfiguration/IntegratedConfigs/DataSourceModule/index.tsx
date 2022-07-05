import SourceCard from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/SourceCard";
import { useModel } from "@@/plugin-model/useModel";
import TargetCard from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/TargetCard";
import { FormInstance } from "antd";
import { useCallback, useState } from "react";
import { DataSourceTypeEnums } from "@/pages/DataAnalysis/OfflineManager/config";
import TableColumns from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/TableColumns";

export interface DataSourceModuleProps {
  form: FormInstance<any>;
  iid: number;
  file: any;
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
  const { file } = props;
  const isLock =
    !file.lockUid || file?.lockUid === 0 || file?.lockUid !== currentUser?.id;

  const handleChangeSourceType = useCallback((type: DataSourceTypeEnums) => {
    setSourceType(type);
  }, []);

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
      />
      <TargetCard
        sourceType={sourceType}
        {...props}
        {...generalModel}
        isLock={isLock}
      />
      <TableColumns />
    </div>
  );
};

export default DataSourceModule;
