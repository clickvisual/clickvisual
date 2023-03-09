import SVGIcon, { SVGTypeEnums } from "@/components/SVGIcon";
import { NodeBoardIdEnums } from "@/models/dataanalysis/useManageNodeAndFolder";
import { TertiaryEnums } from "@/pages/DataAnalysis/service/enums";
import { useModel } from "@umijs/max";
import { Dropdown, Tooltip } from "antd";
import { cloneDeep } from "lodash";
import { useEffect, useMemo, useState } from "react";
import { useIntl } from "umi";

const BoardNode = ({
  node,
  onDelete,
  // showNodeModal,
  updateBoardNode,
}: // setExtra,
// setIsEditNode,
// setCurrentNode,
{
  node: any;
  onDelete: (node: any) => void;
  // showNodeModal: any;
  updateBoardNode: any;
  // setExtra: any;
  // setIsEditNode: any;
  // setCurrentNode: any;
}) => {
  const {
    setExtra,
    setIsEditNode,
    setCurrentNode,
    showNodeModal,
    // updateBoardNode,
    // changeOpenNodeId,
    // setSelectNode,
    // onGetFolderInfo,
    setSelectKeys,
    offlinePaneList,
    onChangeOfflinePaneList,
    onChangeCurrentOfflinePaneActiveKey,
    changeOpenNodeId,
    nodes,
  } = useModel("dataAnalysis", (model) => ({
    setExtra: model.manageNode.setExtra,
    setIsEditNode: model.manageNode.setIsEditNode,
    setCurrentNode: model.manageNode.setCurrentNode,
    showNodeModal: model.manageNode.showNodeModal,
    // updateBoardNode: model.manageNode.updateBoardNode,
    // changeOpenNodeId: model.changeOpenNodeId,
    // setSelectNode: model.manageNode.setSelectNode,
    // onGetFolderInfo: model.onGetFolderInfo,
    setSelectKeys: model.manageNode.setSelectKeys,
    offlinePaneList: model.filePane.offlinePaneList,
    onChangeOfflinePaneList: model.filePane.onChangeOfflinePaneList,
    onChangeCurrentOfflinePaneActiveKey:
      model.filePane.onChangeCurrentOfflinePaneActiveKey,
    changeOpenNodeId: model.changeOpenNodeId,
    nodes: model.manageNode.nodes,
  }));
  const [clickNum, setClickNum] = useState<number>(0);
  const [timeNum, setTimeNum] = useState<number>(0);

  const handleDelete = () => {
    onDelete(node);
  };

  const handleUpdateNode = () => {
    setExtra({
      id: node.id,
      iid: node.iid,
      folderId: node.folderId,
      primary: node.primary,
      secondary: node.secondary,
      tertiary: node.tertiary,
    });
    setIsEditNode(true);
    setCurrentNode(node);
    showNodeModal(updateBoardNode);
  };

  const handleDoubleClick = () => {
    //计时器,计算300毫秒为单位
    let timer = window.setTimeout(() => {
      if (clickNum == 0) {
        //单击事件
      } else if (clickNum == 1) {
        //双击事件
        if (node.tertiary > 0) {
          // 退出编辑
          // changeOpenNodeId(node.id);
          setSelectKeys([`${node.workflowId}-${node.id}-${node.name}`]);
          const clonePaneList = cloneDeep(offlinePaneList);
          if (
            clonePaneList.filter((item: any) => item.key == node.id).length == 0
          ) {
            const nodeItem = nodes.filter((item: any) => {
              return item.id == node.id;
            });
            onChangeOfflinePaneList([
              ...clonePaneList,
              {
                key: node.id.toString(),
                title: node.name || "not name",
                parentId: parseInt(node.parentId),
                node: nodeItem[0],
              },
            ]);
          }
          onChangeCurrentOfflinePaneActiveKey(`${node.id}`);
          changeOpenNodeId(node.id);
          // setSelectNode(node);
          // if (
          //   node.tertiary === TertiaryEnums.clickhouse ||
          //   node.tertiary === TertiaryEnums.mysql
          // ) {
          //   onGetFolderInfo(node.id);
          // }
        }
      }
      setClickNum(0);
    }, 300);
    setTimeNum(timer);
    //记录点击次数
    setClickNum(clickNum + 1);
  };

  useEffect(() => {
    return clearTimeout(timeNum);
  }, []);
  const i18n = useIntl();

  const menu = useMemo(() => {
    let menuItems = [
      {
        onClick: handleDelete,
        label: i18n.formatMessage({
          id: "delete",
        }),
        key: "delete-node",
      },
    ];
    if (
      node.id !== NodeBoardIdEnums.start &&
      node.id !== NodeBoardIdEnums.end
    ) {
      menuItems = [
        {
          onClick: handleUpdateNode,
          label: i18n.formatMessage({
            id: "edit",
          }),
          key: "updateNode",
        },
        ...menuItems,
      ];
    }
    return menuItems;
  }, [node.id]);

  const Icon = useMemo(() => {
    switch (node.tertiary) {
      case TertiaryEnums.realtime:
        return <SVGIcon type={SVGTypeEnums.realtime} />;
      case TertiaryEnums.offline:
        return <SVGIcon type={SVGTypeEnums.offline} />;
      case TertiaryEnums.mysql:
        return <SVGIcon type={SVGTypeEnums.mysql} />;
      case TertiaryEnums.clickhouse:
        return <SVGIcon type={SVGTypeEnums.clickhouse} />;
      case TertiaryEnums.end:
        return <SVGIcon type={SVGTypeEnums.end} />;
      case TertiaryEnums.start:
        return <SVGIcon type={SVGTypeEnums.start} />;
      default:
        return <SVGIcon type={SVGTypeEnums.default} />;
    }
  }, [node]);

  return (
    <Dropdown menu={{ items: menu }} trigger={["contextMenu"]}>
      <div style={{ display: "flex" }} onClick={handleDoubleClick}>
        <div style={{ margin: "0 4px" }}>{Icon}</div>
        <Tooltip title={node.name}>
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {node.name}
          </div>
        </Tooltip>
      </div>
    </Dropdown>
  );
};
export default BoardNode;
