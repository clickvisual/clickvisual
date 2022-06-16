import style from "../index.less";
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

const DataAnalysisNav = () => {
  const [urlState, setUrlState] = useUrlState<any>();
  const { onChangeNavKey, navKey, realTimeTraffic } = useModel("dataAnalysis");
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
      title: "离线查询",
      icon: <CodeOutlined />,
    },
    {
      id: 104,
      key: BigDataNavEnum.DataSourceManage,
      title: "数据源管理",
      icon: <CodepenOutlined />,
    },
  ];

  useEffect(() => {
    setUrlState({ navKey: navKey });
  }, [navKey]);

  useEffect(() => {
    urlState &&
      urlState.navKey &&
      urlState.navKey != navKey &&
      onChangeNavKey(urlState.navKey);
  }, [urlState]);

  useEffect(() => {
    if (!urlState || !urlState.navKey) {
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
                onChangeNavKey(item.key);
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
