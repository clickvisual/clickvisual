import React from 'react';
import { Popover, Avatar, Descriptions } from 'antd';
import { request } from "umi";
import { stringify } from 'qs';

// 环境变量中指定，仅用于本地开发调试使用
declare const DEVOPS_UI_MOCK: string;

// 判断是否使用MockAPI
const MockAPI = typeof DEVOPS_UI_MOCK === 'string' && DEVOPS_UI_MOCK === 'true';

if (MockAPI) {
}

export namespace Console {
  export interface DepartmentUser {
    depId: number;
    depName: string;
    uid: number;
    username: string;
    nickname: string;
    email: string;
    isLeader: boolean;
    mainDep: boolean;
    avatar: string;
  }

  export interface Department {
    id: number;
    name: string;
    pid: number;
    users?: DepartmentUser[];
  }

  export interface User {
    uid: number;
    email: string;
    nickname: string;
    username: string;
    avatar: string;
    state: UserState;
  }

  export enum UserState {
    inactive = 0,
    active = 1,
  }

  export interface Site {
    id: number;
    url: string;
    title: string;
    logo?: Upload;
  }

  export interface Upload {
    id: number;
    key: string;
    title: string;
    url: string;
  }

  export interface Res<T> {
    data: T;
    code: number;
    msg: string;
  }

  export interface SelectOption {
    title: string | React.ReactElement;
    value: number;
  }
}


/**
 * 转换用户列表成 SearchTable 可用的枚举列表
 * 用于在Table中渲染用户信息
 */
const convertUserListToEnums = (
  users: Console.User[],
): (Console.User & Console.SelectOption)[] => {
  return users.map(user => ({
    ...user,
    title: (
      <span>
        <Popover
          title={
            <span>
              <Avatar src={user.avatar || undefined}>{user.nickname}</Avatar>
              <span style={{ marginLeft: '5px' }}>{user.nickname}</span>
            </span>
          }
          content={
            <Descriptions column={1} size="small" style={{ width: '220px' }}>
              <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
              <Descriptions.Item label="用户名">
                {user.username}
              </Descriptions.Item>
            </Descriptions>
          }
        >
          <Avatar src={user.avatar || undefined}>{user.nickname}</Avatar>
        </Popover>
        <span style={{ marginLeft: '5px' }}>{user.nickname}</span>
      </span>
    ),
    value: user.uid,
  }));
};

/**
 * 将部门列表转成 SearchTable 可用的枚举列表
 * @param deps 部门列表
 */
const convertDepListToEnums = (
  deps: Console.Department[],
): (Console.Department & Console.SelectOption)[] => {
  return deps.map(dep => ({
    ...dep,
    title: dep.name,
    value: dep.id,
  }));
};

export interface QueryDepartmentsOption {
  /**
   * 是否返回用户列表
   */
  withUser?: boolean;
}

export interface Options {
  /**
   * @description 一般情况下无需指定，调试时可使用该选项强制指定"统一控制台"的访问地址
   */
  host?: string;
}

const consoleService = (options: Options) => {

  /**
   * 查询部门列表
   * @param params
   */
  const queryDepartments = async (params?: QueryDepartmentsOption) => {
    const res = await request<Console.Res<Console.Department[]>>(
        process.env.PUBLIC_PATH + `api/v1/departments?${stringify(params)}`,{ method: "GET" }
    );
    return res.data;
  };

  /**
   * 查询用户列表
   * @param params
   */
  const queryUsers = async (params?: any) => {
    const res = await request<Console.Res<Console.User[]>>(
        process.env.PUBLIC_PATH + `api/v1/users?${stringify(params)}`,{ method: "GET" }
    );
    return res;
  };

  /**
   * 查询站点列表
   * @param params
   */
  const querySites = async (params?: any) => {
    return (
      await request<Console.Res<Console.Site[]>>(
          process.env.PUBLIC_PATH + `api/v1/sites?${stringify(params)}`,{ method: "GET" }
      )
    ).data;
  };

  /**
   * 获取部门枚举列表
   */
  const fetchDepEnums = async () => {
    const deps = await (await queryDepartments()).data;
    return convertDepListToEnums(deps);
  };

  /**
   * 获取用户枚举列表
   */
  const fetchUserEnums = async () => {
    const users = await (await queryUsers()).data;
    return convertUserListToEnums(users);
  };

  return {
    queryDepartments,
    queryUsers,
    querySites,
    fetchDepEnums,
    fetchUserEnums,
  };
};

export default consoleService;
