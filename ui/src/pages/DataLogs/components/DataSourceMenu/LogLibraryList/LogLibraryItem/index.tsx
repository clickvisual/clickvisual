import classNames from "classnames";
import logLibraryListStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/index.less";
import { message, Tooltip } from "antd";
import { FileTextOutlined, FundViewOutlined } from "@ant-design/icons";
import IconFont from "@/components/IconFont";
import { PaneType, QueryParams } from "@/models/dataLogs";
import {
  ACTIVE_TIME_INDEX,
  FIFTEEN_TIME,
  FIRST_PAGE,
  MINUTES_UNIT_TIME,
  PAGE_SIZE,
  TimeRangeType,
} from "@/config/config";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import lodash from "lodash";
import moment from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";
import { useState } from "react";
import DeletedModal from "@/components/DeletedModal";
import { TablesResponse } from "@/services/dataLogs";

const defaultPane: PaneType = {
  pane: "",
  paneId: 0,
  start: moment().subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME).unix(),
  end: currentTimeStamp(),
  page: FIRST_PAGE,
  pageSize: PAGE_SIZE,
  keyword: undefined,
  activeIndex: ACTIVE_TIME_INDEX,
  activeTabKey: TimeRangeType.Relative,
};

type LogLibraryItemProps = {
  logLibrary: TablesResponse;
  onChange: (logLibrary: TablesResponse) => void;
};

const LogLibraryItem = (props: LogLibraryItemProps) => {
  const { onChange, logLibrary } = props;
  const {
    logPanes,
    onChangeLogPanes,
    onChangeLogLibrary,
    setChangeTabPane,
    currentLogLibrary,
    currentDatabase,
    doGetLogs,
    doGetHighCharts,
    doParseQuery,
    resetLogs,
    resetCurrentHighChart,
    onChangeActiveTabKey,
    onChangeActiveTimeOptionIndex,
    onChangeLogLibraryInfoDrawVisible,
    doDeletedLogLibrary,
    doGetLogLibraryList,
    onChangeCurrentLogPane,
    onChangeViewsVisibleDraw,
  } = useModel("dataLogs");
  const [mouseEnter, setMouseEnter] = useState<boolean>(false);

  const i18n = useIntl();

  const onChangePanes = () => {
    const currentPanes = lodash.cloneDeep(logPanes);
    const tabPane = currentPanes.find((item) => item.paneId === logLibrary.id);
    let queryParam: undefined | QueryParams;
    if (tabPane) {
      setChangeTabPane(tabPane);
      queryParam = {
        page: tabPane.page,
        pageSize: tabPane.pageSize,
        st: tabPane.start,
        et: tabPane.end,
        kw: tabPane.keyword,
      };
    } else {
      resetLogs();
      queryParam = {
        ...defaultPane,
        st: defaultPane.start,
        et: defaultPane.end,
      };
      currentPanes.push({
        ...defaultPane,
        pane: logLibrary.tableName,
        paneId: logLibrary.id,
      });
    }
    onChangeActiveTabKey(tabPane?.activeTabKey || TimeRangeType.Relative);
    onChangeActiveTimeOptionIndex(tabPane?.activeIndex || ACTIVE_TIME_INDEX);
    onChangeLogPanes(currentPanes);
    doGetLogs(queryParam);
    doGetHighCharts(queryParam);
    doParseQuery(queryParam?.kw);
  };

  const doDeleted = () => {
    if (!currentDatabase) return;
    const hideMessage = message.loading({
      content: i18n.formatMessage(
        {
          id: "datasource.logLibrary.deleted.loading",
        },
        { logLibrary: logLibrary.tableName }
      ),
      key: "deletedTable",
    });
    doDeletedLogLibrary
      .run(logLibrary.id)
      .then((res) => {
        if (res?.code === 0) {
          if (logLibrary === currentLogLibrary) {
            resetLogs();
            resetCurrentHighChart();
            const newPanes = logPanes.filter(
              (item) => item.paneId !== currentLogLibrary.id
            );
            onChangeLogPanes(newPanes);
            if (newPanes.length > 0) {
              onChangeCurrentLogPane(newPanes[0]);
              onChangeLogLibrary({
                id: newPanes[0].paneId,
                tableName: newPanes[0].pane,
              });
            }
          }
          message.success({
            content: i18n.formatMessage({
              id: "datasource.logLibrary.deleted.success",
            }),
            key: "deletedTable",
          });
          doGetLogLibraryList();
        } else hideMessage();
      })
      .catch(() => hideMessage());
  };
  return (
    <li
      className={classNames(
        currentLogLibrary?.id === logLibrary.id &&
          logLibraryListStyles.activeLogLibrary,
        mouseEnter && logLibraryListStyles.LogLibraryHover
      )}
    >
      <Tooltip title={logLibrary.tableName}>
        <span
          onClick={() => {
            if (currentLogLibrary?.id === logLibrary.id) return;
            onChangeLogLibrary(logLibrary);
            resetCurrentHighChart();
            onChangePanes();
          }}
          onMouseEnter={() => setMouseEnter(true)}
          onMouseLeave={() => setMouseEnter(false)}
          className={classNames(logLibraryListStyles.title)}
        >
          {logLibrary.tableName}
        </span>
      </Tooltip>
      <Tooltip
        title={i18n.formatMessage({
          id: "datasource.tooltip.icon.info",
        })}
      >
        <FileTextOutlined
          onClick={() => {
            onChange(logLibrary);
            onChangeLogLibraryInfoDrawVisible(true);
          }}
          className={classNames(logLibraryListStyles.icon)}
        />
      </Tooltip>
      <Tooltip
        title={i18n.formatMessage({
          id: "datasource.tooltip.icon.view",
        })}
      >
        <FundViewOutlined
          onClick={() => {
            onChange(logLibrary);
            onChangeViewsVisibleDraw(true);
          }}
          className={classNames(logLibraryListStyles.icon)}
        />
      </Tooltip>
      <Tooltip
        title={i18n.formatMessage({
          id: "datasource.tooltip.icon.deleted",
        })}
      >
        <IconFont
          onClick={() => {
            DeletedModal({
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
          }}
          className={classNames(logLibraryListStyles.icon)}
          type={
            currentLogLibrary?.id === logLibrary.id
              ? "icon-log-delete"
              : "icon-delete"
          }
        />
      </Tooltip>
    </li>
  );
};

export default LogLibraryItem;
