import { PaneType } from "@/models/datalogs/types";
import RawLogList from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList";
import rawLogsStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogs/index.less";
import RawLogsOperations from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations";
import { useModel } from "@umijs/max";
import { Empty } from "antd";
import { useMemo } from "react";
import { useIntl } from "umi";

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
