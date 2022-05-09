import React, { useEffect, useMemo } from "react";
import { Avatar, Select, TreeSelect } from "antd";
import { SelectProps } from "antd/es/select";
import useConsole, { DepTree } from "../../hooks/useConsole";
import { Console } from "@/services/console";
import styled from "styled-components";

const { TreeNode } = TreeSelect;

export interface UserSelectProps
  extends Omit<
    SelectProps<number>,
    | "onChange"
    | "mode"
    | "options"
    | "filterSort"
    | "maxTagPlaceholder"
    | "onSelect"
    | "onDeselect"
    | "internalProps"
  > {
  /**
   * @param uid 当 multiple 为 true 时 uid 为数组
   */
  onChange?: (uid: number | number[] | undefined) => void;

  /**
   * @description 是否可以选择多个用户
   */
  multiple?: boolean;

  /**
   * @description 展示的样式. 列表(list) 或者 树(tree)
   * @type 'list' | 'tree'
   */
  mode?: "list" | "tree";

  /**
   * @description 只展示主部门用户. 仅 mode = tree 时生效
   */
  onlyMainDep?: boolean;

  /**
   * @description 无需指定，仅用于调试时强制指定地址
   */
  host?: string;
}

const UserSelect = (props: UserSelectProps) => {
  const { multiple, mode, host, onChange, value, onlyMainDep, ...restProps } =
    props;
  const _value = value || undefined;
  const store = useConsole({ host: host });

  useEffect(() => {
    store.fetchUsers();
  }, [mode]);

  const handleSelect = (uid: number | number[] | undefined) => {
    if (onChange) onChange(uid);
  };

  const renderTree = (
    tree: DepTree,
    depth = 1
  ): React.ReactElement[] | null => {
    return tree.map((dep) => {
      return (
        <TreeNode
          value={`dep:${dep.id}`}
          title={dep.name}
          name={`${dep.name}`}
          disabled
        >
          {dep.children && renderTree(dep.children, depth + 1)}
          {dep.users
            ?.filter((u) => !onlyMainDep || u.mainDep)
            .map((user) => (
              <TreeNode
                key={`${depth}:${dep.id}:${user.uid}`}
                value={user.uid}
                name={`${user.nickname}${user.username}${user.uid}`}
                title={
                  <UserItem>
                    <MyAvatar size={18} src={user.avatar}>
                      {user.nickname}
                    </MyAvatar>
                    <NicknameBox>
                      {user.nickname}({user.username})
                    </NicknameBox>
                  </UserItem>
                }
              />
            ))}
        </TreeNode>
      );
    });
  };

  return (
    <Select<number>
      mode={multiple ? "multiple" : undefined}
      loading={store.usersLoading}
      onChange={handleSelect}
      optionFilterProp="name"
      value={store.usersLoading ? undefined : _value}
      {...restProps}
    >
      {store.users?.map((user) => (
        <Select.Option
          value={user.uid}
          key={user.uid}
          name={`${user.nickname}${user.username}${user.uid}`}
        >
          <MyAvatar size={18} src={user.avatar}>
            {user.nickname}
          </MyAvatar>
          <NicknameBox>
            {user.nickname}({user.username})
          </NicknameBox>
        </Select.Option>
      ))}
    </Select>
  );
};

const UserItem = styled.div``;

const MyAvatar = styled(Avatar)`
  vertical-align: middle;
  margin-top: -2px;
`;

const NicknameBox = styled.span`
  padding-left: 5px;
`;

export default UserSelect;
