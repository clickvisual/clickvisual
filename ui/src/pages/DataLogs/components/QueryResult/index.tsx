import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import SearchBar from "@/pages/DataLogs/components/SearchBar";
import { useModel } from "@@/plugin-model/useModel";
import classNames from "classnames";
import OtherSearchBar from "@/pages/DataLogs/components/OtherSearchBar";
import { useEffect, useMemo } from "react";
import { QueryTypeEnum } from "@/config/config";
import RawLogContent from "@/pages/DataLogs/components/QueryResult/Content/RawLog";
import StatisticalTableContent from "@/pages/DataLogs/components/QueryResult/Content/StatisticalTable";
import useUrlState from "@ahooksjs/use-url-state";
import useLocalStorages, { LocalModuleType } from "@/hooks/useLocalStorages";

const SharePath = [
  process.env.PUBLIC_PATH + "share",
  process.env.PUBLIC_PATH + "share/",
];

const QueryResult = (props: { tid?: string; activeKey?: string }) => {
  const { tid, activeKey } = props;
  const [usrState] = useUrlState<any>();
  const { statisticalChartsHelper } = useModel("dataLogs");
  const { onSetLocalData } = useLocalStorages();

  const { activeQueryType } = statisticalChartsHelper;

  const isShare = useMemo(
    () => SharePath.includes(document.location.pathname),
    [document.location.pathname]
  );

  // 关闭tid标签页的时候清除那一项的值
  useEffect(() => {
    return () => {
      if (tid) {
        const data = {
          [tid]: false,
        };
        onSetLocalData(data, LocalModuleType.datalogsQuerySql);
      }
    };
  }, []);
  const content = useMemo(() => {
    if (activeKey != tid) return <></>;
    switch (activeQueryType) {
      case QueryTypeEnum.LOG:
        return <RawLogContent />;
      case QueryTypeEnum.TABLE:
        return <StatisticalTableContent isShare={isShare} />;
      default:
        return <RawLogContent />;
    }
  }, [activeQueryType, usrState, usrState?.mode, activeKey, tid]);

  return (
    <div
      className={classNames(
        queryResultStyles.queryResultMain,
        isShare && queryResultStyles.shareMain
      )}
    >
      <div className={queryResultStyles.header}>
        <SearchBar />
        <OtherSearchBar
          isShare={isShare}
          isShowSwitch={!(usrState?.mode && usrState?.mode == 0)}
        />
      </div>
      {content}
    </div>
  );
};

export default QueryResult;
