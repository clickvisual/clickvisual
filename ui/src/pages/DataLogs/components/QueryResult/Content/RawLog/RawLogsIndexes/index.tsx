import logsIndexStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/index.less";
import classNames from "classnames";
// import IndexSearchBar from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexSearchBar";
import IndexHeader from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexHeader";
import IndexList from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexList";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useState } from "react";
import { IndexInfoType } from "@/services/dataLogs";

const RawLogsIndexes = (props: { tid: number | undefined }) => {
  const { tid } = props;
  const { doGetAnalysisField } = useModel("dataLogs");
  const [indexList, setIndexList] = useState<IndexInfoType[]>([]);

  useEffect(() => {
    tid &&
      doGetAnalysisField.run(tid).then((res: any) => {
        if (res.code != 0) return;
        setIndexList(res.data?.keys);
      });
  }, []);

  // const onSearch = (val: string) => {
  //   const list = logs?.keys || [];
  //   setIndexList(
  //     list.filter((item) =>
  //       item.field.toLowerCase().includes(val.toLowerCase())
  //     ) || []
  //   );
  // };

  // useEffect(() => {
  //   setIndexList(logs?.keys || []);
  // }, [logs]);

  return (
    <div className={classNames(logsIndexStyles.logsIndexMain)}>
      <IndexHeader />
      {/* <IndexSearchBar onSearch={onSearch} /> */}
      <IndexList list={indexList} />
    </div>
  );
};
export default RawLogsIndexes;
