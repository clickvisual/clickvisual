import style from "../../index.less";
import {
  ClusterOutlined,
  MonitorOutlined,
  CodeOutlined,
  CodepenOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import { useModel } from "umi";
import useUrlState from "@ahooksjs/use-url-state";
import { useEffect } from "react";
import { BigDataNavEnum } from "@/pages/DataAnalysis";
import useLocalStorages, { LocalModuleType } from "@/hooks/useLocalStorages";

const DataAnalysisNav = () => {
  const [urlState, setUrlState] = useUrlState<any>();
  const { onSetLocalData } = useLocalStorages();
  const {
    onChangeNavKey,
    navKey,
    realTimeTraffic,
    changeOpenNodeId,
    changeOpenNodeParentId,
    changeOpenNodeData,
    changeFolderContent,
    dataSourceManage,
    manageNode,
  } = useModel("dataAnalysis");
  const { setNodes, setEdges } = realTimeTraffic;

  const navList = [
    {
      id: 101,
      key: BigDataNavEnum.RealTimeTrafficFlow,
      title: "实时业务",
      icon: <ClusterOutlined />,
    },
    {
      id: 102,
      key: BigDataNavEnum.TemporaryQuery,
      title: "临时查询",
      icon: <MonitorOutlined />,
    },
    {
      id: 103,
      key: BigDataNavEnum.OfflineManage,
      title: "数据开发",
      icon: <CodeOutlined />,
    },
    {
      id: 104,
      key: BigDataNavEnum.DataSourceManage,
      title: "数据源管理",
      icon: <CodepenOutlined />,
    },
  ];

  const dataAnalysisNavKey = localStorage.getItem("data-analysis-nav-key");

  useEffect(() => {
    if (urlState?.navKey) {
      onChangeNavKey(urlState.navKey);
      return;
    }
    if (dataAnalysisNavKey) {
      onChangeNavKey(dataAnalysisNavKey);
    }
  }, []);

  useEffect(() => {
    if ((!urlState || !urlState.navKey) && !dataAnalysisNavKey) {
      onChangeNavKey(BigDataNavEnum.RealTimeTrafficFlow);
    }
  }, []);

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
                changeOpenNodeId();
                changeOpenNodeParentId(0);
                changeOpenNodeData(undefined);
                changeFolderContent("");
                dataSourceManage.changeSourceList([]);
                manageNode.setSelectNode({});
                manageNode.setSelectKeys([]);
                onChangeNavKey(item.key);
                onSetLocalData(null, LocalModuleType.dataAnalysisOpenNodeId);
                localStorage.setItem("data-analysis-nav-key", item.key);
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
