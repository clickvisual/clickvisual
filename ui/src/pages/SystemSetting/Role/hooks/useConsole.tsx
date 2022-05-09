import consoleService, { Console } from "@/services/console";
import useRequestX from "@/hooks/useRequest/useRequest";

export type DepTree = {
  id: number;
  pid: number;
  name: string;
  users?: Console.DepartmentUser[];
  children?: DepTree;
}[];

export interface ConsoleHookOptions {
  /**
   * 无需指定. 仅用于调试
   */
  host?: string;
}

const defaultOptions: ConsoleHookOptions = {};

/**
 * Hook: 使用 "Console统一控制台" 的数据
 */
const useConsole = (options?: ConsoleHookOptions) => {
  const { host } = { ...defaultOptions, ...options };
  const service = consoleService({ host });
  const loadUsersReq = useRequestX(service.queryUsers, {
    loadingText: false,
    defaultLoading: true,
  });

  const fetchUsers = loadUsersReq.run;

  const users = loadUsersReq.data || [];

  return {
    // 用户列表
    users: users,
    usersLoading: loadUsersReq.loading,
    fetchUsers,
  };
};

export default useConsole;
