import IconFont from "@/components/IconFont";
import { CaretDownOutlined, LinkOutlined } from "@ant-design/icons";
import { Button, Dropdown, Space, Tooltip } from "antd";
import React from "react";
import { SelectLang, useModel } from "umi";
import Avatar from "./AvatarDropdown";
import styles from "./index.less";

export type SiderTheme = "light" | "dark";
const VERSION_STORAGE_KEY = "clickvisual-preferred-ui-version";
const OFFICEDEX_URL = "https://officedex.ai/";
const SHIMODOCS_URL = "https://github.com/shimodocs/shimodocs";
const SHIMODOCS_TOOLTIP =
  "我们团队最新推出的石墨文档私有化版本5人永久免费版 @ShimoDocs，欢迎了解！";

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

  const partnerMenu = {
    items: [
      {
        key: "officedex",
        icon: <LinkOutlined />,
        label: (
          <a href={OFFICEDEX_URL} target="_blank" rel="noopener noreferrer">
            OfficeDex
          </a>
        ),
      },
      {
        key: "shimodocs",
        icon: <IconFont type="icon-shimo" />,
        label: (
          <a
            href={SHIMODOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={SHIMODOCS_TOOLTIP}
          >
            ShimoDocs
          </a>
        ),
      },
    ],
  };

  return (
    <Space className={className}>
      <Avatar />
      <Tooltip placement="bottom" title={"切换到 v2"}>
        <Button type="link" href={getV2Href()} onClick={handleSwitchToV2}>
          v2
        </Button>
      </Tooltip>
      <Space size={0} className={styles.partnerSplit}>
        <Tooltip placement="bottom" title="OfficeDex">
          <Button
            type="link"
            href={OFFICEDEX_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="OfficeDex"
          >
            OfficeDex
          </Button>
        </Tooltip>
        <Dropdown
          menu={partnerMenu}
          trigger={["hover"]}
          mouseEnterDelay={0.08}
          mouseLeaveDelay={0.12}
          placement="bottomRight"
        >
          <Button
            type="link"
            className={styles.partnerCaret}
            aria-label="合作产品"
          >
            <CaretDownOutlined />
          </Button>
        </Dropdown>
      </Space>
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
