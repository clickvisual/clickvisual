import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import { Input, Tooltip, Tree } from "antd";
import {
  DiffOutlined,
  DownOutlined,
  FileOutlined,
  FilterOutlined,
  RedoOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { DataNode, EventDataNode } from "antd/lib/tree";
import "@/pages/DataAnalysis/TemporaryQuery/components/FolderTree/index";
import { useState } from "react";
import React, { useMemo } from "react";
import { Key } from "antd/lib/table/interface";
import lodash from "lodash";

const { DirectoryTree } = Tree;
// const treeData: DataNode[] = [
//   {
//     title: "parent 1",
//     key: "0-0",
//     children: [
//       {
//         title: "parent 1-0",
//         key: "0-0-0",
//         children: [
//           {
//             title: "leaf",
//             key: "0-0-0-0",
//           },
//           {
//             title: "leaf",
//             key: "0-0-0-1",
//           },
//           {
//             title: "leaf",
//             key: "0-0-0-2",
//           },
//         ],
//       },
//       {
//         title: "parent 1-1",
//         key: "0-0-1",
//         children: [
//           {
//             title: "leaf",
//             key: "0-0-1-0",
//           },
//         ],
//       },
//       {
//         title: "parent 1-2",
//         key: "0-0-2",
//         children: [
//           {
//             title: "leaf",
//             key: "0-0-2-0",
//           },
//           {
//             title: "leaf",
//             key: "0-0-2-1",
//           },
//         ],
//       },
//     ],
//   },
// ];

// const { Search } = Input;

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
            title,
            key: item.key,
            // isLeaf: true,
            children: loop(item.children),
          };
        }

        return {
          title,
          icon: <FileOutlined />,
          // icon: <></>,
          showIcon: false,
          key: item.key,
        };
      });

    return loop(defaultData);
  }, [searchValue]);

  return (
    <div className={TemporaryQueryStyle.folderTreeMain}>
      <div className={TemporaryQueryStyle.title}>
        <span className={TemporaryQueryStyle.titleName}>临时查询</span>
        <div className={TemporaryQueryStyle.iconList}>
          <div className={TemporaryQueryStyle.button}>
            <Tooltip title="新建">
              <DiffOutlined />
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
        <div className={TemporaryQueryStyle.button}>
          <FilterOutlined />
        </div>
      </div>
      <div className={TemporaryQueryStyle.content}>
        <DirectoryTree
          // showLine
          switcherIcon={<DownOutlined />}
          defaultExpandAll
          onExpand={onExpand}
          expandedKeys={expandedKeys}
          autoExpandParent={autoExpandParent}
          onRightClick={(e) => {
            console.log(e);
          }}
          // onSelect={onSelect}
          treeData={treeData}
        />
      </div>
    </div>
  );
};
export default FolderTree;
