import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import FolderTreeStyle from "@/pages/DataAnalysis/components/FolderTree/index.less";
import { Empty, Input, message, Tooltip, Tree } from "antd";
import {
  DownOutlined,
  FileAddOutlined,
  FileOutlined,
  FolderAddOutlined,
  RedoOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { DataNode } from "antd/lib/tree";
import "@/pages/DataAnalysis/components/FolderTree/index";
import CreateAndUpdateFolder from "@/pages/DataAnalysis/components/FolderTree/CreateAndUpdateFolder";
import CreateAndUpdateNode from "@/pages/DataAnalysis/components/FolderTree/CreateAndUpdateNode";
import { useEffect, useState } from "react";
import React, { useMemo } from "react";
import { Key } from "antd/lib/table/interface";
import { useModel } from "umi";
import FolderTitle from "@/pages/DataAnalysis/components/FolderTree/FolderTitle";

const { DirectoryTree } = Tree;

const defaultData: DataNode[] = [];

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
  const {
    currentInstances,
    temporaryQuery,
    changeOpenNodeId,
    changeOpenNodeParentId,
  } = useModel("dataAnalysis");

  const {
    fileList,
    getDataList,
    changeVisibleFolder,
    changeVisibleNode,
    currentFolder,
    onKeyToImportantInfo,
  } = temporaryQuery;

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
        const keyValueList = item.key.toString().split("-");
        if (item.children && item.children.length > 0) {
          return {
            title: (
              <FolderTitle
                item={item}
                id={parseInt(keyValueList[1])}
                title={title}
              />
            ),
            key: item.key,
            children: loop(item.children),
          };
        }
        return {
          title: <FolderTitle id={parseInt(keyValueList[1])} title={title} />,
          icon: keyValueList[4] == "true" && (
            <FileOutlined style={{ color: "#2FABEE" }} />
          ),
          key: item.key,
        };
      });

    return loop(fileList || []);
  }, [fileList, searchValue]);

  const handleSelect = (value: any) => {
    const isOpen = value[0].split("-")[4] == "true";
    const id = parseInt(value[0].split("-")[1]);
    const folderId = parseInt(value[0].split("-")[0]);
    onKeyToImportantInfo(value[0]);
    isOpen && changeOpenNodeId(id);
    isOpen && changeOpenNodeParentId(folderId);
  };

  const handleRightClick = (value: any) => {
    onKeyToImportantInfo(value.node.key);
  };

  const handleRefresh = () => {
    getDataList(currentInstances as number);
  };

  const handleCreateFolder = () => {
    if (currentFolder && currentFolder.parentId >= 0) {
      message.info("暂时只支持新建2级文件夹~");
      return;
    }
    changeVisibleFolder(true);
  };

  const handleCreateNode = () => {
    changeVisibleNode(true);
  };

  useEffect(() => {
    currentInstances && getDataList(currentInstances as number);
  }, [currentInstances]);

  const iconList = [
    {
      id: 101,
      title: "新建节点",
      icon: <FileAddOutlined />,
      onClick: handleCreateNode,
    },
    {
      id: 102,
      title: "新建文件夹",
      icon: <FolderAddOutlined />,
      onClick: handleCreateFolder,
    },
    {
      id: 103,
      title: "刷新",
      icon: <RedoOutlined />,
      onClick: handleRefresh,
    },
  ];

  return (
    <div className={TemporaryQueryStyle.folderTreeMain}>
      <div className={TemporaryQueryStyle.title}>
        <span className={TemporaryQueryStyle.titleName}>临时查询</span>
        <div className={TemporaryQueryStyle.iconList}>
          {iconList.map((item: any) => {
            return (
              <div
                className={TemporaryQueryStyle.button}
                onClick={item.onClick}
                key={item.id}
              >
                <Tooltip title={item.title}>{item.icon}</Tooltip>
              </div>
            );
          })}
        </div>
      </div>
      <div className={TemporaryQueryStyle.searchBox}>
        <div className={TemporaryQueryStyle.search}>
          <Input
            placeholder="文件名称"
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
      <div className={FolderTreeStyle.content}>
        {treeData.length > 0 ? (
          <DirectoryTree
            // showLine
            blockNode
            switcherIcon={<DownOutlined />}
            defaultExpandAll
            onExpand={onExpand}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            onSelect={handleSelect}
            onRightClick={handleRightClick}
            treeData={treeData}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
        )}
      </div>
      <CreateAndUpdateFolder />
      <CreateAndUpdateNode />
    </div>
  );
};

export default FolderTree;
