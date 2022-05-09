import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import SearchBar from "@/pages/DataLogs/components/SearchBar";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import OtherSearchBar from "@/pages/DataLogs/components/OtherSearchBar";
import { useMemo } from "react";
import { QueryTypeEnum } from "@/config/config";
import RawLogContent from "@/pages/DataLogs/components/QueryResult/Content/RawLog";
import StatisticalTableContent from "@/pages/DataLogs/components/QueryResult/Content/StatisticalTable";

const SharePath = [
  process.env.PUBLIC_PATH + "share",
  process.env.PUBLIC_PATH + "share/",
];

const QueryResult = () => {
  const { statisticalChartsHelper } = useModel("dataLogs");

  const { activeQueryType } = statisticalChartsHelper;

  const isShare = useMemo(
    () => SharePath.includes(document.location.pathname),
    [document.location.pathname]
  );

  const Content = useMemo(() => {
    switch (activeQueryType) {
      case QueryTypeEnum.LOG:
        return RawLogContent;
      case QueryTypeEnum.TABLE:
        return StatisticalTableContent;
      default:
        return RawLogContent;
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
        <OtherSearchBar isShare={isShare} />
      </div>
      <Content />
    </div>
  );
};

export default QueryResult;
