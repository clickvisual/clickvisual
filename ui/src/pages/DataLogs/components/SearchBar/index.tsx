import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import { Button, Input } from "antd";
import { useIntl, useModel } from "umi";
import DarkTimeSelect from "@/pages/DataLogs/components/DateTimeSelected";
import { useDebounceFn } from "ahooks";
import SearchBarSuffixIcon from "@/pages/DataLogs/components/SearchBar/SearchBarSuffixIcon";
import { QueryParams } from "@/models/dataLogs";
import { DEBOUNCE_WAIT, FIRST_PAGE, TimeRangeType } from "@/config/config";
import moment from "moment";
import type { DurationInputArg2, DurationInputArg1 } from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";
import IconFont from "@/components/IconFont";
import { PaneType } from "@/models/datalogs/useLogPanes";
import { useMemo } from "react";

const SearchBar = () => {
  const {
    currentLogLibrary,
    logPanesHelper,
    keywordInput,
    onChangeKeywordInput,
    doGetLogsAndHighCharts,
    startDateTime,
    endDateTime,
    onChangeCurrentLogPane,
    logsLoading,
    highChartLoading,
    activeTabKey,
    currentRelativeAmount,
    currentRelativeUnit,
    doParseQuery,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const i18n = useIntl();

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const doSearch = useDebounceFn(
    () => {
      if (!currentLogLibrary) return;
      const params: QueryParams = {
        page: FIRST_PAGE,
      };
      if (activeTabKey === TimeRangeType.Relative) {
        const start = moment()
          .subtract(
            currentRelativeAmount as DurationInputArg1,
            currentRelativeUnit as DurationInputArg2
          )
          .unix();
        const end = currentTimeStamp();
        params.st = start;
        params.et = end;
      }
      if (activeTabKey === TimeRangeType.Custom) {
        params.st = startDateTime;
        params.et = endDateTime;
      }
      doGetLogsAndHighCharts(currentLogLibrary?.id, params).then((res) => {
        if (!res) return;
        const pane: PaneType = {
          ...(oldPane as PaneType),
          start: params?.st ?? oldPane?.start,
          end: params?.et ?? oldPane?.end,
          keyword: keywordInput,
          page: params.page,
          logs: res.logs,
          highCharts: res.highCharts,
        };
        onChangeCurrentLogPane(pane);
        doParseQuery();
      });
    },
    { wait: DEBOUNCE_WAIT }
  );
  return (
    <div className={searchBarStyles.searchBarMain}>
      <Input
        allowClear
        placeholder={`${i18n.formatMessage({ id: "log.search.placeholder" })}`}
        className={searchBarStyles.inputBox}
        value={keywordInput}
        suffix={<SearchBarSuffixIcon />}
        onChange={(e) => {
          const keyword = e.target.value;
          onChangeKeywordInput(keyword);
          onChangeCurrentLogPane({ ...(oldPane as PaneType), keyword });
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
        icon={<IconFont type={"icon-log-search"} />}
      >
        {i18n.formatMessage({ id: "search" })}
      </Button>
    </div>
  );
};

export default SearchBar;
