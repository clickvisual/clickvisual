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

export interface InitialStateType {
  settings: ProSettings;
  menus: MenuDataItem[];
  currentUser?: any;
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
  return menuDataRender(res.data || []);
};

export async function getInitialState(): Promise<InitialStateType | undefined> {
  if (window.location.pathname === "/user/login/") {
    return { menus: [], settings: defaultSettings };
  }
  const currentUser = (await FetchCurrentUserInfo()).data;
  const menus = await fetchMenu();

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
    links: [],
    menuHeaderRender: undefined,
    logo: Logo,
    ...settings,
  };
};
