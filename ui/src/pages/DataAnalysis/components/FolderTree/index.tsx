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
import React, { useEffect, useMemo, useState } from "react";
import { Key } from "antd/lib/table/interface";
import { useModel, useIntl } from "umi";
import FolderTitle from "@/pages/DataAnalysis/components/FolderTree/FolderTitle";
import { TertiaryEnums } from "@/pages/DataAnalysis/service/enums";
import SVGIcon, { SVGTypeEnums } from "@/components/SVGIcon";

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
  const i18n = useIntl();
  const [searchValue, setSearchValue] = useState("");
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const {
    currentInstances,
    temporaryQuery,
    changeOpenNodeId,
    changeOpenNodeParentId,
    onGetFolderList,
    manageNode,
  } = useModel("dataAnalysis");

  const {
    fileList,
    getDataList,
    changeVisibleFolder,
    changeVisibleNode,
    currentFolder,
    onItemToImportantInfo,
    selectNodeKeys,
    setSelectNodeKeys,
  } = temporaryQuery;

  const { setSelectNode } = manageNode;
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

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
    const loop = (data: any[]): any[] => {
      return data.map((item) => {
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
        const keyValue = item.node;
        if (item.children && item.children.length > 0) {
          return {
            title: <FolderTitle id={parseInt(keyValue.id)} title={title} />,
            key: item.key,
            children: loop(item.children),
            node: item?.node,
          };
        }
        return {
          title: <FolderTitle id={parseInt(keyValue.id)} title={title} />,
          icon:
            !!keyValue.iid &&
            (keyValue.tertiary === TertiaryEnums.clickhouse ? (
              <SVGIcon type={SVGTypeEnums.clickhouse} />
            ) : keyValue.tertiary === TertiaryEnums.mysql ? (
              <SVGIcon type={SVGTypeEnums.mysql} />
            ) : (
              <FileOutlined style={{ color: "#2FABEE" }} />
            )),
          key: item.key,
          node: item?.node,
        };
      });
    };

    const handleAutoExpandParent = (arr: any[]) => {
      let expandKey: any[] = [];
      arr.map((item: any) => {
        const key = item.key;
        if (!item.node.iid) {
          expandKey.push(key);
        }
        if (item?.children?.length > 0) {
          expandKey = [...expandKey, ...handleAutoExpandParent(item.children)];
        }
      });
      return expandKey;
    };
    const treeArr = loop(fileList || []);
    setExpandedKeys(handleAutoExpandParent(treeArr));

    return treeArr;
  }, [fileList, searchValue]);

  const handleSelect = (value: any, { node }: any) => {
    const isOpen = !!node?.node?.iid;
    const id = parseInt(node?.node?.id);
    const folderId = parseInt(node?.node?.folderId);
    onItemToImportantInfo(node?.node);
    if (isOpen) {
      onGetFolderList(id);
      changeOpenNodeId(id);
      changeOpenNodeParentId(folderId);
      setSelectNode(node?.node);
    }
    setSelectNodeKeys(value);
  };

  const handleRightClick = (value: any) => {
    onItemToImportantInfo(value.node.node);
  };

  const handleRefresh = () => {
    getDataList(currentInstances as number);
  };

  const handleCreateFolder = () => {
    if (currentFolder && currentFolder.parentId >= 0) {
      message.info(
        i18n.formatMessage({
          id: "bigdata.components.FolderTree.createFolderPrompt",
        })
      );
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
      title: i18n.formatMessage({
        id: "bigdata.components.FolderTree.iconList.createNode",
      }),
      icon: <FileAddOutlined />,
      onClick: handleCreateNode,
    },
    {
      id: 102,
      title: i18n.formatMessage({
        id: "bigdata.components.FolderTree.iconList.createFolder",
      }),
      icon: <FolderAddOutlined />,
      onClick: handleCreateFolder,
    },
    {
      id: 103,
      title: i18n.formatMessage({ id: "table.column.filter.refresh" }),
      icon: <RedoOutlined />,
      onClick: handleRefresh,
    },
  ];

  return (
    <div className={TemporaryQueryStyle.folderTreeMain}>
      <div className={TemporaryQueryStyle.title}>
        <span className={TemporaryQueryStyle.titleName}>
          {i18n.formatMessage({ id: "menu.bigdata.temporaryQuery" })}
        </span>
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
            placeholder={i18n.formatMessage({
              id: "bigdata.components.FolderTree.folderName",
            })}
            onChange={handleChange}
            prefix={
              <SearchOutlined style={{ color: "#dfe1ef", fontSize: "20px" }} />
            }
          />
        </div>
      </div>
      <div className={FolderTreeStyle.content}>
        {treeData.length > 0 ? (
          <DirectoryTree
            blockNode
            switcherIcon={<DownOutlined />}
            defaultExpandAll
            onExpand={onExpand}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            onSelect={handleSelect}
            onRightClick={handleRightClick}
            treeData={treeData}
            selectedKeys={selectNodeKeys ?? []}
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
