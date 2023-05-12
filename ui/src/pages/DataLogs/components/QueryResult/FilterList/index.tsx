import { LocalModuleType } from "@/hooks/useLocalStorages";
import { CollectType, LogFilterType } from "@/services/dataLogs";
import {
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  VerticalAlignTopOutlined,
} from "@ant-design/icons";
import { Dropdown, message, Tag } from "antd";
import classNames from "classnames";
import { useEffect } from "react";
import { useIntl, useModel } from "umi";
import styles from "./index.less";

const FilterList = ({ tid }: { tid: number }) => {
  const i18n = useIntl();
  const {
    doGetLogFilterList,
    doDeleteLogFilter,
    onChangeLogFilterList,
    logFilterList,
    onChangeVisibleLogFilter,
    onChangeEditLogFilterInfo,
    doEditLogFilter,
    doGetLogsAndHighCharts,
    onChangeCurrentLogPane,
    logPanesHelper,
  } = useModel("dataLogs");

  const getList = () => {
    const data = {
      tableId: tid,
      collectType: CollectType.allFilter,
    };
    doGetLogFilterList.run(data).then((res: any) => {
      if (res.code != 0) return;
      onChangeLogFilterList(res.data);
    });
  };

  const handleDeleteLogFilter = (id: number, e: any) => {
    doDeleteLogFilter.run(id).then((res: any) => {
      if (res.code != 0) {
        message.error(res.msg);
        e.preventDefault();
        return;
      }
      message.success("success");
      // 以下函数会刷新filterList
      doGetLogsAndHighCharts(tid).then((data: any) => {
        const { logs } = data;
        const pane = logPanesHelper.logPanes[tid];
        onChangeCurrentLogPane({
          ...pane,
          logs: logs,
        });
      });
    });
  };

  useEffect(() => {
    getList();
  }, []);

  const menu = (
    item: LogFilterType,
    filterDisableIds: any,
    oldIds: any[],
    filterIndex: number
  ) => {
    return [
      {
        key: "allApps",
        icon: <VerticalAlignTopOutlined />,
        onClick: () => {
          const isGlobal = item.collectType == 4;
          const data: any = {
            id: item.id,
          };
          if (isGlobal) {
            data.collectType = 2;
            data.tableId = tid;
          } else {
            data.collectType = 4;
            delete data.tableId;
          }
          doEditLogFilter.run(data.id, data).then((res: any) => {
            if (res.code != 0) return;
            // 以下函数会刷新filterList
            doGetLogsAndHighCharts(tid).then((data: any) => {
              const { logs } = data;
              const pane = logPanesHelper.logPanes[tid];
              onChangeCurrentLogPane({
                ...pane,
                logs: logs,
              });
            });
          });
        },
        label:
          item.collectType == 2
            ? i18n.formatMessage({ id: "log.filter.menu.global" })
            : i18n.formatMessage({ id: "log.filter.menu.unpin" }),
      },
      {
        key: "eidt",
        icon: <EditOutlined />,
        onClick: () => {
          onChangeVisibleLogFilter(true);
          onChangeEditLogFilterInfo(item);
        },
        label: i18n.formatMessage({ id: "log.filter.edit.title" }),
      },
      {
        key: "isEnable",
        icon: filterIndex != -1 ? <EyeOutlined /> : <EyeInvisibleOutlined />,
        onClick: () => {
          if (filterIndex != -1) {
            oldIds.splice(filterIndex, 1);
          } else {
            oldIds.push(item.id);
          }
          const data = {
            ...filterDisableIds,
            [`${tid}`]: oldIds,
          };
          localStorage.setItem(
            LocalModuleType.datalogsFilterDisableIds,
            JSON.stringify(data)
          );
          doGetLogsAndHighCharts(tid).then((data: any) => {
            const { logs } = data;
            const pane = logPanesHelper.logPanes[tid];
            onChangeCurrentLogPane({
              ...pane,
              logs: logs,
            });
          });
        },
        label:
          filterIndex != -1
            ? i18n.formatMessage({ id: "log.filter.menu.enable" })
            : i18n.formatMessage({ id: "log.filter.menu.disable" }),
      },
      {
        key: "delete",
        icon: <DeleteOutlined />,
        onClick: (e: any) => {
          handleDeleteLogFilter(item.id, e);
        },
        label: i18n.formatMessage({ id: "delete" }),
      },
    ];
  };

  return (
    <div
      className={classNames([
        styles.FilterList,
        logFilterList?.length == 0 && styles.none,
      ])}
    >
      <div className={styles.overflowBox}>
        {logFilterList.map((item: LogFilterType) => {
          const filterDisableIds =
            JSON.parse(
              localStorage.getItem(LocalModuleType.datalogsFilterDisableIds) ||
                "{}"
            ) || {};
          const oldIds: any[] =
            filterDisableIds && filterDisableIds[tid]
              ? filterDisableIds[tid]
              : [];
          const filterIndex = oldIds.indexOf(item.id);
          return (
            <Dropdown
              menu={{
                items: menu(item, filterDisableIds, oldIds, filterIndex),
                style: { width: "200px" },
              }}
              placement="bottomLeft"
              trigger={["click"]}
              key={item.id}
            >
              <Tag
                color={filterIndex == -1 ? "processing" : "default"}
                closable
                onClose={(e) => handleDeleteLogFilter(item.id, e)}
              >
                <span
                  className={classNames([
                    styles.name,
                    item.collectType == 4 ? styles.global : "",
                    filterIndex != -1 ? styles.ignore : "",
                  ])}
                >
                  {item.alias || item.statement.replace(/'/g, "")}
                </span>
              </Tag>
            </Dropdown>
          );
        })}
      </div>
    </div>
  );
};
export default FilterList;
