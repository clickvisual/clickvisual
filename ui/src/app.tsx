import Footer from "@/components/Footer";
import RightContent from "@/components/RightContent";
import { AVOID_CLOSE_ROUTING, LOGIN_PATH } from "@/config/config";
import { AccountMenus } from "@/services/menu";
import { FetchCurrentUserInfo } from "@/services/users";
import * as Icon from "@ant-design/icons/lib/icons";
import type { MenuDataItem, ProSettings } from "@ant-design/pro-layout";
import { Navigate } from "@umijs/max";
import React from "react";
import { history, IRoute } from "umi";
import defaultSettings from "../config/defaultSettings";
import Logo from "../public/cv.png";

export interface InitialStateType {
  settings: ProSettings;
  menus: MenuDataItem[];
  currentUser?: API.CurrentUser;
}
const LoginPath = [
  process.env.PUBLIC_PATH + "user/login",
  process.env.PUBLIC_PATH + "user/login/",
];
let routeList: IRoute[] = [];

const fetchMenu = async () => {
  const res = await AccountMenus();
  const menuDataRender = (menu = []) => {
    return menu.map((item: any) => {
      if (item.icon !== "") {
        // eslint-disable-next-line no-param-reassign
        item.icon = React.createElement(Icon[item.icon]);
        // eslint-disable-next-line no-param-reassign
        item.children = menuDataRender(item.children || []);
      }
      return item;
    });
  };
  routeList = menuDataRender(res.data);
  return menuDataRender(res.data);
};

// 登录情况下添加重定向路由
export async function patchClientRoutes({ routes }: { routes: any }) {
  if (!LoginPath.includes(document.location.pathname)) {
    if (routeList && routeList.length == 0) await fetchMenu();
    routes.unshift({
      path: "/",
      element: <Navigate to={routeList[0].path} replace />,
    });
  }
}

export async function getInitialState(): Promise<InitialStateType | undefined> {
  const pathname = history.location.pathname;
  if (AVOID_CLOSE_ROUTING.indexOf(pathname) > -1) {
    return { menus: [], settings: defaultSettings };
  }
  const fetchUserInfo = async () => {
    try {
      const res = await FetchCurrentUserInfo();
      if (res.code === 0) return res.data;
      history.push(LOGIN_PATH);
    } catch (error) {
      history.push(LOGIN_PATH);
    }
    return undefined;
  };
  const currentUser = await fetchUserInfo();
  let menus: IRoute[] = [];
  if (routeList && routeList.length == 0) await fetchMenu();
  if (currentUser) menus = routeList || [];
  return {
    menus,
    settings: defaultSettings,
    currentUser,
  };
}

export const layout = ({
  initialState,
}: {
  initialState: InitialStateType;
}): any => {
  const { menus, settings, currentUser } = initialState;
  return {
    menuDataRender: () => menus,
    rightContentRender: () => <RightContent />,
    disableContentMargin: true,
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      const isLogin = AVOID_CLOSE_ROUTING.indexOf(location.pathname) > -1;
      if (!currentUser && !isLogin) {
        history.push(LOGIN_PATH);
      }
      if (currentUser && isLogin) {
        history.push("/");
      }
    },
    links: [],
    menuHeaderRender: undefined,
    logo: Logo,
    ...settings,
  };
};
