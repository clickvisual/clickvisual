import consoleService, { Console } from '@/services/console';
import useRequestX from '@/hooks/useRequest/useRequest';

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
 * 构造组织树
 * @param deps 部门列表
 * @return 部门树
 */
function makeDepTree(deps: Console.Department[] | undefined): DepTree {
  if (!deps) return [];

  const depMap: Map<number, Console.Department[]> = new Map<
    number,
    Console.Department[]
  >();
  deps.forEach(item => {
    depMap.set(item.pid, [...(depMap.get(item.pid) || []), item]);
  });

  const functor = (pid: number): DepTree | undefined => {
    return depMap.get(pid)?.map(dep => {
      return {
        ...dep,
        children: functor(dep.id),
      };
    });
  };

  return (
    depMap.get(0)?.map(dep => ({
      ...dep,
      children: functor(dep.id),
    })) || []
  );
}

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
  const loadDepsReq = useRequestX(service.queryDepartments, {
    loadingText: false,
    defaultLoading: true,
  });

  const fetchUsers = loadUsersReq.run;
  const fetchDepartments = loadDepsReq.run;

  const users = loadUsersReq.data || [];
  const deps = loadDepsReq.data || [];

  return {
    // 用户列表
    users: users,
    usersLoading: loadUsersReq.loading,
    fetchUsers,

    // 部门列表
    departments: deps,
    departmentsLoading: loadDepsReq.loading,
    fetchDepartments,

    depTree: makeDepTree(deps),
  };
};

export default useConsole;
