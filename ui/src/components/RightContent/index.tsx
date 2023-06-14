import {Button, Space, Tooltip} from "antd";
import React from "react";
import {SelectLang, useModel} from "umi";
import Avatar from "./AvatarDropdown";
import styles from "./index.less";
import IconFont from "@/components/IconFont";

export type SiderTheme = "light" | "dark";

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
  return (
    <Space className={className}>
      <Avatar />
        <Tooltip placement="bottom" title={"Shimo"}>
        <Button type="link">
            <a href="https://shimo.im/welcome" target="_blank">
            <IconFont type={"icon-shimo"} />
            </a>
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
