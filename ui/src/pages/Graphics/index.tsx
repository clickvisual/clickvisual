import useUrlState from "@ahooksjs/use-url-state";
import classNames from "classnames";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { useModel } from "umi";
import styles from "./index.less";
import LinkDAG from "./LinkDAG";
import LinkFDG from "./LinkFDG";

enum graphicsStateEnum {
  /**
   * 力导引图
   */
  FDG = 0,
  /**
   * 有向无环图
   */
  DAG = 1,
}

const tabTitleList = [
  {
    key: graphicsStateEnum.FDG,
    title: "FDG",
  },
  {
    key: graphicsStateEnum.DAG,
    title: "DAG",
  },
];

const Graphics = () => {
  const [urlState] = useUrlState();
  const { doGetLinkLogLibraryDependency } = useModel("dataLogs");
  const [dataList, setDataList] = useState<any[]>();
  const [graphicsState, setGraphicsState] = useState<graphicsStateEnum>(0);

  useEffect(() => {
    if (!urlState?.tid) return;
    const tid = parseInt(urlState?.tid);
    doGetLinkLogLibraryDependency
      .run(tid, {
        startTime: parseInt(moment().subtract(3, "h").format("X")),
        endTime: parseInt(moment().format("X")),
      })
      .then((res: any) => {
        if (res.code != 0) return;
        setDataList(res.data || []);
      });
  }, []);

  const content = useMemo(() => {
    switch (graphicsState) {
      case graphicsStateEnum.DAG:
        return <LinkDAG dataList={dataList} />;

      case graphicsStateEnum.FDG:
        return <LinkFDG dataList={dataList} />;

      default:
        return <></>;
    }
  }, [graphicsState, dataList]);

  return (
    <div className={styles.graphics}>
      <div className={styles.tabTitle}>
        {tabTitleList.map((item: any) => {
          return (
            <div
              className={classNames([
                styles.tabItem,
                graphicsState == item.key && styles.tabChecked,
              ])}
              key={item.key}
              onClick={() => {
                setGraphicsState(item.key);
              }}
            >
              {item.title}
            </div>
          );
        })}
      </div>
      <div className={styles.tabContent}>{content}</div>
    </div>
  );
};
export default Graphics;
