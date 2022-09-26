import { CopyOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import { Button, message, Tooltip } from "antd";
import classNames from "classnames";
import { useState } from "react";
import copy from "copy-to-clipboard";
import styles from "./index.less";
import { useModel } from "umi";

const ContentItem = ({ title, list }: { title: any; list: any[] }) => {
  const [isTagsHidden, setIsTagsHidden] = useState<boolean>(true);
  const { resizeMenuWidth } = useModel("dataLogs");

  const handleValueDisplayLogic = (obj: any) => {
    if (obj?.vType) {
      switch (obj.vType) {
        case "INT64":
          return (
            <span style={{ color: "#2fabee" }}>{obj?.vInt64 || "「0」"}</span>
          );

        case "BOOL":
          return (
            <span style={{ color: "#f22222" }}>
              {obj?.vBool?.toString() || "「no BOOL」"}
            </span>
          );

        case "FLOAT64":
          return (
            <span style={{ color: "#00f" }}>
              {obj?.VFloat64 || "「not FLOAT64」"}
            </span>
          );

        case "BINARY":
          return <span style={{ color: "#000" }}>「binary」</span>;

        default:
          return <span>「Contacting an Administrator」</span>;
          break;
      }
    } else {
      return obj?.vStr || "「no vStr」";
    }
  };

  return (
    <>
      <div
        className={styles.progressContentItemTitle}
        style={{ width: `calc(85vw - ${resizeMenuWidth}px - 300px)` }}
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
