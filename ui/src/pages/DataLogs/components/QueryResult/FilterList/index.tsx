import styles from "./index.less";
import { CollectType, LogFilterType } from "@/services/dataLogs";
import { Dropdown, Menu, message, Tag } from "antd";
import { useEffect } from "react";
import { useIntl, useModel } from "umi";
import classNames from "classnames";
import {
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  VerticalAlignTopOutlined,
} from "@ant-design/icons";
import { LocalModuleType } from "@/hooks/useLocalStorages";

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
      doGetLogsAndHighCharts(tid);
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
    return (
      <Menu style={{ width: "200px" }}>
        <Menu.Item
          key="allApps"
          icon={<VerticalAlignTopOutlined />}
          onClick={() => {
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
              doGetLogsAndHighCharts(tid);
            });
          }}
        >
          {item.collectType == 2
            ? i18n.formatMessage({ id: "log.filter.menu.global" })
            : i18n.formatMessage({ id: "log.filter.menu.unpin" })}
        </Menu.Item>
        <Menu.Item
          key="eidt"
          icon={<EditOutlined />}
          onClick={() => {
            onChangeVisibleLogFilter(true);
            onChangeEditLogFilterInfo(item);
          }}
        >
          {i18n.formatMessage({ id: "log.filter.edit.title" })}
        </Menu.Item>

        <Menu.Item
          key="isEnable"
          icon={filterIndex != -1 ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          onClick={() => {
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
            console.log(filterDisableIds, tid, "item");
            doGetLogsAndHighCharts(tid);
          }}
        >
          {/* {item.collectType == 2 ? "temporarily disable" : "re - enable"} */}
          {filterIndex != -1 ? "重新启用" : "暂时禁用"}
        </Menu.Item>

        <Menu.Item
          key="delete"
          icon={<DeleteOutlined />}
          onClick={(e: any) => {
            handleDeleteLogFilter(item.id, e);
          }}
        >
          {i18n.formatMessage({ id: "delete" })}
        </Menu.Item>
      </Menu>
    );
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
              overlay={() => menu(item, filterDisableIds, oldIds, filterIndex)}
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
