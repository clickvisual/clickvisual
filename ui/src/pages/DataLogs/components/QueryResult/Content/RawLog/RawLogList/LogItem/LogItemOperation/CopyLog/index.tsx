import IconFont from "@/components/IconFont";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { useModel } from "@umijs/max";
import { Tooltip } from "antd";
import { useIntl } from "umi";

interface CopyLogProps {
  log: any;
}
const CopyLog = ({ log }: CopyLogProps) => {
  const { onCopyRawLogDetails } = useModel("dataLogs");
  const i18n = useIntl();
  return (
    <div
      className={logItemStyles.icon}
      onClick={() => onCopyRawLogDetails(log)}
    >
      <Tooltip
        title={i18n.formatMessage({ id: "log.item.copy" })}
        overlayInnerStyle={{ fontSize: 12 }}
      >
        <IconFont type={"icon-copy-link"} />
      </Tooltip>
    </div>
  );
};
export default CopyLog;
