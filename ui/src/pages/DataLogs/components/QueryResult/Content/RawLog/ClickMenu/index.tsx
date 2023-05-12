// import style from "@/pages/DataLogs/components/QueryResult/Content/RawLog/ClickMenu/index.less";
import { QUERY_PATH } from "@/config/config";
import { Dropdown, message } from "antd";
import copy from "copy-to-clipboard";
import { ReactNode, useMemo } from "react";
import { useIntl, useModel } from "umi";

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

  return (
    <Dropdown
      menu={{ items: items, style: { width: "190px" } }}
      placement="bottomLeft"
      trigger={["click"]}
    >
      {children}
    </Dropdown>
  );
};

export default ClickMenu;
