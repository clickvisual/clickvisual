import { Tooltip } from "antd";
import { useState } from "react";
import { useModel, useIntl } from "umi";
import { SecondaryEnums, TertiaryEnums } from "../../service/enums";
import style from "./index.less";
import Results from "./Results";
import Scheduling from "./Scheduling";
import VersionHistory from "./VersionHistory";

export enum RightMenuType {
  /**
   * 调度配置
   */
  Scheduling = 101,
  /**
   * 历史版本
   */
  VersionHistory = 102,
  /**
   * 运行结果
   */
  Results = 103,
}

// 离线同步和数据库脚本执行才显示调度配置  其他不显示
const SchedulingList = [
  TertiaryEnums.clickhouse,
  TertiaryEnums.mysql,
  TertiaryEnums.offline,
];

// 数据开发的结果更替在sql编辑器下方
const ResultList = [SecondaryEnums.dataMining, SecondaryEnums.database];

const RightMenu = () => {
  const i18n = useIntl();
  const [visibleVersionHistory, setVisibleVersionHistory] =
    useState<boolean>(false);
  const [visibleScheduling, setVisibleScheduling] = useState<boolean>(false);
  const {
    openNodeId,
    doNodeHistories,
    changeVersionHistoryList,
    setCurrentPagination,
    visibleResults,
    setVisibleResults,
    doResultsList,
    setCurrentResultsPagination,
    setResultsList,
    manageNode,
  } = useModel("dataAnalysis");
  const { selectNode } = manageNode;

  let rightMenu = [
    // 调度配置
    {
      id: RightMenuType.Scheduling,
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.properties",
      }),
      Tooltip: i18n.formatMessage({
        id: "bigdata.components.RightMenu.properties",
      }),
      isHidden: selectNode?.tertiary
        ? !SchedulingList.includes(selectNode.tertiary)
        : true,
      onClick: () => {
        setVisibleScheduling(true);
      },
    },
    // 版本
    {
      id: RightMenuType.VersionHistory,
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.versions",
      }),
      Tooltip: i18n.formatMessage({
        id: "bigdata.components.RightMenu.Versions.tips",
      }),
      isHidden: !selectNode?.tertiary,
      onClick: () => {
        setVisibleVersionHistory(true);
        openNodeId &&
          doNodeHistories
            .run(openNodeId as number, {
              current: 1,
              pageSize: 10,
              isExcludeCrontabResult: 0,
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
    // 结果
    {
      id: RightMenuType.Results,
      title: i18n.formatMessage({ id: "bigdata.components.RightMenu.results" }),
      Tooltip: i18n.formatMessage({
        id: "bigdata.components.RightMenu.results.tips",
      }),
      isHidden: selectNode?.secondary
        ? ResultList.includes(selectNode.secondary)
        : true,
      onClick: () => {
        openNodeId &&
          doResultsList
            .run(openNodeId as number, {
              current: 1,
              pageSize: 10,
              isExcludeCrontabResult: 0,
            })
            .then((res: any) => {
              if (res.code == 0) {
                setResultsList(res.data);
                setCurrentResultsPagination({
                  current: 1,
                  pageSize: 10,
                  total: res.data.total,
                });
              }
            });
        setVisibleResults(true);
      },
    },
  ];

  return (
    <div className={style.rightMenu}>
      {rightMenu.map((item: any) => {
        if (item.isHidden) {
          // 返回空标签会有key值的问题
          return null;
        }
        return (
          <div className={style.menuItem} key={item.id}>
            <Tooltip title={item.Tooltip}>
              <a onClick={item.onClick}>{item.title}</a>
            </Tooltip>
          </div>
        );
      })}
      <Scheduling
        visible={visibleScheduling}
        setVisible={setVisibleScheduling}
      />
      <Results visible={visibleResults} setVisible={setVisibleResults} />
      <VersionHistory
        visible={visibleVersionHistory}
        setVisible={setVisibleVersionHistory}
      />
    </div>
  );
};
export default RightMenu;
