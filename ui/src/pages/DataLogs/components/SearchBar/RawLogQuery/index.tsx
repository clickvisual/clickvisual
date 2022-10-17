import { Button, Tooltip } from "antd";
import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import SearchBarSuffixIcon from "@/pages/DataLogs/components/SearchBar/SearchBarSuffixIcon";
import { PaneType, QueryParams } from "@/models/datalogs/types";
import DarkTimeSelect from "@/pages/DataLogs/components/DateTimeSelected";
import IconFont from "@/components/IconFont";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { useDebounce, useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT, FIRST_PAGE, TimeRangeType } from "@/config/config";
import moment, { DurationInputArg1, DurationInputArg2 } from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";
import { useEffect, useMemo, useState } from "react";
import useUrlState from "@ahooksjs/use-url-state";
import UrlShareButton from "@/components/UrlShareButton";
import { cloneDeep } from "lodash";
import CodeMirrorSearch from "./CodeMirrorSearch";
import { dataLogLocalaStorageType } from "@/models/dataLogs";
import useLocalStorages from "@/hooks/useLocalStorages";

const RawLogQuery = () => {
  const [urlState] = useUrlState();
  const {
    currentLogLibrary,
    logPanesHelper,
    keywordInput,
    onChangeKeywordInput,
    doGetLogsAndHighCharts,
    startDateTime,
    endDateTime,
    activeTimeOptionIndex,
    onChangeCurrentLogPane,
    logsLoading,
    highChartLoading,
    activeTabKey,
    currentRelativeAmount,
    currentRelativeUnit,
    doGetAnalysisField,
    logs,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const i18n = useIntl();

  const [queryKeyword, setQueryKeyword] = useState<string | undefined>(
    keywordInput
  );

  const { onSetLocalData } = useLocalStorages();
  const logQueryHistoricalList =
    onSetLocalData(undefined, dataLogLocalaStorageType.logQueryHistoricalList)
      ?.logQueryHistoricalList || [];
  // 输入框自动填充关键词
  const [tables, setTables] = useState<any>({});

  const debouncedQueryKeyword = useDebounce(queryKeyword, {
    wait: DEBOUNCE_WAIT,
  });

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const doSearchLog = useDebounceFn(
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
      const pane: PaneType = {
        ...(oldPane as PaneType),
        start: params?.st ?? oldPane?.start,
        end: params?.et ?? oldPane?.end,
        keyword: queryKeyword,
        page: params.page,
        activeIndex: activeTimeOptionIndex,
      };
      if (oldPane?.logState == 1 && oldPane?.linkLogs) {
        params.pageSize = 100;
      }
      onChangeCurrentLogPane(pane);
      doGetLogsAndHighCharts(currentLogLibrary?.id, { reqParams: params }).then(
        (res) => {
          if (res) {
            if (oldPane?.logState == 1 && oldPane?.linkLogs) {
              let cloneLogs = cloneDeep(res.logs);
              cloneLogs.logs = cloneLogs.logs.slice(0, 9);
              pane.linkLogs = res.logs;
              pane.logs = cloneLogs;
            } else {
              pane.logs = res.logs;
            }

            pane.highCharts = res.highCharts;
            if (res.logs.query !== pane.querySql) {
              pane.logChart = { logs: [] };
            }
            doGetAnalysisField.run(currentLogLibrary?.id).then((res: any) => {
              if (res.code != 0) return;
              (pane.rawLogsIndexeList = res.data.keys),
                onChangeCurrentLogPane(pane);
            });
          }
        }
      );
    },
    { wait: DEBOUNCE_WAIT }
  );

  useEffect(() => {
    onChangeKeywordInput(debouncedQueryKeyword);
    onChangeCurrentLogPane({
      ...(oldPane as PaneType),
      keyword: debouncedQueryKeyword,
    });
  }, [debouncedQueryKeyword]);

  useEffect(() => {
    if (urlState?.mode != 1) {
      setQueryKeyword(keywordInput);
    }
  }, [keywordInput]);

  useEffect(() => {
    if (urlState?.mode == 1) {
      // onChangeKeywordInput("");
      setQueryKeyword("");
    }
  }, [urlState?.mode]);

  useEffect(() => {
    let arr: any = {};
    if (logs?.defaultFields && logs?.defaultFields.length > 0) {
      logs?.defaultFields.map((item: any) => {
        arr[item] = [];
      });
    }
    if (logQueryHistoricalList.length > 0) {
      logQueryHistoricalList.map((item: any) => {
        arr[item] = [];
      });
    }
    setTables(arr);
  }, [logs, logs?.defaultFields]);

  return (
    <>
      <div className={searchBarStyles.inputBox}>
        <CodeMirrorSearch
          title="logInput"
          value={queryKeyword || ""}
          placeholder={i18n.formatMessage({
            id: "log.search.placeholder",
          })}
          onPressEnter={() => {
            doSearchLog.run();
          }}
          onChange={(value: string) => setQueryKeyword(value)}
          tables={tables}
          onChangeTables={setTables}
        />
      </div>
      <SearchBarSuffixIcon />

      {/* <Input
        allowClear
        placeholder={`${i18n.formatMessage({
          id: "log.search.placeholder",
        })}`}
        className={searchBarStyles.inputBox}
        addonBefore={<span style={{ color: "#bbb" }}>WHERE</span>}
        value={queryKeyword}
        suffix={<SearchBarSuffixIcon />}
        onChange={(e) => setQueryKeyword(e.target.value)}
        onPressEnter={() => {
          doSearchLog.run();
        }}
      /> */}
      <DarkTimeSelect />
      <UrlShareButton style={{ marginRight: "8px" }} />
      <Tooltip title={i18n.formatMessage({ id: "search" })}>
        <Button
          loading={logsLoading || highChartLoading}
          onClick={() => {
            doSearchLog.run();
          }}
          className={searchBarStyles.searchBtn}
          type="primary"
          icon={<IconFont type={"icon-log-search"} />}
        />
      </Tooltip>
    </>
  );
};

export default RawLogQuery;
