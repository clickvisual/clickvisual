import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { Popover, Tooltip } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { useIntl } from "umi";
import MoreLogPopoverContent from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemOperation/MoreLog/MoreLogPopoverContent";

interface MoreLogProps {
  log: any;
}
const MoreLog = ({ log }: MoreLogProps) => {
  const i18n = useIntl();
  return (
    <Popover
      placement={"right"}
      content={<MoreLogPopoverContent log={log} />}
      trigger="click"
      overlayInnerStyle={{ maxHeight: 400, maxWidth: 500, overflow: "auto" }}
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
