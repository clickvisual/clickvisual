import { QueryTypeEnum } from "@/config/config";
import useLocalStorages, { LocalModuleType } from "@/hooks/useLocalStorages";
import OtherSearchBar from "@/pages/DataLogs/components/OtherSearchBar";
import RawLogContent from "@/pages/DataLogs/components/QueryResult/Content/RawLog";
import StatisticalTableContent from "@/pages/DataLogs/components/QueryResult/Content/StatisticalTable";
import FilterList from "@/pages/DataLogs/components/QueryResult/FilterList";
import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import SearchBar from "@/pages/DataLogs/components/SearchBar";
import useUrlState from "@ahooksjs/use-url-state";
import { useModel } from "@umijs/max";
import { Breadcrumb } from "antd";
import classNames from "classnames";
import { useEffect, useMemo } from "react";

const SharePath = [
  process.env.PUBLIC_PATH + "share",
  process.env.PUBLIC_PATH + "share/",
];

const QueryResult = (props: { tid: string }) => {
  const { tid } = props;
  const [usrState] = useUrlState<any>();
  const { statisticalChartsHelper, tableInfo } = useModel("dataLogs");
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
    switch (activeQueryType) {
      case QueryTypeEnum.LOG:
        return <RawLogContent tid={tid} />;
      case QueryTypeEnum.TABLE:
        return <StatisticalTableContent isShare={isShare} />;
      default:
        return <RawLogContent tid={tid} />;
    }
  }, [activeQueryType, usrState, usrState?.mode]);

  const url = `${window.location.href.split("share")[0]}query?tid=${tid}`;

  return (
    <div
      className={classNames(
        queryResultStyles.queryResultMain,
        isShare && queryResultStyles.shareMain
      )}
    >
      {isShare && tableInfo && (
        <Breadcrumb style={{ paddingBottom: "10px" }}>
          <Breadcrumb.Item>{tableInfo?.database?.instanceName}</Breadcrumb.Item>
          <Breadcrumb.Item>{tableInfo?.database?.name}</Breadcrumb.Item>
          <Breadcrumb.Item>
            <a href={url}>{tableInfo?.name}</a>
          </Breadcrumb.Item>
        </Breadcrumb>
      )}
      <div className={queryResultStyles.header}>
        <SearchBar />
        <OtherSearchBar
          isShowSwitch={!(usrState?.mode && usrState?.mode == 0)}
        />
      </div>
      {activeQueryType == QueryTypeEnum.LOG && !isShare && (
        <FilterList tid={parseInt(tid)} />
      )}
      {content}
    </div>
  );
};

export default QueryResult;
