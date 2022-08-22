import rawLogsStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogs/index.less";
import RawLogsOperations from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations";
import RawLogList from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList";
import { useModel } from "@@/plugin-model/useModel";
import { Empty } from "antd";
import { useIntl } from "umi";
import { useMemo } from "react";
import { PaneType } from "@/models/datalogs/types";

const RawLogs = (props: { oldPane: PaneType | undefined }) => {
  const { logs } = useModel("dataLogs");
  const i18n = useIntl();

  const logList = useMemo(() => logs?.logs || [], [logs?.logs]);

  return (
    <div className={rawLogsStyles.rawLogsMain}>
      <div className={rawLogsStyles.rawLogs}>
        {logList.length > 0 ? (
          <>
            <RawLogsOperations {...props} />
            <RawLogList {...props} />
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
