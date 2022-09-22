// import style from "@/pages/DataLogs/components/QueryResult/Content/RawLog/ClickMenu/index.less";
import { Dropdown, Menu, message } from "antd";
import { ReactNode, useMemo } from "react";
import copy from "copy-to-clipboard";
import { useIntl, useModel } from "umi";
import { QUERY_PATH } from "@/config/config";

interface ClickMenuProps {
  children: ReactNode;
  content: string | number | bigint;
  field: string | undefined;
  handleAddCondition: () => void;
  handleOutCondition: () => void;
  isHidden?: boolean;
}
const ClickMenu = (props: ClickMenuProps) => {
  const i18n = useIntl();
  const {
    content,
    children,
    handleAddCondition,
    handleOutCondition,
    isHidden,
  } = props;

  const { currentLogLibrary } = useModel("dataLogs");

  const handleCopyLog = () => {
    copy(content.toString());
    message.success(i18n.formatMessage({ id: "log.item.copy.success" }));
  };

  const goLinkedLinkLogLibrary = () => {
    window.open(
      `${QUERY_PATH}?kw=\`_key\`='${content}'&tid=${currentLogLibrary?.relTraceTableId}`,
      "_blank"
    );
  };

  const items: any = useMemo(() => {
    let arr: any[] = [];
    if (!isHidden) {
      arr.push(
        {
          key: "addQuery",
          onClick: handleAddCondition,
          label: i18n.formatMessage({ id: "log.ClickMenu.addCondition" }),
        },
        {
          key: "reduceQuery",
          onClick: handleOutCondition,
          label: i18n.formatMessage({ id: "log.ClickMenu.excludeCondition" }),
        }
      );
    }
    if (currentLogLibrary?.relTraceTableId) {
      arr.push({
        key: "link",
        onClick: goLinkedLinkLogLibrary,
        label: i18n.formatMessage({ id: "log.ClickMenu.viewLink" }),
      });
    }
    if (!isHidden || currentLogLibrary?.relTraceTableId) {
      arr.push({
        type: "divider",
      });
    }
    arr.push({
      key: "copyValue",
      onClick: handleCopyLog,
      label: i18n.formatMessage({ id: "log.ClickMenu.copyValues" }),
    });

    return arr;
  }, [isHidden, handleAddCondition, handleOutCondition, handleCopyLog]);

  const menu = <Menu style={{ width: "190px" }} items={items} />;

  return (
    <Dropdown overlay={menu} placement="bottomLeft" trigger={["click"]}>
      {children}
    </Dropdown>
  );
};

export default ClickMenu;
