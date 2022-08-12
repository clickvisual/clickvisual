import style from "../../index.less";
import {
  ClusterOutlined,
  MonitorOutlined,
  CodeOutlined,
  CodepenOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import { useModel, useIntl } from "umi";
import useUrlState from "@ahooksjs/use-url-state";
import { useEffect } from "react";
import { BigDataNavEnum } from "@/pages/DataAnalysis";
import useLocalStorages, { LocalModuleType } from "@/hooks/useLocalStorages";
import IconFont from "@/components/IconFont";

const DataAnalysisNav = () => {
  const i18n = useIntl();
  const [urlState, setUrlState] = useUrlState<any>();
  const { onSetLocalData } = useLocalStorages();
  const {
    onChangeNavKey,
    navKey,
    openNodeId,
    realTimeTraffic,
    // changeOpenNodeId,
    // changeOpenNodeParentId,
    // changeOpenNodeData,
    // changeFolderContent,
    dataSourceManage,
    manageNode,
    temporaryQuery,
  } = useModel("dataAnalysis");
  const { setNodes, setEdges } = realTimeTraffic;

  const navList = [
    {
      id: 101,
      key: BigDataNavEnum.RealTimeTrafficFlow,
      title: i18n.formatMessage({
        id: "menu.bigdata.realtime",
      }),
      icon: <ClusterOutlined />,
    },
    {
      id: 102,
      key: BigDataNavEnum.TemporaryQuery,
      title: i18n.formatMessage({
        id: "menu.bigdata.temporaryQuery",
      }),
      icon: <MonitorOutlined />,
    },
    {
      id: 103,
      key: BigDataNavEnum.OfflineManage,
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.Scheduling.secondary.dataMining",
      }),
      icon: <CodeOutlined />,
    },
    {
      id: 104,
      key: BigDataNavEnum.DataSourceManage,
      title: i18n.formatMessage({
        id: "bigdata.components.Nav.navList.dataSourceManage",
      }),
      icon: <CodepenOutlined />,
    },
    {
      id: 105,
      key: BigDataNavEnum.StatisticalBoard,
      title: i18n.formatMessage({
        id: "bigdata.components.Nav.navList.statisticalBoard",
      }),
      icon: <DashboardOutlined />,
    },
    {
      id: 106,
      key: BigDataNavEnum.TaskExecutionDetails,
      title: i18n.formatMessage({
        id: "bigdata.components.Nav.navList.taskExecutionDetails",
      }),
      icon: <IconFont type="icon-task" />,
    },
  ];

  useEffect(() => {
    if ((!urlState || !urlState.navKey) && !dataAnalysisNavKey) {
      onChangeNavKey(BigDataNavEnum.RealTimeTrafficFlow);
    }
  }, []);

  const dataAnalysisNavKey = localStorage.getItem(
    "clickvisual-data-analysis-nav-key"
  );

  useEffect(() => {
    if (urlState?.navKey) {
      onChangeNavKey(urlState.navKey);
      return;
    }
    if (dataAnalysisNavKey) {
      onChangeNavKey(dataAnalysisNavKey);
    }
  }, []);

  // setUrlState同一时间只能执行一个于是将navKey和nodeId写在一起 参考 https://github.com/alibaba/hooks/issues/1394
  useEffect(() => {
    setUrlState({ navKey: navKey, nodeId: openNodeId });
    onSetLocalData({ openNodeId }, LocalModuleType.dataAnalysisOpenNodeId);
  }, [openNodeId, navKey]);

  return (
    <div className={style.nav}>
      {navList.map(
        (item: { id: number; title: string; key: string; icon: any }) => {
          return (
            <div
              className={style.navItem}
              onClick={() => {
                if (item.key !== BigDataNavEnum.RealTimeTrafficFlow) {
                  setNodes([]);
                  setEdges([]);
                }
                setUrlState({ navKey: item.key, nodeId: undefined });
                // changeOpenNodeId();
                // changeOpenNodeParentId(0);
                // changeOpenNodeData(undefined);
                // changeFolderContent("");
                dataSourceManage.changeSourceList([]);
                // manageNode.setSelectNode({});
                manageNode.setSelectKeys([]);
                temporaryQuery.setSelectNodeKeys([]);
                onChangeNavKey(item.key);
                onSetLocalData(null, LocalModuleType.dataAnalysisOpenNodeId);
                localStorage.setItem(
                  "clickvisual-data-analysis-nav-key",
                  item.key
                );
              }}
              key={item.key}
              style={{ backgroundColor: item.key == navKey ? "#F9CDB5" : "" }}
            >
              <Tooltip title={item.title} placement="right">
                {item.icon}
              </Tooltip>
            </div>
          );
        }
      )}
    </div>
  );
};
export default DataAnalysisNav;
