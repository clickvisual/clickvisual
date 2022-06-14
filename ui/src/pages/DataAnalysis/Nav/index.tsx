import style from "../index.less";
import { ClusterOutlined, MonitorOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useModel } from "umi";
import useUrlState from "@ahooksjs/use-url-state";
import { useEffect } from "react";

export enum bigDataNavEnum {
  RealTimeTrafficFlow = "realtime",
  TemporaryQuery = "short",
}

const DataAnalysisNav = () => {
  const [urlState, setUrlState] = useUrlState<any>();
  const { onChangeNavKey, navKey, realTimeTraffic } = useModel("dataAnalysis");
  const { setNodes, setEdges } = realTimeTraffic;

  const navList = [
    {
      id: 101,
      key: bigDataNavEnum.RealTimeTrafficFlow,
      title: "实时业务",
      icon: <ClusterOutlined style={{ color: "#fff" }} />,
    },
    {
      id: 102,
      key: bigDataNavEnum.TemporaryQuery,
      title: "临时查询",
      icon: <MonitorOutlined style={{ color: "#fff" }} />,
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
      onChangeNavKey(bigDataNavEnum.RealTimeTrafficFlow);
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
                if (item.key !== bigDataNavEnum.RealTimeTrafficFlow) {
                  setNodes([]);
                  setEdges([]);
                }
                onChangeNavKey(item.key);
              }}
              key={item.key}
              style={{ backgroundColor: item.key == navKey ? "#5E2608" : "" }}
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
