import { useIntl } from "umi";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { Tooltip } from "antd";
import IconFont from "@/components/IconFont";
import { useModel } from "@@/plugin-model/useModel";

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
