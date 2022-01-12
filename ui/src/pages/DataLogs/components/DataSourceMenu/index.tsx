import dataSourceMenuStyles from "@/pages/DataLogs/components/DataSourceMenu/index.less";
import SourceHeader from "@/pages/DataLogs/components/DataSourceMenu/SourceHeader";
import LoggingLibrary from "@/pages/DataLogs/components/DataSourceMenu/LoggingLibrary";
import { useEffect } from "react";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
type DataSourceMenuProps = {};
const DataSourceMenu = (props: DataSourceMenuProps) => {
  const {} = props;
  const { doGetDatabaseList } = useModel("dataLogs");
  useEffect(() => {
    doGetDatabaseList();
  }, []);
  return (
    <div className={classNames(dataSourceMenuStyles.dataSourceMenuMain)}>
      <SourceHeader />
      <LoggingLibrary />
    </div>
  );
};

export default DataSourceMenu;
