import { Button, Tooltip } from "antd";
import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import IconFont from "@/components/IconFont";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo, useState } from "react";
import { useDebounce, useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import { PaneType } from "@/models/datalogs/types";
import { LogsResponse } from "@/services/dataLogs";
import { format } from "sql-formatter";
import ExportExcelButton from "@/components/ExportExcelButton";
import MonacoEditor from "react-monaco-editor";
import useLocalStorages, { LocalModuleType } from "@/hooks/useLocalStorages";
import useUrlState from "@ahooksjs/use-url-state";

const TableQuery = () => {
  const i18n = useIntl();

  const {
    currentDatabase,
    statisticalChartsHelper,
    currentLogLibrary,
    logPanesHelper,
    onChangeCurrentLogPane,
    logs,
    logExcelData,
  } = useModel("dataLogs");
  const { onSetLocalData } = useLocalStorages();
  const [urlState] = useUrlState();
  const { logPanes } = logPanesHelper;
  const {
    chartSql,
    onChangeChartSql,
    aggregationChartSql,
    onChangeAggregationChartSql,
    doGetStatisticalTable,
  } = statisticalChartsHelper;
  const [sql, setSql] = useState<string | undefined>(chartSql);

  const debouncedSql = useDebounce(sql, { wait: DEBOUNCE_WAIT });

  const dataLogsQuerySql: any = useMemo(() => {
    if (!currentLogLibrary?.id) return {};
    return onSetLocalData(undefined, LocalModuleType.datalogsQuerySql);
  }, [currentLogLibrary?.id]);

  const tid = (currentLogLibrary && currentLogLibrary.id.toString()) || "0";

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const doSearch = useDebounceFn(
    () => {
      if (!currentDatabase) return;
      doGetStatisticalTable
        .run(currentDatabase.iid, {
          query: sql ?? "",
        })
        .then((res) => {
          if (res?.code !== 0) return;
          onChangeCurrentLogPane({
            ...(oldPane as PaneType),
            logChart: res.data,
          });
        });
    },
    { wait: DEBOUNCE_WAIT }
  );

  const changeLocalStorage = (value: string) => {
    tid && (dataLogsQuerySql[tid] = value);
    onSetLocalData(dataLogsQuerySql, LocalModuleType.datalogsQuerySql);
  };

  useEffect(() => {
    onChangeChartSql(debouncedSql);
    onChangeCurrentLogPane({
      ...(oldPane as PaneType),
      logs: { ...(oldPane?.logs as LogsResponse), query: debouncedSql ?? "" },
      querySql: debouncedSql ?? "",
    });
  }, [debouncedSql]);

  useEffect(() => {
    if (urlState?.mode != 1) {
      dataLogsQuerySql[tid] && setSql(dataLogsQuerySql[tid]);
    }
  }, [dataLogsQuerySql[tid]]);

  useEffect(() => {
    if (urlState?.mode != 1) {
      setSql(chartSql);
    }
  }, [chartSql]);

  useEffect(() => {
    // mode == 1为报警的聚合模式，此时直接拿url上的kw作为查询语句
    if (urlState?.mode == 1) {
      // 初次
      if (chartSql == undefined) {
        onChangeAggregationChartSql(urlState?.kw);
        setSql(urlState.kw);
        doSearch.run();
        return;
      }
      if (!logs?.query) {
        setSql(aggregationChartSql);
      }
    }
  }, [urlState?.mode, urlState?.kw]);

  return (
    <>
      <div className={searchBarStyles.editor}>
        <MonacoEditor
          height={"100%"}
          width={"100%"}
          language={"mysql"}
          theme="vs-white"
          options={{
            selectOnLineNumbers: true,
            automaticLayout: true,
            wordWrap: "on",
            wrappingStrategy: "simple",
            wordWrapBreakBeforeCharacters: ",",
            wordWrapBreakAfterCharacters: ",",
            disableLayerHinting: true,
            scrollBeyondLastLine: false,
            minimap: {
              enabled: true,
            },
          }}
          value={sql}
          onChange={(value) => {
            changeLocalStorage(value);
            setSql(value);
            if (urlState?.mode == 1) {
              onChangeAggregationChartSql(value);
            }
          }}
        />
      </div>
      <div className={searchBarStyles.btnList}>
        <Tooltip title={i18n.formatMessage({ id: "log.table.note" })}>
          <Button
            loading={doGetStatisticalTable.loading}
            className={searchBarStyles.searchBtn}
            type="primary"
            icon={<IconFont type={"icon-log-search"} />}
            onClick={() => {
              doSearch.run();
            }}
          >
            {i18n.formatMessage({ id: "search" })}
          </Button>
        </Tooltip>

        <Button
          loading={doGetStatisticalTable.loading}
          className={searchBarStyles.searchBtn}
          type="primary"
          onClick={() => {
            if (sql) {
              setSql(format(sql as string));
              changeLocalStorage(format(sql as string));
            }
          }}
        >
          {i18n.formatMessage({
            id: "bigdata.components.FileTitle.formatting",
          })}
        </Button>
        <ExportExcelButton data={logExcelData} />
      </div>
    </>
  );
};
export default TableQuery;
