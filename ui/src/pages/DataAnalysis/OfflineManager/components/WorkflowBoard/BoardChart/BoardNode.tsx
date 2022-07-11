import { Dropdown, Menu, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useMemo } from "react";
import { TertiaryEnums } from "@/pages/DataAnalysis/service/enums";
import SVGIcon, { SVGTypeEnums } from "@/components/SVGIcon";
import { NodeBoardIdEnums } from "@/models/dataanalysis/useManageNodeAndFolder";

const BoardNode = ({
  node,
  onDelete,
}: {
  node: any;
  onDelete: (node: any) => void;
}) => {
  const {
    setExtra,
    setIsEditNode,
    setCurrentNode,
    showNodeModal,
    updateBoardNode,
  } = useModel("dataAnalysis", (model) => ({
    setExtra: model.manageNode.setExtra,
    setIsEditNode: model.manageNode.setIsEditNode,
    setCurrentNode: model.manageNode.setCurrentNode,
    showNodeModal: model.manageNode.showNodeModal,
    updateBoardNode: model.manageNode.updateBoardNode,
  }));

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
  const menu = () => {
    let menuItems = [
      {
        onClick: handleDelete,
        label: "删除节点",
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
          label: "修改节点",
          key: "updateNode",
        },
        ...menuItems,
      ];
    }
    return <Menu items={menuItems} />;
  };

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
    <Dropdown overlay={menu} trigger={["contextMenu"]}>
      <div style={{ display: "flex" }}>
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
