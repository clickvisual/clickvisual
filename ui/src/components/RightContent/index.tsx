import { Space } from "antd";
import React from "react";
import { SelectLang, useModel } from "umi";
import Avatar from "./AvatarDropdown";
import styles from "./index.less";

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
      <SelectLang className={styles.action} reload={false} />
    </Space>
  );
};
export default RightContent;
