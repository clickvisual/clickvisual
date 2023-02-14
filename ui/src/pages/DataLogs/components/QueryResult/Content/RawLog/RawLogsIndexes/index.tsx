import logsIndexStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/index.less";
import classNames from "classnames";
// import IndexHeader from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexHeader";
import IndexList from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexList";
import { useCallback, useEffect, useMemo } from "react";
import { PaneType } from "@/models/datalogs/types";
import { IndexType } from "..";

const RawLogsIndexes = (props: {
  oldPane?: PaneType;
  indexType: IndexType;
  baseActiveKey: string[];
  logActiveKey: string[];
  setLogActiveKey: (str: string[]) => void;
  setBaseActiveKey: (str: string[]) => void;
}) => {
  const {
    oldPane,
    indexType,
    baseActiveKey,
    logActiveKey,
    setBaseActiveKey,
    setLogActiveKey,
  } = props;

  const isBaseField = useMemo(
    () => indexType === IndexType.baseField,
    [indexType]
  );

  useEffect(() => {
    setActiveKey(isBaseField ? [] : ["1"]);
  }, []);

  const activeKey = useMemo(() => {
    return isBaseField ? baseActiveKey : logActiveKey;
  }, [isBaseField, baseActiveKey, logActiveKey]);

  const setActiveKey = useCallback(
    (value: string[]) => {
      return !isBaseField ? setLogActiveKey(value) : setBaseActiveKey(value);
    },
    [isBaseField]
  );

  const list = useMemo(() => {
    if (indexType == IndexType.baseField) {
      return oldPane?.baseFieldsIndexList;
    } else {
      return oldPane?.logFieldsIndexList;
    }
  }, [oldPane]);

  const maxHeight = useMemo(() => {
    if (indexType == IndexType.baseField && activeKey.length == 0) {
      return "3%";
    }
    if (indexType == IndexType.baseField && activeKey.length == 1) {
      return "50%";
    }
    return "97%";
  }, [indexType, activeKey]);

  return (
    <div
      className={classNames(logsIndexStyles.logsIndexMain)}
      style={{
        maxHeight: maxHeight,
      }}
    >
      {/* <IndexHeader indexType={indexType} /> */}
      <IndexList
        activeKey={activeKey}
        setActiveKey={setActiveKey}
        baseActiveKey={baseActiveKey}
        logActiveKey={logActiveKey}
        list={list}
        indexType={indexType}
      />
    </div>
  );
};
export default RawLogsIndexes;
