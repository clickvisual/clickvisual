import { CopyOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import { Button, message, Tooltip } from "antd";
import classNames from "classnames";
import { useMemo, useState } from "react";
import copy from "copy-to-clipboard";
import styles from "./index.less";
import { useModel } from "umi";
import { handleValueDisplayLogic } from "@/utils/linkLog";

const SharePath = [
  process.env.PUBLIC_PATH + "share",
  process.env.PUBLIC_PATH + "share/",
];

const ContentItem = ({
  title,
  list,
  isTips = false,
}: {
  title: any;
  list: any[];
  isTips?: boolean;
}) => {
  const [isTagsHidden, setIsTagsHidden] = useState<boolean>(true);
  const { foldingState, resizeMenuWidth } = useModel("dataLogs");

  const isShare = useMemo(
    () => SharePath.includes(document.location.pathname),
    [document.location.pathname]
  );

  const titleWidth = useMemo(() => {
    return isTips
      ? "972px"
      : `calc(85vw - ${
          !isShare && !foldingState ? resizeMenuWidth + 4 : 0
        }px - 300px - 15px ${isShare ? "+ 48px" : ""})`;
  }, [resizeMenuWidth, foldingState, isTips]);

  return (
    <>
      <div
        className={styles.progressContentItemTitle}
        style={{
          width: titleWidth,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsTagsHidden(!isTagsHidden);
        }}
      >
        {isTagsHidden ? <RightOutlined /> : <DownOutlined />}
        {title}
        {isTagsHidden ? ": " : ""}
        <ul
          className={classNames([
            styles.titleSpan,
            !isTagsHidden && styles.none,
          ])}
        >
          {list &&
            list.length > 0 &&
            list.map((item: any, index: number) => {
              return (
                <li
                  key={item.key}
                  className={styles.titleSpanItem}
                  style={{
                    borderRight: index == list.length - 1 ? "none" : "",
                  }}
                >
                  <span>{item.key}</span> = &nbsp;
                  <span style={{ color: "#666" }}>
                    {handleValueDisplayLogic(item)}
                  </span>
                </li>
              );
            })}
        </ul>
      </div>
      <div
        className={classNames([
          styles.progressContentItemContent,
          isTagsHidden ? styles.none : "",
        ])}
        style={{
          width: titleWidth,
        }}
      >
        {list &&
          list.length > 0 &&
          list.map((item: any, index: number) => {
            return (
              <div
                key={item.key}
                className={classNames([
                  styles.detailsItem,
                  index % 2 == 1 ? styles.bg_gray : styles.bg_white,
                ])}
                onClick={(e) => e.stopPropagation()}
              >
                <span className={styles.detailsItemKeys}>
                  <Tooltip title={item.key} placement="left">
                    {item.key}
                  </Tooltip>
                </span>
                :&nbsp;
                <span className={styles.detailsItemValues}>
                  {handleValueDisplayLogic(item)}
                </span>
                <span className={styles.copyBtn}>
                  <Tooltip title="Copy JSON" placement="left">
                    <Button
                      icon={<CopyOutlined />}
                      type="text"
                      size="small"
                      onClick={() => {
                        copy(JSON.stringify(item)) &&
                          message.success("Copy success");
                      }}
                    ></Button>
                  </Tooltip>
                </span>
              </div>
            );
          })}
      </div>
    </>
  );
};
export default ContentItem;
