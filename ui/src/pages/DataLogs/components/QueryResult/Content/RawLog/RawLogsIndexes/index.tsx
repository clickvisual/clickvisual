import logsIndexStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/index.less";
import classNames from "classnames";
import IndexHeader from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexHeader";
import IndexList from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexList";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { PaneType } from "@/models/datalogs/types";

const RawLogsIndexes = (props: { oldPane?: PaneType }) => {
  const { oldPane } = props;
  const { onChangeRawLogsIndexeList, rawLogsIndexeList } = useModel("dataLogs");

  useEffect(() => {
    oldPane &&
      oldPane?.rawLogsIndexeList &&
      onChangeRawLogsIndexeList(oldPane?.rawLogsIndexeList);
  }, [oldPane]);

  return (
    <div className={classNames(logsIndexStyles.logsIndexMain)}>
      <IndexHeader />
      {/* <IndexSearchBar onSearch={onSearch} /> */}
      <IndexList list={rawLogsIndexeList} />
    </div>
  );
};
export default RawLogsIndexes;
