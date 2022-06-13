import style from "../index.less";
import { ClusterOutlined, MonitorOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useModel } from "umi";

const DataAnalysisNav = () => {
  const { onChangeNavKey, navKey } = useModel("dataAnalysis");
  const navList = [
    {
      id: 101,
      key: "RealTimeTrafficFlow",
      title: "实时业务",
      icon: <ClusterOutlined style={{ color: "#fff" }} />,
    },
    {
      id: 102,
      key: "TemporaryQuery",
      title: "临时查询",
      icon: <MonitorOutlined style={{ color: "#fff" }} />,
    },
  ];
  return (
    <div className={style.nav}>
      {navList.map(
        (item: { id: number; title: string; key: string; icon: any }) => {
          return (
            <div
              className={style.navItem}
              onClick={() => onChangeNavKey(item.key)}
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
