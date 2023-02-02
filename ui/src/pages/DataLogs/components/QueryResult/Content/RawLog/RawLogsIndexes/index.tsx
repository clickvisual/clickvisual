import logsIndexStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/index.less";
import classNames from "classnames";
import IndexHeader from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexHeader";
import IndexList from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexList";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import { PaneType } from "@/models/datalogs/types";

export enum IndexType {
  /**
   * 基础字段
   */
  baseField = 1,
  /**
   * 日志字段
   */
  logField = 2,
}

const RawLogsIndexes = (props: { oldPane?: PaneType }) => {
  const { oldPane } = props;
  const {
    onChangeBaseFieldsIndexList,
    onChangeLogFieldsIndexList,
    baseFieldsIndexList,
    logFieldsIndexList,
  } = useModel("dataLogs");

  useEffect(() => {
    oldPane &&
      oldPane?.baseFieldsIndexList &&
      onChangeBaseFieldsIndexList(oldPane?.baseFieldsIndexList);
    oldPane?.logFieldsIndexList &&
      onChangeLogFieldsIndexList(oldPane?.logFieldsIndexList);
  }, [oldPane]);

  return (
    <div className={classNames(logsIndexStyles.logsIndexMain)}>
      <IndexHeader />
      <IndexList list={baseFieldsIndexList} indexType={IndexType.baseField} />
      <IndexList list={logFieldsIndexList} indexType={IndexType.logField} />
    </div>
  );
};
export default RawLogsIndexes;
