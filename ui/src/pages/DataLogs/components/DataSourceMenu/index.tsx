import dataSourceMenuStyles from "@/pages/DataLogs/components/DataSourceMenu/index.less";
import LoggingLibrary from "@/pages/DataLogs/components/DataSourceMenu/LoggingLibrary";
import { useCallback, useEffect, useMemo } from "react";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import { Empty } from "antd";
import { useIntl } from "umi";
import ResizeWidth from "@/pages/DataLogs/components/DataSourceMenu/ResizeWidth";

const MENU_MIN = 200;
const MENU_MAX = 400;

const DataSourceMenu = () => {
  const { doGetDatabaseList, currentDatabase } = useModel("dataLogs");
  const { foldingState, onChangeResizeMenuWidth, resizeMenuWidth } =
    useModel("dataLogs");

  const i18n = useIntl();

  useEffect(() => {
    doGetDatabaseList();
  }, []);

  const handleResize = useCallback(
    (offset) => {
      let res = resizeMenuWidth + offset;
      if (res < MENU_MIN) {
        res = MENU_MIN;
      }
      if (res > MENU_MAX) {
        res = MENU_MAX;
      }
      onChangeResizeMenuWidth(res);
    },
    [resizeMenuWidth]
  );

  const handleToggleExpand = useCallback(
    (isExpend) => {
      onChangeResizeMenuWidth(isExpend ? resizeMenuWidth : 0);
    },
    [resizeMenuWidth]
  );

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
      style={{ width: `${resizeMenuWidth}px` }}
    >
      {LogLibrary}
      <ResizeWidth
        onResize={handleResize}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  );
};

export default DataSourceMenu;
