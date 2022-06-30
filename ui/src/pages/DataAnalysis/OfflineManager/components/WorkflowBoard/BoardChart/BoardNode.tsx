import { Dropdown, Menu } from "antd";
import DeletedModal from "@/components/DeletedModal";
import { PrimaryEnums } from "@/pages/DataAnalysis/service/enums";

const BoardNode = ({
  node,
  onDelete,
}: {
  node: any;
  onDelete: (
    node: any,
    params: {
      iid: number;
      primary: PrimaryEnums;
      workflowId: number;
    }
  ) => void;
}) => {
  const handleDelete = () => {
    DeletedModal({
      content: `确定删除节点: ${node.name} 吗？`,
      onOk: () =>
        onDelete([node], {
          iid: node.iid,
          primary: node.primary,
          workflowId: node.workflowId,
        }),
    });
  };
  const menu = (
    <Menu
      items={[
        {
          label: "",
          key: "2",
        },
        {
          onClick: handleDelete,
          label: "删除节点",
          key: "delete-node",
        },
      ]}
    />
  );
  return (
    <Dropdown overlay={menu} trigger={["contextMenu"]}>
      <div>{node.name}</div>
    </Dropdown>
  );
};
export default BoardNode;
