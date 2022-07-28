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
import styled from "styled-components";
import { ReactNode, useMemo } from "react";

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
const ImgIcon = ({ src }: { src: string }) => {
  return <img src={src} alt={""} />;
};

const icons: { [K in keyof typeof SVGTypeEnums]: ReactNode } = {
  [SVGTypeEnums.mysql]: <ImgIcon src={MySQLSVG} />,
  [SVGTypeEnums.clickhouse]: <ImgIcon src={ClickhouseSVG} />,
  [SVGTypeEnums.realtime]: <ImgIcon src={RealTimeSVG} />,
  [SVGTypeEnums.offline]: <ImgIcon src={OfflineSVG} />,
  [SVGTypeEnums.default]: <FileOutlined />,
  [SVGTypeEnums.start]: <LoginOutlined />,
  [SVGTypeEnums.end]: <LogoutOutlined />,
  [SVGTypeEnums.board]: <DashboardOutlined />,
};

const SVGIcon = ({ type }: { type: SVGTypeEnums }) => {
  const SvgIcon = useMemo(() => icons[type], [type]);

  return <StyleSvgSpan>{SvgIcon}</StyleSvgSpan>;
};

const StyleSvgSpan = styled.span`
  img {
    display: "inline-block";
    width: 16px;
    height: 16px;
  }
`;
export default SVGIcon;
