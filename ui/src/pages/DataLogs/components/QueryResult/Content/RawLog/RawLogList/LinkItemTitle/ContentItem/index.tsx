import { CopyOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import { Button, message, Tooltip } from "antd";
import classNames from "classnames";
import { useState } from "react";
import copy from "copy-to-clipboard";
import styles from "./index.less";

const ContentItem = ({ title, list }: { title: any; list: any[] }) => {
  const [isTagsHidden, setIsTagsHidden] = useState<boolean>(true);

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
        onClick={(e) => {
          e.stopPropagation();
          setIsTagsHidden(!isTagsHidden);
        }}
      >
        {isTagsHidden ? <RightOutlined /> : <DownOutlined />}
        {title}
        {isTagsHidden ? ": " : ""}
        <span
          className={classNames([
            styles.titleSpan,
            !isTagsHidden && styles.none,
          ])}
        >
          {list.map((item: any, index: number) => {
            if (index <= 2) {
              return (
                <div key={item.key} className={styles.titleSpanItem}>
                  <span>{item.key}</span> = &nbsp;
                  <span style={{ color: "#666" }}>
                    {handleValueDisplayLogic(item)}
                  </span>
                  {index != 2 && <span>&nbsp;|&nbsp;</span>}
                </div>
              );
            }
            return;
          })}
        </span>
      </div>
      <div
        className={classNames([
          styles.progressContentItemContent,
          isTagsHidden ? styles.none : "",
        ])}
      >
        {list.map((item: any, index: number) => {
          return (
            <div
              key={item.key}
              className={classNames([
                styles.detailsItem,
                index % 2 == 1 ? styles.bg_gray : styles.bg_white,
              ])}
            >
              <span className={styles.detailsItemKeys}>{item.key}</span>
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
