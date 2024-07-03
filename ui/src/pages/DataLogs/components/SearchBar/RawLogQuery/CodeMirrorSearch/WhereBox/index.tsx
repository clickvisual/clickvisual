import { CollectType } from "@/services/dataLogs";
import {
  BarsOutlined,
  CloseOutlined,
  PlusCircleFilled,
} from "@ant-design/icons";
import { Button, List, message, Popover } from "antd";
import { useState } from "react";
import { useIntl, useModel } from "umi";
import styles from "./index.less";

const WhereBox = ({
  collectingHistorical,
  onChangeIsDefault,
  onChange,
  onPressEnter,
}: {
  collectingHistorical: any[];
  onChangeIsDefault: (flag: boolean) => void;
  onChange: (str: string) => void;
  onPressEnter: () => void;
}) => {
  const i18n = useIntl();
  const [isCollectionPopover, setIsCollectionPopover] =
    useState<boolean>(false);

  const {
    onChangeVisibleLogFilter,
    isShare,
    doDeleteLogFilter,
    doGetLogFilterList,
    onChangeCollectingHistorical,
    logsLoading,
  } = useModel("dataLogs");

  /**
   * 删除收藏历史
   */
  const handleDeletingCollectionHistory = (id: number) => {
    id &&
      doDeleteLogFilter.run(id).then((res: any) => {
        if (res.code != 0) {
          message.error(res.msg);
          return;
        }
        message.success(i18n.formatMessage({ id: "success" }));
        const data = {
          collectType: CollectType.query,
        };
        doGetLogFilterList.run(data).then((res: any) => {
          if (res.code != 0) return;
          onChangeCollectingHistorical(res.data);
        });
      });
  };

  const title = (
    <div className={styles.title}>
      <span className={styles.spanText}>
        {i18n.formatMessage({
          id: "log.search.codeHinting.collectHistory",
        })}
      </span>
      <CloseOutlined
        onClick={() => {
          setIsCollectionPopover(false);
        }}
      />
    </div>
  );

  const listItem = (item: any) => {
    return (
      <List.Item>
        <div className={styles.listItem}>
          <div className={styles.text}>{item.alias}</div>
          <div className={styles.btnList}>
            <Button
              type="link"
              disabled={logsLoading || doGetLogFilterList.loading}
              onClick={() => {
                onChangeIsDefault(true);
                onChange(item.statement);
                setIsCollectionPopover(false);
                onPressEnter();
              }}
            >
              {i18n.formatMessage({
                id: "log.search.quickSearch.fill",
              })}
            </Button>
            <Button
              type="link"
              disabled={logsLoading || doGetLogFilterList.loading}
              onClick={() => {
                handleDeletingCollectionHistory(item.id);
              }}
            >
              {i18n.formatMessage({ id: "delete" })}
            </Button>
          </div>
        </div>
      </List.Item>
    );
  };

  return (
    <span className={styles.whereBox}>
      <Popover
        placement="bottomLeft"
        title={title}
        open={isCollectionPopover}
        content={
          <List
            style={{ maxHeight: "calc(100vh - 250px)", overflow: "auto" }}
            bordered
            dataSource={collectingHistorical}
            size="small"
            renderItem={(item) => listItem(item)}
          />
        }
        trigger="click"
      >
        <span
          className={styles.btn}
          onClick={() => {
            !logsLoading && setIsCollectionPopover(true);
          }}
        >
          <BarsOutlined disabled={logsLoading || doGetLogFilterList.loading} />
        </span>
      </Popover>
      <Button
        type="link"
        disabled={isShare}
        className={styles.btn}
        onClick={() => {
          onChangeVisibleLogFilter(true);
        }}
        icon={<PlusCircleFilled />}
      ></Button>
    </span>
  );
};
export default WhereBox;
