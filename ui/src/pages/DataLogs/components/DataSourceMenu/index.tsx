import dataSourceMenuStyles from "@/pages/DataLogs/components/DataSourceMenu/index.less";
import LoggingLibrary from "@/pages/DataLogs/components/DataSourceMenu/LoggingLibrary";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import { Empty } from "antd";
import { useIntl } from "umi";
import ResizeWidth from "@/pages/DataLogs/components/DataSourceMenu/ResizeWidth";

const MENU_MIN = 200;
const MENU_MAX = 400;
const MENU_DEFAULT = 200;

const DataSourceMenu = () => {
  const { doGetDatabaseList, currentDatabase } = useModel("dataLogs");
  const { foldingState, onChangeResizeMenuWidth } = useModel("dataLogs");

  const i18n = useIntl();

  useEffect(() => {
    doGetDatabaseList();
  }, []);

  const storedMenuWidth = localStorage.getItem("app-left-menu-width");
  const calculatedMenuWidth = storedMenuWidth
    ? parseInt(storedMenuWidth, 10)
    : MENU_DEFAULT;
  const [menuWidth, setMenuWidth] = useState(calculatedMenuWidth);
  const [expandLeftWidth, setExpandLeftWidth] = useState(calculatedMenuWidth);

  const handleResize = useCallback(
    (offset) => {
      let res = menuWidth + offset;
      if (res < MENU_MIN) {
        res = MENU_MIN;
      }
      if (res > MENU_MAX) {
        res = MENU_MAX;
      }
      setMenuWidth(res);
      setExpandLeftWidth(res);
      onChangeResizeMenuWidth(res);
    },
    [menuWidth]
  );

  const handleToggleExpand = useCallback(
    (isExpend) => {
      setMenuWidth(isExpend ? expandLeftWidth : 0);
    },
    [expandLeftWidth]
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
      style={{ width: `${expandLeftWidth}px` }}
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
