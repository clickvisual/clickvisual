import SourceCard from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/SourceCard";
import { useModel } from "@@/plugin-model/useModel";
import TargetCard from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/TargetCard";
import { FormInstance } from "antd";

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
  const { currentUser } = useModel("@@initialState").initialState || {};
  const { file } = props;
  const isLock =
    !file.lockUid || file?.lockUid === 0 || file?.lockUid !== currentUser?.id;

  return (
    <div
      style={{
        display: "flex",
        padding: 10,
      }}
    >
      <SourceCard {...props} {...generalModel} isLock={isLock} />
      <TargetCard {...props} {...generalModel} isLock={isLock} />
    </div>
  );
};

export default DataSourceModule;
