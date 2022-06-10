import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import { Dropdown, Input, Menu, Tooltip, Tree } from "antd";
import {
  DownOutlined,
  FileAddOutlined,
  FileOutlined,
  RedoOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { DataNode } from "antd/lib/tree";
import "@/pages/DataAnalysis/TemporaryQuery/components/FolderTree/index";
import { useState } from "react";
import React, { useMemo } from "react";
import { Key } from "antd/lib/table/interface";
// import { useModel } from "umi";

const { DirectoryTree } = Tree;

const x = 3;
const y = 2;
const z = 1;
const defaultData: DataNode[] = [];

const generateData = (
  _level: number,
  _preKey?: React.Key,
  _tns?: DataNode[]
) => {
  const preKey = _preKey || "0";
  const tns = _tns || defaultData;

  const children = [];
  for (let i = 0; i < x; i++) {
    const key = `${preKey}-${i}`;
    tns.push({ title: key, key });
    if (i < y) {
      children.push(key);
    }
  }
  if (_level < 0) {
    return tns;
  }
  const level = _level - 1;
  children.forEach((key, index) => {
    tns[index].children = [];
    return generateData(level, key, tns[index].children);
  });
  return false;
};
generateData(z);

const dataList: { key: React.Key; title: string }[] = [];
const generateList = (data: DataNode[]) => {
  for (let i = 0; i < data.length; i++) {
    const node = data[i];
    const { key } = node;
    dataList.push({ key, title: key as string });
    if (node.children) {
      generateList(node.children);
    }
  }
};
generateList(defaultData);

const getParentKey = (key: React.Key, tree: DataNode[]): React.Key => {
  let parentKey: React.Key;
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.children) {
      if (node.children.some((item) => item.key === key)) {
        parentKey = node.key;
      } else if (getParentKey(key, node.children)) {
        parentKey = getParentKey(key, node.children);
      }
    }
  }
  return parentKey!;
};

const FolderTree: React.FC = () => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  // const { doFolderList } = useModel("dataAnalysis");

  const onExpand = (newExpandedKeys: Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const newExpandedKeys = dataList
      .map((item) => {
        if (item.title.indexOf(value) > -1) {
          return getParentKey(item.key, defaultData);
        }
        return null;
      })
      .filter((item, i, self) => item && self.indexOf(item) === i);
    setExpandedKeys(newExpandedKeys as React.Key[]);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  /* 右键菜单 */
  const indexMenu = (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{ borderRadius: "8px", overflow: "hidden" }}
    >
      <Menu>
        <Menu.Item>重命名</Menu.Item>
        <Menu.Item>移动</Menu.Item>
        <Menu.Item>删除</Menu.Item>
      </Menu>
    </div>
  );

  const treeData = useMemo(() => {
    const loop = (data: DataNode[]): DataNode[] =>
      data.map((item) => {
        const strTitle = item.title as string;
        const index = strTitle.indexOf(searchValue);
        const beforeStr = strTitle.substring(0, index);
        const afterStr = strTitle.slice(index + searchValue.length);
        const title =
          index > -1 ? (
            <span>
              {beforeStr}
              <span className="site-tree-search-value">{searchValue}</span>
              {afterStr}
            </span>
          ) : (
            <span>{item.title}</span>
          );
        if (item.children) {
          return {
            title: (
              <Dropdown
                overlay={indexMenu}
                trigger={["contextMenu"]}
                onVisibleChange={(e) => {
                  e;
                  // setIndexRight(item)
                }}
              >
                <div>{item?.title}</div>
              </Dropdown>
            ),
            key: item.key,
            // isLeaf: true,
            children: loop(item.children),
          };
        }

        return {
          title: (
            <Dropdown
              overlay={indexMenu}
              trigger={["contextMenu"]}
              // onVisibleChange={() => {
              //   // setIndexRight(item)
              // }}
            >
              <div>{item?.title}</div>
            </Dropdown>
          ),
          icon: <FileOutlined />,
          // icon: <></>,
          showIcon: false,
          key: item.key,
        };
      });

    return loop(defaultData);
  }, [searchValue]);

  // useEffect(() => {
  //   doFolderList.run().then((res: any) => {
  //     console.log(res);
  //   });
  // }, []);

  return (
    <div className={TemporaryQueryStyle.folderTreeMain}>
      <div className={TemporaryQueryStyle.title}>
        <span className={TemporaryQueryStyle.titleName}>临时查询</span>
        <div className={TemporaryQueryStyle.iconList}>
          <div className={TemporaryQueryStyle.button}>
            <Tooltip title="新建">
              <FileAddOutlined />
            </Tooltip>
          </div>
          <div className={TemporaryQueryStyle.button}>
            <Tooltip title="刷新">
              <RedoOutlined />
            </Tooltip>
          </div>
        </div>
      </div>
      <div className={TemporaryQueryStyle.searchBox}>
        <div className={TemporaryQueryStyle.search}>
          <Input
            placeholder="文件名称/创建人"
            onChange={handleChange}
            prefix={
              <SearchOutlined style={{ color: "#dfe1ef", fontSize: "20px" }} />
            }
          />
        </div>
        {/* <div className={TemporaryQueryStyle.button}>
          <FilterOutlined />
        </div> */}
      </div>
      <div className={TemporaryQueryStyle.content}>
        <DirectoryTree
          // showLine
          switcherIcon={<DownOutlined />}
          defaultExpandAll
          onExpand={onExpand}
          expandedKeys={expandedKeys}
          autoExpandParent={autoExpandParent}
          // onRightClick={(e) => {
          //   console.log(e);
          // }}
          // onSelect={onSelect}
          treeData={treeData}
        />
      </div>
    </div>
  );
};
export default FolderTree;
