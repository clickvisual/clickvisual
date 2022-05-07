import rawLogTabsStyles from "@/pages/DataLogs/components/RawLogTabs/index.less";
import { Empty, Tabs } from "antd";
import QueryResult from "@/pages/DataLogs/components/QueryResult";
import { useModel } from "@@/plugin-model/useModel";
import lodash from "lodash";
import { useIntl } from "umi";
import useTimeOptions from "@/pages/DataLogs/hooks/useTimeOptions";
import ManageIndexModal from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal";
import useUrlState from "@ahooksjs/use-url-state";
import { RestUrlStates } from "@/pages/DataLogs/hooks/useLogUrlParams";

const { TabPane } = Tabs;

const RawLogTabs = () => {
  const [_, setUrlState] = useUrlState();
  const {
    currentLogLibrary,
    onChangeLogPane,
    onChangeLogLibrary,
    resetLogs,
    logPanesHelper,
    onChangeCurrentLogPane,
  } = useModel("dataLogs");
  const { logPanes, paneKeys, removeLogPane } = logPanesHelper;

  const i18n = useIntl();
  const { handleChangeRelativeAmountAndUnit } = useTimeOptions();

  const onEdit = (currentKey: any, action: any) => {
    if (!currentKey || action !== "remove") return;
    const currentPanes = lodash.cloneDeep(logPanes);
    const resultKeys = paneKeys.filter((key) => key !== currentKey) || [];
    const len = resultKeys.length;
    removeLogPane(currentKey);
    if (len === 0) {
      resetLogs();
      setUrlState(RestUrlStates);
      onChangeLogLibrary(undefined);
    }
    if (len > 0 && parseInt(currentKey) === currentLogLibrary?.id) {
      const currentPane = currentPanes[resultKeys[0]];
      delete currentPanes[currentKey];
      handleChangeRelativeAmountAndUnit(currentPane);
      onChangeCurrentLogPane(currentPane, currentPanes);
      onChangeLogLibrary({
        id: parseInt(currentPane.paneId),
        tableName: currentPane.pane,
        createType: currentPane.paneType,
      });
    }
  };

  const handleChangeTab = (key: string) => {
    const logLibraryId = parseInt(key);
    if (logLibraryId === currentLogLibrary?.id) return;
    const tabPane = logPanes[key];
    if (!tabPane) return;
    handleChangeRelativeAmountAndUnit(tabPane);
    onChangeLogPane(tabPane);
  };

  return (
    <div className={rawLogTabsStyles.rawLogTabsMain}>
      {paneKeys.length > 0 ? (
        <Tabs
          hideAdd
          type="editable-card"
          activeKey={currentLogLibrary?.id.toString()}
          onChange={handleChangeTab}
          className={rawLogTabsStyles.tabs}
          onEdit={onEdit}
        >
          {paneKeys.map((item) => {
            const pane = logPanes[item];
            return (
              pane && (
                <TabPane key={pane.paneId} tab={pane.pane}>
                  <QueryResult />
                </TabPane>
              )
            );
          })}
        </Tabs>
      ) : (
        <Empty
          style={{ flex: 1 }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={i18n.formatMessage({ id: "log.empty.logLibrary" })}
        />
      )}
      <ManageIndexModal />
    </div>
  );
};
export default RawLogTabs;
