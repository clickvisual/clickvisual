import RealTimeSVG from "@/assets/images/realtime.svg";
import OfflineSVG from "@/assets/images/offline.svg";
import MySQLSVG from "@/assets/images/mysql.svg";
import ClickhouseSVG from "@/assets/images/clickhouse.svg";
import {
  DashboardOutlined,
  FileOutlined,
  LoginOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

export enum SVGTypeEnums {
  mysql = "mysql",
  clickhouse = "clickhouse",
  realtime = "realtime",
  offline = "offline",
  default = "default",
  start = "start",
  end = "end",
  board = "board",
}

const SVGIcon = ({ type }: { type: SVGTypeEnums }) => {
  if (type === SVGTypeEnums.default) {
    return <FileOutlined />;
  }
  if (type === SVGTypeEnums.start) {
    return <LoginOutlined />;
  }
  if (type === SVGTypeEnums.end) {
    return <LogoutOutlined />;
  }

  if (type === SVGTypeEnums.board) {
    return <DashboardOutlined />;
  }

  const srcType = () => {
    switch (type) {
      case SVGTypeEnums.mysql:
        return MySQLSVG;
      case SVGTypeEnums.clickhouse:
        return ClickhouseSVG;
      case SVGTypeEnums.realtime:
        return RealTimeSVG;
      case SVGTypeEnums.offline:
        return OfflineSVG;
    }
  };
  return (
    <img
      src={srcType()}
      style={{ display: "inline-block", width: 16, height: 16 }}
      alt={"sql"}
    />
  );
};
export default SVGIcon;
