import { Tooltip } from "antd";
import { useState } from "react";
import { useModel } from "umi";
import style from "./index.less";
import Results from "./Results";
import VersionHistory from "./VersionHistory";

export enum RightMenuType {
  /**
   * 历史版本
   */
  VersionHistory = 101,
  /**
   * 运行结果
   */
  Results = 102,
}

const RightMenu = () => {
  const [visibleVersionHistory, setVisibleVersionHistory] =
    useState<boolean>(false);
  const {
    openNodeId,
    doNodeHistories,
    changeVersionHistoryList,
    setCurrentPagination,
    visibleResults,
    setVisibleResults,
  } = useModel("dataAnalysis");

  const rightMenu = [
    {
      id: RightMenuType.VersionHistory,
      title: "版本",
      Tooltip: "历史版本",
      onClick: () => {
        setVisibleVersionHistory(true);
        openNodeId &&
          doNodeHistories
            .run(openNodeId as number, {
              current: 1,
              pageSize: 10,
            })
            .then((res: any) => {
              if (res.code == 0) {
                changeVersionHistoryList(res.data);
                setCurrentPagination({
                  current: 1,
                  pageSize: 10,
                  total: res.data.total,
                });
              }
              return;
            });
      },
    },
    {
      id: RightMenuType.Results,
      title: "结果",
      Tooltip: "运行结果",
      onClick: () => {
        setVisibleResults(true);
      },
    },
  ];

  return (
    <div className={style.rightMenu}>
      {rightMenu.map((item: any) => {
        return (
          <div className={style.menuItem} key={item.id}>
            <Tooltip title={item.Tooltip}>
              <a onClick={item.onClick}>{item.title}</a>
            </Tooltip>
          </div>
        );
      })}
      <Results visible={visibleResults} setVisible={setVisibleResults} />
      <VersionHistory
        visible={visibleVersionHistory}
        setVisible={setVisibleVersionHistory}
      />
    </div>
  );
};
export default RightMenu;
