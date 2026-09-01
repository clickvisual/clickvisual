import {Button, Space, Tooltip} from "antd";
import React from "react";
import {SelectLang, useModel} from "umi";
import Avatar from "./AvatarDropdown";
import styles from "./index.less";
import IconFont from "@/components/IconFont";

export type SiderTheme = "light" | "dark";
const VERSION_STORAGE_KEY = "clickvisual-preferred-ui-version";

function getV2Href() {
  return `${process.env.PUBLIC_PATH || "/"}v2/query`;
}

const RightContent: React.FC = () => {
  const { initialState } = useModel("@@initialState");

  if (!initialState || !initialState.settings) {
    return null;
  }

  const { navTheme, layout } = initialState.settings;
  let className = styles.right;

  if ((navTheme === "realDark" && layout === "top") || layout === "mix") {
    className = `${styles.right}  ${styles.dark}`;
  }

  const handleSwitchToV2 = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VERSION_STORAGE_KEY, "v2");
    }
  };

  return (
    <Space className={className}>
      <Avatar />
        <Tooltip placement="bottom" title={"V2"}>
        <Button type="link" href={getV2Href()} onClick={handleSwitchToV2}>
            前往 v2
        </Button>
        </Tooltip>
        <Tooltip
          placement="bottom"
          title={
            "我们团队最新推出了石墨文档私有化版本5人永久免费版 @ShimoDocs，欢迎了解！"
          }
        >
          <Button
            type="link"
            href="https://github.com/shimodocs/shimodocs"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="我们团队最新推出了石墨文档私有化版本5人永久免费版 @ShimoDocs，欢迎了解！"
          >
            <IconFont type={"icon-shimo"} />
          </Button>
        </Tooltip>
        <Tooltip placement="bottom" title={"Github"}>
        <Button type="link">
            <a href="https://github.com/clickvisual/clickvisual" target="_blank">
            <IconFont type={"icon-github"} />
            </a>
        </Button>
        </Tooltip>
        <SelectLang className={styles.action} reload={false} />
    </Space>
  );
};
export default RightContent;
