import RightContent from "@/components/RightContent";
import Footer from "@/components/Footer";
import type {
  BasicLayoutProps,
  MenuDataItem,
  ProSettings,
} from "@ant-design/pro-layout";
import defaultSettings from "../config/defaultSettings";
import { AccountMenus } from "@/services/menu";
import React from "react";
import * as Icon from "@ant-design/icons/lib/icons";
import Logo from "../public/logo.svg";
import { FetchCurrentUserInfo } from "@/services/users";
import { HOME_PATH, LOGIN_PATH } from "@/config/config";
import { history } from "umi";

export interface InitialStateType {
  settings: ProSettings;
  menus: MenuDataItem[];
  currentUser?: API.CurrentUser;
}

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
  return menuDataRender(res.data);
};

export async function getInitialState(): Promise<InitialStateType | undefined> {
  const pathname = history.location.pathname;
  if (pathname === LOGIN_PATH || pathname === `${LOGIN_PATH}`) {
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
  let menus = [];
  if (currentUser) menus = (await fetchMenu()) || [];
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
}): BasicLayoutProps => {
  const { menus, settings } = initialState;
  return {
    menuDataRender: () => menus,
    rightContentRender: () => <RightContent />,
    disableContentMargin: false,
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      const isLogin =
        location.pathname === LOGIN_PATH ||
        location.pathname === `${LOGIN_PATH}/`;
      if (!initialState?.currentUser && !isLogin) {
        history.push(LOGIN_PATH);
      }
      if (initialState?.currentUser && isLogin) {
        history.push(HOME_PATH);
      }
    },
    links: [],
    menuHeaderRender: undefined,
    logo: Logo,
    ...settings,
  };
};
