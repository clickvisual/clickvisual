import searchBarStyles from '@/pages/DataLogs/components/SearchBar/index.less';
import { Button, Input } from 'antd';
import { useModel } from 'umi';
import DarkTimeSelect from '@/pages/DataLogs/components/DateTimeSelected';
import { useDebounceFn } from 'ahooks';
import SearchBarSuffixIcon from '@/pages/DataLogs/components/SearchBar/SearchBarSuffixIcon';
import { PaneType } from '@/models/dataLogs';
import {DEBOUNCE_WAIT, FIRST_PAGE, PAGE_SIZE} from "@/config/config";

const SearchBar = () => {
  const {
    currentLogLibrary,
    logPanes,
    keywordInput,
    onChangeKeywordInput,
    doGetLogs,
    doGetHighCharts,
    onChangeLogsPageByUrl,
    onChangeLogPane,
    logsLoading,
    highChartLoading,
    doParseQuery,
  } = useModel('dataLogs');

  const oldPane = logPanes.find((item) => item.pane === currentLogLibrary) as PaneType;

  const doSearch = useDebounceFn(
    () => {
      onChangeLogsPageByUrl(FIRST_PAGE, PAGE_SIZE);
      doGetHighCharts({ page: FIRST_PAGE, pageSize: PAGE_SIZE });
      doGetLogs({ page: FIRST_PAGE, pageSize: PAGE_SIZE });
      doParseQuery();
    },
    { wait: DEBOUNCE_WAIT },
  );
  return (
    <div className={searchBarStyles.searchBarMain}>
      <Input
        allowClear
        placeholder="请输入查询 SQL 语句"
        className={searchBarStyles.inputBox}
        value={keywordInput}
        suffix={<SearchBarSuffixIcon />}
        onChange={(e) => {
          const keyword = e.target.value;
          onChangeKeywordInput(keyword);
          onChangeLogPane({ ...oldPane, keyword });
        }}
        onPressEnter={() => {
          doSearch.run();
        }}
      />
      <DarkTimeSelect />
      <Button
        loading={logsLoading || highChartLoading}
        onClick={() => {
          doSearch.run();
        }}
        className={searchBarStyles.searchBtn}
        type="primary"
      >
        查询
      </Button>
    </div>
  );
};

export default SearchBar;
