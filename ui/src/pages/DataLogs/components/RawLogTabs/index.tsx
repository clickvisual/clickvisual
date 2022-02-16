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
    const keyObj = JSON.parse(currentKey);
    const resultPanes =
      currentPanes.filter((item) => item.paneId !== keyObj.id) || [];
    console.log("currentPanes: ", currentPanes, resultPanes, currentKey);
    onChangeLogPanes(resultPanes);
    if (resultPanes.length === 0) {
      resetLogs();
      onChangeLogLibrary(undefined);
      return;
    }
    if (keyObj.id === currentLogLibrary?.id) {
      onChangeLogLibrary({
        id: resultPanes[0].paneId,
        tableName: resultPanes[0].pane,
      });
      onChangeCurrentLogPane(resultPanes[0]);
    }
  };

  const handleChangeTab = (key: string) => {
    const currentPane = JSON.parse(key);
    if (currentPane.id === currentLogLibrary?.id) return;
    onChangeLogLibrary(currentPane);
    const currentPanes = lodash.cloneDeep(logPanes);
    const tabPane = currentPanes.find((item) => item.paneId === currentPane.id);
    if (tabPane) onChangeCurrentLogPane(tabPane);
  };

  return (
    <div className={rawLogTabsStyles.rawLogTabsMain}>
      {logPanes.length > 0 ? (
        <Tabs
          hideAdd
          type="editable-card"
          activeKey={JSON.stringify(currentLogLibrary)}
          onChange={handleChangeTab}
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
