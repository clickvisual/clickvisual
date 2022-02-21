import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { Popover, Tooltip } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { useIntl } from "umi";
import MoreLogPopoverContent from "@/pages/DataLogs/components/RawLogList/LogItem/LogItemOperation/MoreLog/MoreLogPopoverContent";

const MoreLog = () => {
  const i18n = useIntl();
  return (
    <Popover
      placement={"right"}
      content={<MoreLogPopoverContent />}
      trigger="click"
      overlayClassName={logItemStyles.popoverOverlay}
    >
      <div className={logItemStyles.icon}>
        <Tooltip title={i18n.formatMessage({ id: "log.item.moreTag" })}>
          <a>
            <MoreOutlined />
          </a>
        </Tooltip>
      </div>
    </Popover>
  );
};
export default MoreLog;
