import { useIntl } from "umi";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { message, Tooltip } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import copy from "copy-to-clipboard";

interface CopyRawLogProps {
  log: any;
}
const CopyRawLog = ({ log }: CopyRawLogProps) => {
  const i18n = useIntl();

  const copyRawLog = (value: any) => {
    if (value) {
      copy(typeof value === "object" ? JSON.stringify(value, null, 2) : JSON.stringify(JSON.parse(value), null, 2));
      message.success(i18n.formatMessage({ id: "log.item.copy.success" }));
    } else {
      message.error(i18n.formatMessage({ id: "log.item.copy.failed" }));
    }
  };

  return (
    <div
      className={logItemStyles.icon}
      onClick={() => copyRawLog(log._raw_log_)}
    >
      <Tooltip
        title={i18n.formatMessage({ id: "log.item.copyRowLog" })}
        overlayInnerStyle={{ fontSize: 12 }}
      >
        <CopyOutlined style={{ color: "rgb(242, 143, 90)" }} />
      </Tooltip>
    </div>
  );
};
export default CopyRawLog;
