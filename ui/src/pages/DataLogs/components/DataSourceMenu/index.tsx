import dataSourceMenuStyles from "@/pages/DataLogs/components/DataSourceMenu/index.less";
import SourceHeader from "@/pages/DataLogs/components/DataSourceMenu/SourceHeader";
import LoggingLibrary from "@/pages/DataLogs/components/DataSourceMenu/LoggingLibrary";
import { useEffect, useMemo } from "react";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import { Empty } from "antd";
import { useIntl } from "umi";

const DataSourceMenu = () => {
  const { doGetDatabaseList, currentDatabase } = useModel("dataLogs");
  const { foldingState } = useModel("dataLogs");

  const i18n = useIntl();

  useEffect(() => {
    doGetDatabaseList();
  }, []);

  const LogLibrary = useMemo(() => {
    if (!currentDatabase) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginBottom: 10 }}
          description={i18n.formatMessage({
            id: "alarm.rules.selected.placeholder.database",
          })}
        />
      );
    }

    return <LoggingLibrary />;
  }, [currentDatabase]);

  return (
    <div
      className={classNames(
        dataSourceMenuStyles.dataSourceMenuMain,
        foldingState && dataSourceMenuStyles.dataSourceMenuHidden
      )}
    >
      <SourceHeader />
      {LogLibrary}
    </div>
  );
};

export default DataSourceMenu;
