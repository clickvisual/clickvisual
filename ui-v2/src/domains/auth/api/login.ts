import { getV2BasePath } from "../../../shared/layout/VersionSwitcher";

type LoginResponse = {
  code: number;
  msg: string;
  data: string;
};

export async function loginWithPassword(username: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  const response = await fetch(`${getV2BasePath()}/api/admin/users/login`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body
  });
  const payload = (await response.json()) as LoginResponse;
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.msg || "登录失败");
  }
}
