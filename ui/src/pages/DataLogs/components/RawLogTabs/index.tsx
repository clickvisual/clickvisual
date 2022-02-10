import rawLogTabsStyles from "@/pages/DataLogs/components/RawLogTabs/index.less";
import { Empty, Tabs } from "antd";
import QueryResult from "@/pages/DataLogs/components/QueryResult";
import { useModel } from "@@/plugin-model/useModel";
import lodash from "lodash";
import { useIntl } from "umi";

const { TabPane } = Tabs;

const RawLogTabs = () => {
  const {
    logPanes,
    currentLogLibrary,
    onChangeLogPanes,
    onChangeLogLibrary,
    resetLogs,
    onChangeCurrentLogPane,
  } = useModel("dataLogs");

  const i18n = useIntl();

  const onEdit = (currentKey: any, action: any) => {
    if (!currentKey || action !== "remove") return;
    const currentPanes = lodash.cloneDeep(logPanes);
    const resultPanes =
      currentPanes.filter(
        (item) => item.paneId !== JSON.parse(currentKey).id
      ) || [];
    onChangeLogPanes(resultPanes);
    if (resultPanes.length === 0) {
      resetLogs();
      onChangeLogLibrary(undefined);
      return;
    }
    if (currentKey === currentLogLibrary) {
      onChangeLogLibrary({
        id: resultPanes[0].paneId,
        tableName: resultPanes[0].pane,
      });
      onChangeCurrentLogPane(resultPanes[0]);
    }
  };

  const onChange = (key: string) => {
    if (key === JSON.stringify(currentLogLibrary)) return;
    onChangeLogLibrary(JSON.parse(key));
    const currentPanes = lodash.cloneDeep(logPanes);
    const tabPane = currentPanes.find((item) => item.pane === key);
    if (tabPane) onChangeCurrentLogPane(tabPane);
  };

  return (
    <div className={rawLogTabsStyles.rawLogTabsMain}>
      {logPanes.length > 0 ? (
        <Tabs
          hideAdd
          type="editable-card"
          activeKey={JSON.stringify(currentLogLibrary)}
          onChange={onChange}
          className={rawLogTabsStyles.tabs}
          onEdit={onEdit}
        >
          {logPanes.map((item) => (
            <TabPane
              key={JSON.stringify({ id: item.paneId, tableName: item.pane })}
              tab={item.pane}
            >
              <QueryResult />
            </TabPane>
          ))}
        </Tabs>
      ) : (
        <Empty
          style={{ flex: 1 }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={i18n.formatMessage({ id: "log.empty.logLibrary" })}
        />
      )}
    </div>
  );
};
export default RawLogTabs;
