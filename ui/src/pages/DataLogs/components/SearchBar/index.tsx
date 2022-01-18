import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import { Button, Input } from "antd";
import { useModel } from "umi";
import DarkTimeSelect from "@/pages/DataLogs/components/DateTimeSelected";
import { useDebounceFn } from "ahooks";
import SearchBarSuffixIcon from "@/pages/DataLogs/components/SearchBar/SearchBarSuffixIcon";
import { PaneType, QueryParams } from "@/models/dataLogs";
import {
  DEBOUNCE_WAIT,
  FIRST_PAGE,
  PAGE_SIZE,
  TimeRangeType,
} from "@/config/config";
import moment from "moment";
import type { DurationInputArg2, DurationInputArg1 } from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";

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
    onChangeStartDateTime,
    onChangeEndDateTime,
    logsLoading,
    highChartLoading,
    activeTabKey,
    currentRelativeAmount,
    currentRelativeUnit,
    doParseQuery,
  } = useModel("dataLogs");

  const oldPane = logPanes.find(
    (item) => item.pane === currentLogLibrary
  ) as PaneType;

  const doSearch = useDebounceFn(
    () => {
      const params: QueryParams = { page: FIRST_PAGE, pageSize: PAGE_SIZE };
      if (activeTabKey === TimeRangeType.Relative) {
        const start = moment()
          .subtract(
            currentRelativeAmount as DurationInputArg1,
            currentRelativeUnit as DurationInputArg2
          )
          .unix();
        const end = currentTimeStamp();
        onChangeStartDateTime(start);
        onChangeEndDateTime(end);
        params.st = start;
        params.et = end;
      }
      onChangeLogsPageByUrl(FIRST_PAGE, PAGE_SIZE);
      doGetHighCharts(params);
      doGetLogs(params);
      doParseQuery();
    },
    { wait: DEBOUNCE_WAIT }
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
