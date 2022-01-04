import rawLogTabsStyles from '@/pages/DataLogs/components/RawLogTabs/index.less';
import { Empty, Tabs } from 'antd';
import QueryResult from '@/pages/DataLogs/components/QueryResult';
import { useModel } from '@@/plugin-model/useModel';
import lodash from 'lodash';
import { PaneType, QueryParams } from '@/models/dataLogs';
import { ACTIVE_TIME_INDEX, TimeRangeType } from '@/config/config';

const { TabPane } = Tabs;

type RawLogTabsProps = {};
const RawLogTabs = (props: RawLogTabsProps) => {
  const {
    logPanes,
    currentLogLibrary,
    doGetLogs,
    doGetHighCharts,
    doParseQuery,
    onChangeLogPanes,
    onChangeLogLibrary,
    resetLogs,
    resetCurrentHighChart,
    onChangeActiveTabKey,
    onChangeActiveTimeOptionIndex,
    onChangeStartDateTime,
    onChangeEndDateTime,
    onChangeKeywordInput,
    onChangeLogsPage,
  } = useModel('dataLogs');

  const doChange = (tabPane: PaneType, logLibrary: string) => {
    const queryParam: QueryParams = {
      page: tabPane?.page,
      pageSize: tabPane?.pageSize,
      st: tabPane?.start,
      et: tabPane?.end,
      kw: tabPane?.keyword,
      logLibrary: logLibrary,
    };
    onChangeLogsPage(tabPane?.page as number, tabPane?.pageSize as number);
    onChangeEndDateTime(tabPane?.end as number);
    onChangeStartDateTime(tabPane?.start as number);
    onChangeKeywordInput(tabPane?.keyword as string);
    onChangeActiveTabKey(tabPane?.activeTabKey || TimeRangeType.Relative);
    onChangeActiveTimeOptionIndex(tabPane?.activeIndex || ACTIVE_TIME_INDEX);
    resetCurrentHighChart();
    doGetLogs(queryParam);
    doGetHighCharts(queryParam);
    doParseQuery(queryParam?.kw);
  };

  const onEdit = (currentKey: any, action: any) => {
    if (!currentKey || action !== 'remove') return;
    const currentPanes = lodash.cloneDeep(logPanes);
    const resultPanes = currentPanes.filter((item) => item.pane !== currentKey) || [];
    onChangeLogPanes(resultPanes);
    if (resultPanes.length === 0) {
      resetLogs();
      onChangeLogLibrary(undefined);
      return;
    }
    if (currentKey === currentLogLibrary) {
      onChangeLogLibrary(resultPanes[0].pane);
      doChange(resultPanes[0], resultPanes[0].pane);
    }
  };

  const onChange = (key: string) => {
    if (key === currentLogLibrary) return;
    onChangeLogLibrary(key);
    const currentPanes = lodash.cloneDeep(logPanes);
    const tabPane = currentPanes.find((item) => item.pane === key);
    if (tabPane) doChange(tabPane, key);
  };

  return (
    <div className={rawLogTabsStyles.rawLogTabsMain}>
      {logPanes.length > 0 ? (
        <Tabs
          hideAdd
          type="editable-card"
          activeKey={currentLogLibrary}
          onChange={onChange}
          className={rawLogTabsStyles.tabs}
          onEdit={onEdit}
        >
          {logPanes.map((item) => (
            <TabPane key={item.pane} tab={item.pane}>
              <QueryResult />
            </TabPane>
          ))}
        </Tabs>
      ) : (
        <Empty
          style={{ flex: 1 }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={'请选择需要查询的日志库'}
        />
      )}
    </div>
  );
};
export default RawLogTabs;
