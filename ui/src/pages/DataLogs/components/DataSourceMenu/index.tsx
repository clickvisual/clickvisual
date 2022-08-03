import dataSourceMenuStyles from "@/pages/DataLogs/components/DataSourceMenu/index.less";
import LoggingLibrary from "@/pages/DataLogs/components/DataSourceMenu/LoggingLibrary";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import ResizeWidth from "@/pages/DataLogs/components/DataSourceMenu/ResizeWidth";
import LogLibraryItem from "./LogLibraryList/LogLibraryItem";
import DatabaseItem from "./LogLibraryList/DatabaseItem";
import InstanceItem from "./LogLibraryList/InstanceItem";

const MENU_MIN = 200;
const MENU_MAX = 400;

const DataSourceMenu = () => {
  const {
    foldingState,
    onChangeResizeMenuWidth,
    resizeMenuWidth,
    onChangeIsHasDatabase,
    // doGetDatabaseList,
  } = useModel("dataLogs");
  const { doGetAllInstances } = useModel("instances");
  // const [instanceTree, setInstanceTree] = useState<any[]>([]);
  const [allInstancesData, setAllInstancesData] = useState<any>([]);

  useEffect(() => {
    // doGetDatabaseList();
    getList();
    return () => onChangeIsHasDatabase(false);
  }, []);

  const getList = () => {
    doGetAllInstances.run().then((res: any) => {
      if (res.code != 0) return;
      if (res.data?.length > 0) {
        setAllInstancesData(res.data);
        // const treeList = treeDataConversion(res.data);
        // setInstanceTree(treeList);
        const hasDatabaseList = res.data.filter((item: any) => {
          return item.databases.length > 0;
        });
        onChangeIsHasDatabase(hasDatabaseList.length > 0);
      }
    });
  };

  const treeList = useMemo(() => {
    if (allInstancesData?.length > 0) {
      let arr: any = [];
      for (let i = 0; i < allInstancesData.length; i++) {
        const item = allInstancesData[i];
        let databasesList: any[] = [];
        if (item.databases?.length > 0) {
          for (let j = 0; j < item.databases.length; j++) {
            const databasesItem = item.databases[j];
            const tabList: any[] = [];
            if (databasesItem.tables?.length > 0) {
              for (let k = 0; k < databasesItem.tables.length; k++) {
                const tablesItem = databasesItem.tables[k];
                tabList.push({
                  title: (
                    <LogLibraryItem
                      logLibrary={tablesItem}
                      key={`table-${tablesItem.id}`}
                      onGetList={getList}
                    />
                  ),
                  key: `table-${tablesItem.id}`,
                  node: tablesItem,
                  istable: true,
                  iid: databasesItem.iid,
                  name: `${tablesItem.tableName}|${tablesItem.desc}`,
                });
              }
            }
            databasesList.push({
              title: (
                <DatabaseItem
                  databasesItem={databasesItem}
                  onGetList={getList}
                />
              ),
              key: `databases-${databasesItem.id}`,
              children: tabList,
              node: databasesItem,
            });
          }
        }
        arr.push({
          title: <InstanceItem instanceItem={item} />,
          key: `instance-${item.id}`,
          children: databasesList,
          node: item,
        });
      }
      return arr;
    }
    return allInstancesData;
  }, [allInstancesData]);

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

  return (
    <div
      className={classNames(
        dataSourceMenuStyles.dataSourceMenuMain,
        foldingState && dataSourceMenuStyles.dataSourceMenuHidden
      )}
      style={{ flex: `0 0 ${resizeMenuWidth}px` }}
    >
      <LoggingLibrary instanceTree={treeList} onGetList={getList} />
      <ResizeWidth
        onResize={handleResize}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  );
};

export default DataSourceMenu;
