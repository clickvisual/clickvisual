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
  const { foldingState } = useModel("dataLogs");
  useEffect(() => {
    doGetDatabaseList();
  }, []);

  useEffect(() => {
    console.log(foldingState);
  }, [foldingState]);

  return (
    <div
      className={classNames(
        dataSourceMenuStyles.dataSourceMenuMain,
        foldingState && dataSourceMenuStyles.dataSourceMenuHidden
      )}
    >
      <SourceHeader />
      <LoggingLibrary />
    </div>
  );
};

export default DataSourceMenu;
