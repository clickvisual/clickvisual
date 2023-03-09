import { FIRST_PAGE } from "@/config/config";
import { versionHistoryListType } from "@/models/dataAnalysis";
import { Tooltip } from "antd";
import { useState } from "react";
import { useIntl, useModel } from "umi";
import { TertiaryEnums } from "../../service/enums";
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

// 不显示结果的secondary
// const ResultList = [SecondaryEnums.dataMining, SecondaryEnums.database];
const ResultList: any = [];

export interface RightMenu {
  node: any;
  currentPaneActiveKey: string;
}

const RightMenu = (props: RightMenu) => {
  const { node, currentPaneActiveKey } = props;
  const i18n = useIntl();
  const [visibleVersionHistory, setVisibleVersionHistory] =
    useState<boolean>(false);
  const [visibleScheduling, setVisibleScheduling] = useState<boolean>(false);
  // 版本历史list
  const [versionHistoryList, setVersionHistoryList] =
    useState<versionHistoryListType>({ list: [], total: 0 });
  // 版本历史的分页
  const [currentPagination, setCurrentPagination] = useState<API.Pagination>({
    current: FIRST_PAGE,
    pageSize: 10,
    total: 0,
  });

  // 右侧边栏运行结果弹窗
  const [visibleResults, setVisibleResults] = useState<boolean>(false);

  // 右侧运行列表数据
  const [resultsList, setResultsList] = useState<any>({});
  const [visibleResultsItem, setVisibleResultsItem] = useState<boolean>(false);

  // 运行list的分页
  const [currentResultsPagination, setCurrentResultsPagination] =
    useState<API.Pagination>({
      current: FIRST_PAGE,
      pageSize: 10,
      total: 0,
    });
  const { doNodeHistories, doResultsList } = useModel("dataAnalysis");

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
      isHidden: node?.tertiary ? !SchedulingList.includes(node.tertiary) : true,
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
      isHidden: !node?.tertiary,
      onClick: () => {
        if (node?.id != currentPaneActiveKey) return;
        setVisibleVersionHistory(true);
        node.id &&
          doNodeHistories
            .run(node.id as number, {
              current: 1,
              pageSize: 10,
              isExcludeCrontabResult: 0,
            })
            .then((res: any) => {
              if (res.code == 0) {
                setVersionHistoryList(res.data);
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
      isHidden: node?.secondary ? ResultList.includes(node.secondary) : true,
      onClick: () => {
        if (node?.id != currentPaneActiveKey) return;
        node.id &&
          doResultsList
            .run(node.id as number, {
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
        open={visibleScheduling}
        setVisible={setVisibleScheduling}
        node={node}
        currentPaneActiveKey={currentPaneActiveKey}
      />
      <Results
        open={visibleResults}
        setVisible={setVisibleResults}
        resultsList={resultsList}
        currentResultsPagination={currentResultsPagination}
        visibleResultsItem={visibleResultsItem}
        setVisibleResultsItem={setVisibleResultsItem}
        onChangeResultsList={setResultsList}
        onChangeCurrentResultsPagination={setCurrentResultsPagination}
        onChangeCurrentPagination={setCurrentPagination}
      />
      <VersionHistory
        node={node}
        open={visibleVersionHistory}
        setVisible={setVisibleVersionHistory}
        versionHistoryList={versionHistoryList}
        currentPagination={currentPagination}
        onChangeVersionHistoryList={setVersionHistoryList}
        onChangeCurrentPagination={setCurrentPagination}
        currentPaneActiveKey={currentPaneActiveKey}
      />
    </div>
  );
};
export default RightMenu;
