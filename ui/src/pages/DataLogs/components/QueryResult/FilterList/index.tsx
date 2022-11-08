import styles from "./index.less";
import { CollectType, LogFilterType } from "@/services/dataLogs";
import { Dropdown, Menu, message, Tag } from "antd";
import { useEffect } from "react";
import { useIntl, useModel } from "umi";
import classNames from "classnames";
import { cloneDeep } from "lodash";
import {
  DeleteOutlined,
  EditOutlined,
  VerticalAlignTopOutlined,
} from "@ant-design/icons";

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
      getList();
    });
  };

  useEffect(() => {
    getList();
  }, []);

  const menu = (item: LogFilterType) => {
    return (
      <Menu style={{ width: "200px" }}>
        <Menu.Item
          key="allApps"
          icon={<VerticalAlignTopOutlined />}
          onClick={() => {
            const isGlobal = item.collectType == 4;
            const data = cloneDeep(item);
            if (isGlobal) {
              data.collectType = 2;
              data.tableId = tid;
            } else {
              data.collectType = 4;
              delete data.tableId;
            }
            doEditLogFilter.run(data.id, data).then((res: any) => {
              if (res.code != 0) return;
              getList();
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
          return (
            <Dropdown
              overlay={() => menu(item)}
              placement="bottomLeft"
              trigger={["click"]}
              key={item.id}
            >
              <Tag closable onClose={(e) => handleDeleteLogFilter(item.id, e)}>
                <span
                  className={classNames([
                    styles.name,
                    item.collectType == 4 ? styles.global : "",
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
