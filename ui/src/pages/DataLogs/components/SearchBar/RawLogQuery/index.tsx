import { Button, Tooltip } from "antd";
import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import SearchBarSuffixIcon from "@/pages/DataLogs/components/SearchBar/SearchBarSuffixIcon";
import { PaneType, QueryParams } from "@/models/datalogs/types";
import DarkTimeSelect from "@/pages/DataLogs/components/DateTimeSelected";
import IconFont from "@/components/IconFont";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { useDebounceFn } from "ahooks";
import { FIRST_PAGE, TimeRangeType } from "@/config/config";
import moment, { DurationInputArg1, DurationInputArg2 } from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";
import { useEffect, useMemo, useState } from "react";
import useUrlState from "@ahooksjs/use-url-state";
import UrlShareButton from "@/components/UrlShareButton";
import { cloneDeep } from "lodash";
import CodeMirrorSearch from "./CodeMirrorSearch";
import { CollectType } from "@/services/dataLogs";

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
    initValue,
    onChangeInitValue,
    analysisFieldTips,
    logQueryHistoricalList,
    onChangeLogQueryHistoricalList,
    onChangeAnalysisFieldTips,
    collectingHistorical,
    doGetLogFilterList,
    onChangeCollectingHistorical,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;
  const i18n = useIntl();

  const [queryKeyword, setQueryKeyword] = useState<string | undefined>(
    keywordInput
  );
  const [isDefault, setIsDefault] = useState<boolean>(true);

  // 输入框自动填充历史记录
  const [historicalRecord, setHistoricalRecord] = useState<string[]>([]);

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
              pane.logChart = { isNeedSort: false, logs: [], sortRule: ["*"] };
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
    { wait: 100 }
  );

  useEffect(() => {
    const data = {
      collectType: CollectType.query,
    };
    doGetLogFilterList.run(data).then((res: any) => {
      if (res.code != 0) return;
      onChangeCollectingHistorical(res.data);
    });
  }, []);

  useEffect(() => {
    onChangeKeywordInput(queryKeyword);
    onChangeCurrentLogPane({
      ...(oldPane as PaneType),
      keyword: queryKeyword,
    });
  }, [queryKeyword]);

  useEffect(() => {
    if (urlState?.mode != 1) {
      setQueryKeyword(keywordInput);
    }
  }, [keywordInput]);

  useEffect(() => {
    if (urlState?.mode == 1) {
      setQueryKeyword("");
    }
  }, [urlState?.mode]);

  useEffect(() => {
    currentLogLibrary &&
      setHistoricalRecord(logQueryHistoricalList[currentLogLibrary?.id] || []);
  }, [
    logQueryHistoricalList,
    currentLogLibrary && logQueryHistoricalList[currentLogLibrary?.id],
    currentLogLibrary?.id,
  ]);

  useEffect(() => {
    if (queryKeyword && isDefault) {
      onChangeInitValue(queryKeyword);
      setIsDefault(false);
    }
  }, [queryKeyword]);

  useEffect(() => {
    logs?.defaultFields && onChangeAnalysisFieldTips(logs.defaultFields);
  }, [logs?.defaultFields]);

  return (
    <>
      <div className={searchBarStyles.inputBox}>
        <CodeMirrorSearch
          title="logInput"
          value={initValue || ""}
          placeholder={i18n.formatMessage({
            id: "log.search.placeholder",
          })}
          onPressEnter={() => doSearchLog.run()}
          onChange={(value: string) => setQueryKeyword(value)}
          tables={analysisFieldTips}
          historicalRecord={historicalRecord}
          onChangeHistoricalRecord={onChangeLogQueryHistoricalList}
          currentTid={currentLogLibrary?.id as number}
          logQueryHistoricalList={logQueryHistoricalList}
          collectingHistorical={collectingHistorical}
        />
      </div>
      <SearchBarSuffixIcon />
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
