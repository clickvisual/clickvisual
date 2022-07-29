import logLibraryListStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/index.less";
import { Button, Empty, Spin, Tree } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
// import LogLibraryItem from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/LogLibraryItem";
import DatabaseViewsDraw from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/DatabaseViewsDraw";
import EditLogLibraryModal from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/EditLogLibraryModal";
import { useEffect, useState } from "react";
import { TablesResponse } from "@/services/dataLogs";
import LogLibraryInfoDraw from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/LogLibraryInfoDraw";
import { DownOutlined, PlusOutlined } from "@ant-design/icons";
import { cloneDeep } from "lodash";
import useUrlState from "@ahooksjs/use-url-state";

type LogLibraryListProps = {
  list: any[];
  onGetList: any;
};

const LogLibraryList = (props: LogLibraryListProps) => {
  const { list, onGetList } = props;
  const [urlState] = useUrlState();
  const { onChangeLogLibraryCreatedModalVisible, resizeMenuWidth } =
    useModel("dataLogs");
  const {
    doGetAllInstances,
    expandedKeys,
    onChangeExpandedKeys,
    onChangeCurrentlyTableToIid,
    selectKeys,
    onChangeSelectKeys,
  } = useModel("instances");

  const [selectedLogLibrary, setSelectedLogLibrary] = useState<
    TablesResponse | undefined
  >();

  const handleOnSelect = (item: any, val?: any) => {
    const { node } = val;
    const { key } = node;
    node?.iid && onChangeCurrentlyTableToIid(node.iid);
    onChangeSelectKeys([key]);
    if (Boolean(node?.istable)) {
      setSelectedLogLibrary(node.node);
      return;
    }
    const selectKeyIndex = expandedKeys.findIndex(
      (selectKeysItem: string) => selectKeysItem == key
    );

    let arr = cloneDeep(expandedKeys);
    if (selectKeyIndex > -1) {
      arr.splice(selectKeyIndex, 1);
      onChangeExpandedKeys(arr);
      return;
    }
    onChangeExpandedKeys([...expandedKeys, key]);
  };

  const handleOnExpand = (expandedKeys: any[], info: any) => {
    onChangeExpandedKeys(expandedKeys);
  };

  useEffect(() => {
    if (urlState?.tid) {
      onChangeSelectKeys([`table-${urlState?.tid}`]);
      // 三层循环查找替换
      let cloneInstanceList = cloneDeep(list).filter((instanceItem: any) => {
        const cloneDatabase = instanceItem.children.filter(
          (databaseItem: any) => {
            const cloneTable = databaseItem.children.filter(
              (tableItem: any) => {
                return tableItem.key.indexOf(`table-${urlState?.tid}`) != -1;
              }
            );
            databaseItem.children = cloneTable;
            return cloneTable.length > 0;
          }
        );
        instanceItem.children = cloneDatabase;
        return cloneDatabase.length > 0;
      });

      // 展开所有的实例和数据库
      let keys: any = [];
      cloneInstanceList.map((item: any) => {
        keys.push(item.key);
        item.children.map((databaseItem: any) => {
          keys.push(databaseItem.key);
        });
      });
      onChangeExpandedKeys(keys);
    }
  }, []);

  const i18n = useIntl();

  if (list?.length <= 0) {
    return (
      <>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginBottom: 10 }}
          description={i18n.formatMessage({
            id: "datasource.logLibrary.empty",
          })}
        />
        <div className={logLibraryListStyles.emptyBtn}>
          <Button
            onClick={() => onChangeLogLibraryCreatedModalVisible(true)}
            type={"primary"}
            icon={<PlusOutlined />}
          >
            {i18n.formatMessage({ id: "datasource.logLibrary.quickAdd" })}
          </Button>
        </div>
      </>
    );
  }

  return (
    <div
      className={logLibraryListStyles.logLibraryListMain}
      style={{ width: `${resizeMenuWidth}px` }}
    >
      <Spin
        spinning={doGetAllInstances.loading}
        tip={i18n.formatMessage({ id: "spin" })}
        style={{ background: "hsla(0, 0%, 92%, 0.4)" }}
      >
        <Tree
          showIcon
          blockNode
          selectedKeys={selectKeys ?? []}
          switcherIcon={<DownOutlined />}
          onSelect={handleOnSelect}
          onExpand={handleOnExpand}
          expandedKeys={expandedKeys}
          treeData={list}
        />
      </Spin>
      <DatabaseViewsDraw logLibrary={selectedLogLibrary as TablesResponse} />
      <LogLibraryInfoDraw logLibrary={selectedLogLibrary as TablesResponse} />
      <EditLogLibraryModal onGetList={onGetList} />
    </div>
  );
};

export default LogLibraryList;
