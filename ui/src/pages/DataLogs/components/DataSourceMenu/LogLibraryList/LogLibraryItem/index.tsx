import classNames from "classnames";
import logLibraryListStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/index.less";
import { Dropdown, Menu, message, Tooltip } from "antd";
import {
  ApartmentOutlined,
  CalendarOutlined,
  FileTextOutlined,
  FundOutlined,
  FundProjectionScreenOutlined,
  FundViewOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import IconFont from "@/components/IconFont";
import {
  ALARMRULES_PATH,
  FIFTEEN_TIME,
  FIRST_PAGE,
  GRAPHICS_PATH,
  LOGTOPOLOGY_PATH,
  MINUTES_UNIT_TIME,
  PAGE_SIZE,
} from "@/config/config";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import lodash from "lodash";
import moment from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";
import deletedModal from "@/components/DeletedModal";
import { IndexInfoType, TablesResponse } from "@/services/dataLogs";
import useTimeOptions from "@/pages/DataLogs/hooks/useTimeOptions";
import { DefaultPane } from "@/models/datalogs/useLogPanes";
import { RestUrlStates } from "@/pages/DataLogs/hooks/useLogUrlParams";
import useUrlState from "@ahooksjs/use-url-state";
import { PaneType } from "@/models/datalogs/types";
import { useEffect, useMemo, useRef } from "react";

interface logLibraryType extends TablesResponse {
  did: number;
  v3TableType: number;
  relTraceTableId: number;
}

type LogLibraryItemProps = {
  logLibrary: logLibraryType;
  onGetList: any;
};

const LogLibraryItem = (props: LogLibraryItemProps) => {
  const { logLibrary, onGetList } = props;
  const [, setUrlState] = useUrlState();
  const { resizeMenuWidth, rawLogsIndexeList } = useModel("dataLogs");
  const {
    doDeletedLogLibrary,
    doGetLogLibrary,
    onChangeLogLibrary,
    currentLogLibrary,
    logPanesHelper,
    resetCurrentHighChart,
    onChangeLogLibraryInfoDrawVisible,
    doGetLogsAndHighCharts,
    onChangeLogPane,
    onChangeCurrentLogPane,
    onChangeViewsVisibleDraw,
    resetLogs,
    resetLogPaneLogsAndHighCharts,
    onChangeIsModifyLog,
    onChangeCurrentEditLogLibrary,
    onChangeLastLoadingTid,
    doGetAnalysisField,
    onChangeRawLogsIndexeList,
    onChangeIsAssociatedLinkLogLibrary,
    onChangeLinkLinkLogLibrary,
  } = useModel("dataLogs");
  const { logPanes, paneKeys, addLogPane, removeLogPane } = logPanesHelper;
  const rawLogsIndexeListRef = useRef<IndexInfoType[] | undefined>(
    rawLogsIndexeList
  );

  useEffect(() => {
    rawLogsIndexeListRef.current = rawLogsIndexeList;
  }, [rawLogsIndexeList]);

  const i18n = useIntl();
  const { handleChangeRelativeAmountAndUnit } = useTimeOptions();

  const onChangePanes = () => {
    const currentPanes = lodash.cloneDeep(logPanes);
    const paneId = logLibrary.id.toString();
    const tabPane = currentPanes[paneId];
    if (!tabPane) {
      const pane: PaneType = {
        ...DefaultPane,
        pane: logLibrary.tableName,
        paneId,
        paneType: logLibrary.createType,
        desc: logLibrary.desc,
      };

      addLogPane(paneId, pane);
      doGetAnalysisField.run(parseInt(paneId)).then((res: any) => {
        if (res.code != 0) return;
        onChangeRawLogsIndexeList(res.data?.keys);
        let newPane = {
          ...pane,
          rawLogsIndexeList: res.data.keys,
        };
        onChangeCurrentLogPane(newPane);
        doGetLogsAndHighCharts(logLibrary.id, {
          reqParams: {
            st: moment().subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME).unix(),
            et: currentTimeStamp(),
            page: FIRST_PAGE,
            pageSize: PAGE_SIZE,
            kw: "",
          },
        })
          .then((res) => {
            if (!res) {
              resetLogPaneLogsAndHighCharts(newPane);
            } else {
              newPane.logs = res.logs;
              newPane.highCharts = res?.highCharts;
              newPane.logChart = { logs: [] };
              onChangeLogPane(newPane);
            }
          })
          .catch(() => resetLogPaneLogsAndHighCharts(newPane));
      });
    } else {
      onChangeLogPane(tabPane);
      handleChangeRelativeAmountAndUnit(tabPane);
    }
  };

  const getGoToAlarmRulesPagePathByid = async () => {
    const res = await doGetLogLibrary.run(logLibrary.id);
    return `${ALARMRULES_PATH}?iid=${res?.data.database.iid}&did=${res?.data.database.id}&tid=${logLibrary.id}`;
  };

  const getGoToTheLogTopology = async () => {
    const res = await doGetLogLibrary.run(logLibrary.id);
    return `${LOGTOPOLOGY_PATH}?iid=${res?.data.database.iid}&dName=${res?.data.database.name}&tName=${logLibrary.tableName}&navKey=realtime`;
  };

  const doDeleted = () => {
    const hideMessage = message.loading(
      {
        content: i18n.formatMessage(
          {
            id: "datasource.logLibrary.deleted.loading",
          },
          { logLibrary: logLibrary.tableName }
        ),
        key: "deletedTable",
      },
      0
    );
    doDeletedLogLibrary
      .run(logLibrary.id)
      .then((res) => {
        if (res?.code === 0) {
          const currentKey = logLibrary.id.toString();
          // 判断日志库是否打开
          message.success(
            {
              content: i18n.formatMessage({
                id: "datasource.logLibrary.deleted.success",
              }),
              key: "deletedTable",
            },
            3
          );
          onGetList();
          // 不在打开的日志库中
          if (!paneKeys.includes(currentKey)) return;

          // 日志库打开，当前选中日志库是需要删除的日志库
          const resultKeys = paneKeys.filter((key) => key !== currentKey);
          const len = resultKeys.length;
          // 删除日志库
          removeLogPane(currentKey);

          // 只打开了当前日志库
          if (len === 0) {
            resetLogs();
            onChangeLogLibrary(undefined);
            setUrlState(RestUrlStates);
          }
          // 如果还有其他日志库，则切换到第一条
          if (len > 0 && parseInt(currentKey) === currentLogLibrary?.id) {
            const currentPanes = lodash.cloneDeep(logPanes);
            const currentPane = currentPanes[resultKeys[0]];
            delete currentPanes[currentKey];
            handleChangeRelativeAmountAndUnit(currentPane);
            onChangeCurrentLogPane(currentPane, currentPanes);
            onChangeLogLibrary({
              id: parseInt(currentPane.paneId),
              tableName: currentPane.pane,
              createType: currentPane.paneType,
              desc: currentPane.desc,
            });
          }
        } else hideMessage();
      })
      .catch(() => hideMessage());
  };

  const items = [
    {
      label: i18n.formatMessage({
        id: "datasource.tooltip.icon.info",
      }),
      key: "log-details",
      onClick: () => {
        onChangeLogLibraryInfoDrawVisible(true);
      },
      icon: <FileTextOutlined />,
    },
    {
      label: i18n.formatMessage({ id: "datasource.tooltip.icon.edit" }),
      key: "log-edit",
      onClick: () => {
        onChangeCurrentEditLogLibrary(logLibrary);
        onChangeIsModifyLog(true);
      },
      icon: <FundProjectionScreenOutlined />,
    },
    {
      label: i18n.formatMessage({
        id: "datasource.tooltip.icon.alarmRuleList",
      }),
      key: "log-alarm",
      onClick: async () => {
        window.open(await getGoToAlarmRulesPagePathByid(), "_blank");
      },
      icon: <CalendarOutlined />,
    },
    {
      label: i18n.formatMessage({ id: "datasource.tooltip.icon.topology" }),
      key: "log-topology",
      onClick: async () => {
        window.open(await getGoToTheLogTopology(), "_blank");
      },
      icon: <ApartmentOutlined />,
    },
    {
      label: i18n.formatMessage({
        id: "datasource.tooltip.icon.linkDependency",
      }),
      key: "log-link-DAG",
      onClick: async () => {
        logLibrary?.id &&
          window.open(`${GRAPHICS_PATH}?tid=${logLibrary?.id}`, "_blank");
      },
      icon: <FundOutlined />,
    },
    {
      label: i18n.formatMessage({
        id: "datasource.tooltip.icon.view",
      }),
      key: "log-rules",
      onClick: async () => {
        onChangeViewsVisibleDraw(true);
      },
      icon: <FundViewOutlined />,
      disabled: logLibrary.createType === 1,
    },
    {
      label: i18n.formatMessage({ id: "datasource.tooltip.icon.link" }),
      key: "log-link",
      onClick: () => {
        onChangeIsAssociatedLinkLogLibrary(true);
        onChangeLinkLinkLogLibrary(logLibrary);
      },
      icon: <LinkOutlined />,
    },
    {
      label: (
        <span className={logLibraryListStyles.deletedSpan}>
          {i18n.formatMessage({
            id: "datasource.tooltip.icon.deleted",
          })}
        </span>
      ),
      key: "log-delete",
      onClick: () => {
        deletedModal({
          onOk: () => {
            doDeleted();
          },
          content: i18n.formatMessage(
            {
              id: "datasource.logLibrary.deleted.content",
            },
            { logLibrary: logLibrary.tableName }
          ),
        });
      },
      icon: <IconFont type={"icon-delete"} />,
    },
  ];

  const menu = useMemo(() => <Menu items={items} />, [items]);

  const tooltipTitle = useMemo(
    () => (
      <div>
        <div className={logLibraryListStyles.logTipTitle}>
          <span>
            {i18n.formatMessage({ id: "datasource.logLibrary.from.tableName" })}
            :&nbsp; {logLibrary.tableName}
          </span>
        </div>
        <div>
          <div className={logLibraryListStyles.logTipTitle}>
            {i18n.formatMessage({ id: "DescAsAlias" })}
            :&nbsp;{!logLibrary?.desc ? "" : logLibrary.desc}
          </div>
        </div>
        <div>
          <div className={logLibraryListStyles.logTipTitle}>
            {i18n.formatMessage({
              id: "log.editLogLibraryModal.label.isCreateCV.name",
            })}
            :&nbsp;
            {logLibrary.createType == 1
              ? i18n.formatMessage({ id: "alarm.rules.history.isPushed.false" })
              : i18n.formatMessage({ id: "alarm.rules.history.isPushed.true" })}
          </div>
        </div>
      </div>
    ),
    [logLibrary]
  );

  const logIcon = useMemo(() => {
    if (logLibrary.v3TableType == 1) {
      // link log
      return (
        <IconFont
          type="icon-link-table"
          style={{ marginRight: "4px", color: "#2fabee" }}
        />
      );
    }
    if (logLibrary.createType == 1) {
      return <IconFont type="icon-table" style={{ marginRight: "4px" }} />;
    }
    // cv log
    return <IconFont type="icon-active-table" style={{ marginRight: "4px" }} />;
  }, [logLibrary.createType, logLibrary.v3TableType]);

  return (
    <li
      className={classNames(logLibraryListStyles.tableTitle)}
      style={{ width: `${resizeMenuWidth - 80}px` }}
    >
      <Dropdown overlay={menu} trigger={["contextMenu"]}>
        <Tooltip
          title={tooltipTitle}
          placement="right"
          overlayClassName={logLibraryListStyles.logLibraryToolTip}
          overlayInnerStyle={{ width: 300 }}
        >
          <span
            onClick={() => {
              if (currentLogLibrary?.id === logLibrary.id) return;
              onChangeLastLoadingTid(logLibrary.id);
              onChangeLogLibrary(logLibrary);
              resetCurrentHighChart();
              onChangePanes();
            }}
            className={classNames(logLibraryListStyles.title)}
          >
            {logIcon}

            {logLibrary.tableName}
          </span>
        </Tooltip>
      </Dropdown>
    </li>
  );
};

export default LogLibraryItem;
