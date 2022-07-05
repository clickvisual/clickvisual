import RealTimeSVG from "@/assets/images/realtime.svg";
import MysqlSVG from "@/assets/images/mysql.svg";
import ClickhouseSVG from "@/assets/images/clickhouse.svg";
import { FileOutlined, LoginOutlined, LogoutOutlined } from "@ant-design/icons";

export enum SVGTypeEnums {
  mysql = "mysql",
  clickhouse = "clickhouse",
  realtime = "realtime",
  default = "default",
  start = "start",
  end = "end",
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

  const srcType = () => {
    switch (type) {
      case SVGTypeEnums.mysql:
        return MysqlSVG;
      case SVGTypeEnums.clickhouse:
        return ClickhouseSVG;
      case SVGTypeEnums.realtime:
        return RealTimeSVG;
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
