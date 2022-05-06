import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import SearchBar from "@/pages/DataLogs/components/SearchBar";
import HighCharts from "@/pages/DataLogs/components/HighCharts";
import RawLogs from "@/pages/DataLogs/components/RawLogs";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import RawLogsIndexes from "@/pages/DataLogs/components/RawLogsIndexes";
import DropdownLogMenu from "@/pages/DataLogs/components/DropdownLogMenu";
import { QueryTypeEnum } from "@/models/datalogs/types";
import { useMemo } from "react";
import { Spin } from "antd";
import { useIntl } from "umi";

const QueryResult = () => {
  const { logsLoading, highChartLoading, isHiddenHighChart, queryTypeHelper } =
    useModel("dataLogs");

  const i18n = useIntl();

  const { activeQueryType } = queryTypeHelper;
  const isShare = useMemo(
    () =>
      document.location.pathname === "/share" ||
      document.location.pathname === "/share/",
    [document.location.pathname]
  );

  const RawLogContent = useMemo(
    () => (
      <div className={queryResultStyles.content}>
        <RawLogsIndexes />
        <div className={queryResultStyles.queryDetail}>
          <Spin
            spinning={highChartLoading}
            tip={i18n.formatMessage({ id: "spin" })}
            wrapperClassName={classNames(
              queryResultStyles.querySpinning,
              isHiddenHighChart
                ? queryResultStyles.highChartsHidden
                : queryResultStyles.highCharts
            )}
          >
            <HighCharts />
          </Spin>
          <Spin
            spinning={logsLoading}
            tip={i18n.formatMessage({ id: "spin" })}
            wrapperClassName={classNames(
              queryResultStyles.querySpinning,
              queryResultStyles.logs
            )}
          >
            <RawLogs />
          </Spin>
        </div>
      </div>
    ),
    [highChartLoading, logsLoading]
  );

  const TableContent = () => <div className={queryResultStyles.content}></div>;

  const content = useMemo(() => {
    switch (activeQueryType) {
      case QueryTypeEnum.LOG:
        return RawLogContent;
      case QueryTypeEnum.TABLE:
        return TableContent;
      default:
        return <></>;
    }
  }, [activeQueryType]);

  return (
    <div
      className={classNames(
        queryResultStyles.queryResultMain,
        isShare && queryResultStyles.shareMain
      )}
    >
      <div className={queryResultStyles.header}>
        <SearchBar />
        <DropdownLogMenu isShare={isShare} />
      </div>
      {content}
    </div>
  );
};

export default QueryResult;
