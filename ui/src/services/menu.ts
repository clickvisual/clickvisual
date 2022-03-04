import { request } from "umi";
import type { MenuDataItem } from "@ant-design/pro-layout";

// 获取用户有权限的菜单
export async function AccountMenus() {
  return request<API.Res<MenuDataItem[] | any>>("/api/v1/menus/list");
}
