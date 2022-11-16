import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import styles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/index.less";
import { PaneType } from "@/models/datalogs/types";
import classNames from "classnames";
import { useEffect, useMemo } from "react";
import { Switch } from "antd";
import { FIRST_PAGE, LINKLOGS_PAGESIZE } from "@/config/config";

const FoldingExpansionSwitch = ({
  oldPane,
}: {
  oldPane: PaneType | undefined;
}) => {
  const i18n = useIntl();
  const {
    logPanesHelper,
    logState,
    onChangeLogState,
    currentLogLibrary,
    doGetLogsAndHighCharts,
    onChangeLogPane,
    resetLogPaneLogsAndHighCharts,
    linkLogs,
  } = useModel("dataLogs");
  const { updateLogPane, logPanes } = logPanesHelper;

  const handleChangeFoldingExpansionChecked = (
    flag: boolean,
    state: number
  ) => {
    if (!oldPane) return;
    updateLogPane(
      oldPane.paneId,
      {
        ...oldPane,
        foldingChecked: flag,
        logState: state,
        linkLogs: undefined,
      },
      logPanes
    );
  };

  const getList = () => {
    const params = {
      page: FIRST_PAGE,
      pageSize: LINKLOGS_PAGESIZE,
    };
    doGetLogsAndHighCharts(currentLogLibrary?.id as number, {
      isPaging: true,
      reqParams: params,
    })
      .then((res) => {
        if (!res) {
          resetLogPaneLogsAndHighCharts({
            ...(oldPane as PaneType),
          });
        } else {
          const pane: PaneType = {
            ...(oldPane as PaneType),
            linkLogs: res.logs,
            highCharts: res.highCharts,
            logChart: { logs: [], isNeedSort: false, sortRule: ["*"] },
            logState: 1,
          };
          onChangeLogPane(pane);
        }
      })
      .catch(() =>
        resetLogPaneLogsAndHighCharts({
          ...(oldPane as PaneType),
        })
      );
  };

  useEffect(() => {
    if (oldPane?.logs?.isTrace == 1) {
      onChangeLogState(oldPane?.logState || (oldPane?.foldingChecked ? 2 : 0));
      if (
        oldPane?.logState == 1 &&
        (!linkLogs?.logs || (linkLogs?.logs && linkLogs?.logs.length == 0))
      ) {
        getList();
      }
    }
  }, [oldPane?.logs?.isTrace]);

  const text = useMemo(() => {
    switch (logState) {
      case 0:
        return (
          <span className={styles.textSpan} style={{ textAlign: "left" }}>
            {i18n.formatMessage({ id: "systemSetting.role.collapseX.unfold" })}
          </span>
        );
      case 1:
        return (
          <span className={styles.textSpan} style={{ textAlign: "left" }}>
            {i18n.formatMessage({ id: "log.switch.link" })}
          </span>
        );
      case 2:
        return (
          <span className={styles.textSpan} style={{ textAlign: "left" }}>
            {i18n.formatMessage({ id: "log.switch.folding" })}
          </span>
        );

      default:
        return (
          <span className={styles.textSpan} style={{ textAlign: "left" }}>
            {i18n.formatMessage({ id: "log.switch.unknown" })}
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
                handleChangeFoldingExpansionChecked(false, 0);
              }}
            ></div>
            <div
              className={styles.jtogglerBtnWrapper}
              onClick={() => {
                onChangeLogState(1);
                if (!oldPane) return;
                updateLogPane(
                  oldPane.paneId,
                  { ...oldPane, logState: 1 },
                  logPanes
                );
                getList();
              }}
            ></div>
            <div
              className={styles.jtogglerBtnWrapper}
              onClick={() => {
                onChangeLogState(2);
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
