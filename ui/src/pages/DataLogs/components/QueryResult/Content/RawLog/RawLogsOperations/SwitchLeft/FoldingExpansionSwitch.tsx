import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import styles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/index.less";
import { PaneType } from "@/models/datalogs/types";
import classNames from "classnames";
import { useEffect, useMemo } from "react";
import { Switch } from "antd";
import { FIRST_PAGE } from "@/config/config";

const FoldingExpansionSwitch = ({
  oldPane,
}: {
  oldPane: PaneType | undefined;
}) => {
  const i18n = useIntl();
  const {
    logPanesHelper,
    onChangeIsTrace,
    logState,
    onChangeLogState,
    currentLogLibrary,
    doGetLogsAndHighCharts,
    onChangeLogPane,
    resetLogPaneLogsAndHighCharts,
  } = useModel("dataLogs");
  const { updateLogPane, logPanes } = logPanesHelper;

  const handleChangeFoldingExpansionChecked = (
    flag: boolean,
    state: number
  ) => {
    if (!oldPane) return;
    if (state != 1 && flag != oldPane.foldingChecked) {
      updateLogPane(
        oldPane.paneId,
        { ...oldPane, foldingChecked: flag, isTrace: 0 },
        logPanes
      );
    }
  };

  const getList = () => {
    const params = {
      page: FIRST_PAGE,
      pageSize: 100,
    };
    doGetLogsAndHighCharts(currentLogLibrary?.id as number, {
      isPaging: true,
      reqParams: params,
    })
      .then((res) => {
        if (!res) {
          resetLogPaneLogsAndHighCharts({
            ...(oldPane as PaneType),
            page: FIRST_PAGE,
            pageSize: 100,
          });
        } else {
          const pane: PaneType = {
            ...(oldPane as PaneType),
            page: FIRST_PAGE,
            pageSize: 100,
            logs: res.logs,
            highCharts: res.highCharts,
            logChart: { logs: [] },
          };
          onChangeLogPane(pane);
        }
      })
      .catch(() =>
        resetLogPaneLogsAndHighCharts({
          ...(oldPane as PaneType),
          page: FIRST_PAGE,
          pageSize: 100,
        })
      );
  };

  useEffect(() => {
    if (oldPane?.logs?.isTrace == 1 && oldPane?.foldingChecked) {
      onChangeLogState(2);
    }
  }, [oldPane?.foldingChecked, oldPane?.logs?.isTrace]);

  const text = useMemo(() => {
    switch (logState) {
      case 0:
        return (
          <span className={styles.textSpan} style={{ textAlign: "left" }}>
            展开
          </span>
        );
      case 1:
        return (
          <span className={styles.textSpan} style={{ textAlign: "left" }}>
            链路
          </span>
        );

      default:
        return (
          <span className={styles.textSpan} style={{ textAlign: "left" }}>
            折叠
          </span>
        );
    }
  }, [logState]);

  return (
    <>
      {oldPane?.logs?.isTrace ? (
        <div className={styles.flexBox}>
          <div
            className={classNames([
              styles.FoldingExpansionSwitch,
              logState == 2 ? styles.themeColor : "",
              logState == 1 ? styles.bg_blue : "",
            ])}
          >
            <div
              className={styles.jtogglerBtnWrapper}
              onClick={() => {
                onChangeLogState(0);
                onChangeIsTrace(0);
                handleChangeFoldingExpansionChecked(false, 0);
              }}
            ></div>
            <div
              className={styles.jtogglerBtnWrapper}
              onClick={() => {
                onChangeLogState(1);
                onChangeIsTrace(1);
                if (!oldPane) return;
                updateLogPane(
                  oldPane.paneId,
                  { ...oldPane, isTrace: 1 },
                  logPanes
                );
                if (oldPane?.pageSize && oldPane.pageSize < 100) {
                  getList();
                }
              }}
            ></div>
            <div
              className={styles.jtogglerBtnWrapper}
              onClick={() => {
                onChangeLogState(2);
                onChangeIsTrace(0);
                handleChangeFoldingExpansionChecked(true, 2);
              }}
            ></div>
            <div
              className={classNames([styles.jtogglerHandle])}
              style={{ left: 2 + logState * 13 + "px" }}
            />
          </div>
          <span className={styles.textSpan} style={{ textAlign: "left" }}>
            {text}
          </span>
        </div>
      ) : (
        <>
          <Switch
            checked={oldPane?.foldingChecked ?? true}
            onChange={() => {
              if (!oldPane) return;
              updateLogPane(
                oldPane.paneId,
                { ...oldPane, foldingChecked: !oldPane?.foldingChecked },
                logPanes
              );
            }}
            size={"small"}
          />

          <span
            className={classNames([styles.textSpan, styles.title])}
            onClick={() => {
              if (!oldPane) return;
              updateLogPane(
                oldPane.paneId,
                { ...oldPane, foldingChecked: !oldPane?.foldingChecked },
                logPanes
              );
            }}
          >
            {i18n.formatMessage({
              id: "log.switch.unfold",
            })}
          </span>
        </>
      )}
    </>
  );
};

export default FoldingExpansionSwitch;
