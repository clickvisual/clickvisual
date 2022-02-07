import rawLogsStyles from "@/pages/DataLogs/components/RawLogs/index.less";
import RawLogsOperations from "@/pages/DataLogs/components/RawLogsOperations";
import RawLogList from "@/pages/DataLogs/components/RawLogList";
import { useModel } from "@@/plugin-model/useModel";
import { Empty } from "antd";
import { useIntl } from "umi";

const RawLogs = () => {
  const { logs } = useModel("dataLogs");
  const i18n = useIntl();

  const logList = logs?.logs || [];
  return (
    <div className={rawLogsStyles.rawLogsMain}>
      <div className={rawLogsStyles.rawLogs}>
        {logList.length > 0 ? (
          <>
            <RawLogsOperations />
            <RawLogList />
          </>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={i18n.formatMessage({ id: "log.empty" })}
          />
        )}
      </div>
    </div>
  );
};
export default RawLogs;
