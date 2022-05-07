import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import SearchBar from "@/pages/DataLogs/components/SearchBar";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import DropdownLogMenu from "@/pages/DataLogs/components/DropdownLogMenu";
import { useMemo } from "react";
import { QueryTypeEnum } from "@/config/config";
import RawLogContent from "@/pages/DataLogs/components/QueryResult/Content/RawLog";
import StatisticalTableContent from "@/pages/DataLogs/components/QueryResult/Content/StatisticalTable";

const QueryResult = () => {
  const { statisticalChartsHelper } = useModel("dataLogs");

  const { activeQueryType } = statisticalChartsHelper;
  const isShare = useMemo(
    () =>
      document.location.pathname === "/share" ||
      document.location.pathname === "/share/",
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
        <DropdownLogMenu isShare={isShare} />
      </div>
      <Content />
    </div>
  );
};

export default QueryResult;
