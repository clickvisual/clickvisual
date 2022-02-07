import logsIndexStyles from "@/pages/DataLogs/components/RawLogsIndexes/index.less";
import classNames from "classnames";
import IndexSearchBar from "@/pages/DataLogs/components/RawLogsIndexes/IndexSearchBar";
import IndexHeader from "@/pages/DataLogs/components/RawLogsIndexes/IndexHeader";
import IndexList from "@/pages/DataLogs/components/RawLogsIndexes/IndexList";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useState } from "react";

const RawLogsIndexes = () => {
  const { logs } = useModel("dataLogs");
  const [indexList, setIndexList] = useState<string[]>(logs?.keys || []);
  const onSearch = (val: string) => {
    const list = logs?.keys || [];
    setIndexList(
      list.filter((item) => item.toLowerCase().includes(val.toLowerCase())) ||
        []
    );
  };
  useEffect(() => {
    setIndexList(logs?.keys || []);
  }, [logs]);
  return (
    <div className={classNames(logsIndexStyles.logsIndexMain)}>
      <IndexHeader />
      <IndexSearchBar onSearch={onSearch} />
      <IndexList list={indexList} />
    </div>
  );
};
export default RawLogsIndexes;
