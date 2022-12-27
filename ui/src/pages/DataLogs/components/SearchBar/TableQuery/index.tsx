import { Button, Tooltip } from "antd";
import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import IconFont from "@/components/IconFont";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce, useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import { PaneType } from "@/models/datalogs/types";
import { LogsResponse } from "@/services/dataLogs";
import { format } from "sql-formatter";
import ExportExcelButton from "@/components/ExportExcelButton";
import useLocalStorages, { LocalModuleType } from "@/hooks/useLocalStorages";
import useUrlState from "@ahooksjs/use-url-state";
import UrlShareButton from "@/components/UrlShareButton";

import { UnControlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import "codemirror/lib/codemirror.js";
import "codemirror/addon/lint/lint.css";
import "codemirror/addon/fold/foldcode.js";
import "codemirror/addon/fold/foldgutter.js";
import "codemirror/addon/fold/brace-fold.js";
import "codemirror/addon/hint/javascript-hint.js";
import "codemirror/addon/lint/lint.js";
import "codemirror/addon/lint/json-lint.js";
import "codemirror/addon/lint/javascript-lint.js";
import "codemirror/addon/display/placeholder.js";
import "codemirror/mode/sql/sql.js";
import "codemirror/mode/javascript/javascript.js";
// 引入代码自动提示插件
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/hint/sql-hint";
import "codemirror/addon/hint/show-hint";

const TableQuery = () => {
  const i18n = useIntl();

  const {
    // currentDatabase,
    statisticalChartsHelper,
    currentLogLibrary,
    logPanesHelper,
    onChangeCurrentLogPane,
    logs,
    logExcelData,
  } = useModel("dataLogs");
  const { currentlyTableToIid } = useModel("instances");
  const { onSetLocalData } = useLocalStorages();
  const [urlState] = useUrlState();
  const { logPanes } = logPanesHelper;
  const {
    chartSql,
    onChangeChartSql,
    aggregationChartSql,
    onChangeAggregationChartSql,
    doGetStatisticalTable,
    isFormat,
    onChangeIsFormat,
  } = statisticalChartsHelper;
  const [sql, setSql] = useState<string | undefined>(chartSql);
  const [defaultSql, setDefaultSql] = useState<string | undefined>(chartSql);
  const formRefs: any = useRef(null);
  // 输入框自动填充关键词
  const [tables, setTables] = useState<any>({});

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
      doGetStatisticalTable
        .run(currentlyTableToIid, {
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
      // 初次格式化
      if (!isFormat && chartSql) {
        setSql(format(chartSql));
        onChangeIsFormat(true);
        setDefaultSql(format(chartSql));
      } else {
        setSql(chartSql);
      }
    }
  }, [chartSql]);

  useEffect(() => {
    // mode == 1为报警的聚合模式，此时直接拿url上的kw作为查询语句
    if (urlState?.mode == 1) {
      // 报警的聚合模式的初次
      if (chartSql == undefined) {
        onChangeAggregationChartSql(format(urlState?.kw));
        setSql(format(urlState.kw));
        doSearch.run();
        return;
      }
      if (!logs?.query) {
        setSql(aggregationChartSql);
      }
    }
  }, [urlState?.mode, urlState?.kw]);

  useEffect(() => {
    let arr: any = {};
    if (logs?.defaultFields && logs?.defaultFields.length > 0) {
      logs?.defaultFields.map((item: any) => {
        arr[item] = [];
      });
    }
    setTables(arr);
  }, [logs, logs?.defaultFields]);

  return (
    <>
      <div className={searchBarStyles.editor}>
        <CodeMirror
          className={searchBarStyles.editorsDom}
          ref={formRefs}
          onKeyPress={() => {
            // 按键的时候触发代码提示
            formRefs.current.editor.showHint();
          }}
          onChange={(CodeMirror: string, changeObj: any, value: string) => {
            changeLocalStorage(value);
            setSql(value);
            if (urlState?.mode == 1) {
              onChangeAggregationChartSql(value);
            }
          }}
          value={defaultSql}
          options={{
            // 显示行号
            lineNumbers: true,
            mode: {
              name: "text/x-mysql",
            },
            hintOptions: {
              // 自定义提示选项
              completeSingle: false, // 当匹配只有一项的时候是否自动补全
              // 自定义的提示库
              tables: tables,
            },
            autofocus: false,
            styleActiveLine: true,
            // 溢出滚动而非换行
            lineWrapping: true,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            indentUnit: 2,
            // 光标高度
            cursorHeight: 1,
            // tab缩进
            tabSize: 2,
            fixedGutter: true,
            coverGutterNextToScrollbar: true,
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
          />
        </Tooltip>
        <Tooltip
          title={i18n.formatMessage({
            id: "bigdata.components.FileTitle.formatting",
          })}
        >
          <Button
            loading={doGetStatisticalTable.loading}
            className={searchBarStyles.searchBtn}
            icon={<IconFont type="icon-formatting" />}
            onClick={() => {
              if (sql) {
                const formatSql = format(sql as string);
                setSql(formatSql);
                setDefaultSql(formatSql);
                changeLocalStorage(formatSql);
              }
            }}
          />
        </Tooltip>
        <UrlShareButton style={{ margin: "0 0 9px 8px" }} />
        <ExportExcelButton data={logExcelData} />
      </div>
    </>
  );
};
export default TableQuery;
