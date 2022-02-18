import { useIntl } from "umi";
import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import { Tooltip } from "antd";
import IconFont from "@/components/IconFont";
import { useModel } from "@@/plugin-model/useModel";
import { LogItemContext } from "@/pages/DataLogs/components/RawLogList";
import { useContext } from "react";

const CopyLog = () => {
  const { onCopyRawLogDetails } = useModel("dataLogs");
  const { log } = useContext(LogItemContext);
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
