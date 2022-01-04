import logLibraryListStyles from '@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/index.less';
import { Empty, Spin, Tooltip } from 'antd';
import { useModel } from '@@/plugin-model/useModel';
import lodash from 'lodash';
import { PaneType, QueryParams } from '@/models/dataLogs';
import moment from 'moment';
import { currentTimeStamp } from '@/utils/momentUtils';
import {
  ACTIVE_TIME_INDEX,
  FIFTEEN_TIME,
  FIRST_PAGE,
  MINUTES_UNIT_TIME,
  PAGE_SIZE,
  TimeRangeType,
} from '@/config/config';

type LogLibraryListProps = {
  list: string[];
};

const defaultPane: PaneType = {
  pane: '',
  start: moment().subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME).unix(),
  end: currentTimeStamp(),
  page: FIRST_PAGE,
  pageSize: PAGE_SIZE,
  keyword: undefined,
  activeIndex: ACTIVE_TIME_INDEX,
  activeTabKey: TimeRangeType.Relative,
};

const LogLibraryList = (props: LogLibraryListProps) => {
  const { list } = props;
  const {
    logPanes,
    onChangeLogPanes,
    onChangeLogLibrary,
    setChangeTabPane,
    currentLogLibrary,
    doGetLogs,
    doGetHighCharts,
    doParseQuery,
    resetLogs,
    resetCurrentHighChart,
    onChangeActiveTabKey,
    onChangeActiveTimeOptionIndex,
    getLogLibraries,
  } = useModel('dataLogs');
  const onChangePanes = (logLibrary: string) => {
    const currentPanes = lodash.cloneDeep(logPanes);
    const tabPane = currentPanes.find((item) => item.pane === logLibrary);
    let queryParam: undefined | QueryParams;
    if (tabPane) {
      setChangeTabPane(tabPane);
      queryParam = {
        page: tabPane.page,
        pageSize: tabPane.pageSize,
        st: tabPane.start,
        et: tabPane.end,
        kw: tabPane.keyword,
      };
    } else {
      resetLogs();
      queryParam = { ...defaultPane, st: defaultPane.start, et: defaultPane.end };
      currentPanes.push({
        ...defaultPane,
        pane: logLibrary,
      });
    }
    onChangeActiveTabKey(tabPane?.activeTabKey || TimeRangeType.Relative);
    onChangeActiveTimeOptionIndex(tabPane?.activeIndex || ACTIVE_TIME_INDEX);
    onChangeLogPanes(currentPanes);
    doGetLogs({ ...queryParam, logLibrary });
    doGetHighCharts({ ...queryParam, logLibrary });
    doParseQuery(queryParam?.kw);
  };

  return (
    <div className={logLibraryListStyles.logLibraryListMain}>
      <Spin spinning={getLogLibraries.loading} tip={'加载中...'}>
        {list.length > 0 ? (
          <ul>
            {list.map((item, index) => (
              <li
                className={currentLogLibrary === item ? logLibraryListStyles.activeLogLibrary : ''}
                key={index}
                onClick={() => {
                  if (currentLogLibrary === item) return;
                  onChangeLogLibrary(item);
                  resetCurrentHighChart();
                  onChangePanes(item);
                }}
              >
                <Tooltip placement={'right'} title={item}>
                  <span>{item}</span>
                </Tooltip>
              </li>
            ))}
          </ul>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={'未查询到相关日志库列表'} />
        )}
      </Spin>
    </div>
  );
};

export default LogLibraryList;
