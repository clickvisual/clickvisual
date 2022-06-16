import { Dropdown, Menu, message, Popconfirm } from "antd";
import { useState } from "react";
import { useModel } from "umi";
import { FolderEnums } from "@/pages/DataAnalysis/service/enums";

const FolderTiele = (props: { id: number; title: any }) => {
  const { id, title } = props;
  const [visibleDropdown, setVisibleDropdown] = useState<boolean>(false);
  const { currentInstances, temporaryQuery } = useModel("dataAnalysis");

  const {
    getDataList,
    doDeleteFolder,
    doDeleteNode,
    currentFolder,
    changeIsUpdateNode,
    changeVisibleFolder,
    changeVisibleNode,
    changeIsUpdateFolder,
    changeCurrentFolder,
  } = temporaryQuery;
  // 右键菜单的选项
  const rightClickMenuItem = [
    {
      key: "rename",
      label: "修改",
    },
    // {
    //   key: "move",
    //   label: "移动",
    // },
    {
      key: "delete",
      label: (
        <Popconfirm
          title={`确认删除吗?类型：${
            currentFolder.nodeType == FolderEnums.node ? "节点" : "文件夹"
          }`}
          okText="是"
          cancelText="否"
          onConfirm={() => handleDeleteFolder()}
        >
          <div style={{ width: "100%" }}>删除</div>
        </Popconfirm>
      ),
    },
  ];

  const handleRightClickMenuItem = (data: { key: string }) => {
    const { key } = data;
    switch (key) {
      case "rename":
        if (currentFolder.nodeType == FolderEnums.node) {
          changeIsUpdateNode(true);
          changeVisibleNode(true);
          setVisibleDropdown(false);
          return;
        }
        changeIsUpdateFolder(true);
        changeVisibleFolder(true);
        setVisibleDropdown(false);

        break;
      case "move":
        break;
      case "delete":
        break;

      default:
        break;
    }
  };

  const handleDeleteFolder = () => {
    if (currentFolder.nodeType == FolderEnums.node) {
      doDeleteNode.run(id).then((res: any) => {
        if (res.code == 0) {
          message.success("删除成功");
          getDataList(currentInstances as number);
          setVisibleDropdown(false);
        }
      });
      return;
    }
    doDeleteFolder.run(id).then((res: any) => {
      if (res.code == 0) {
        message.success("删除成功");
        getDataList(currentInstances as number);
        setVisibleDropdown(false);
      }
    });
  };

  const rightClickMenu = (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{ borderRadius: "8px", overflow: "hidden" }}
    >
      <Menu items={rightClickMenuItem} onClick={handleRightClickMenuItem} />
    </div>
  );

  const handleContextMenu = () => {
    setVisibleDropdown(true);
  };

  return (
    <Dropdown
      overlay={rightClickMenu}
      trigger={["contextMenu"]}
      visible={visibleDropdown}
      onVisibleChange={(value: any) => {
        setVisibleDropdown(value);
        !value &&
          changeCurrentFolder({
            id: 0,
            parentId: 0,
            name: "",
            desc: "",
            nodeType: 0,
          });
      }}
    >
      <div
        style={{
          width: "calc(100% - 24px)",
        }}
        id="folderTiele"
        onContextMenu={handleContextMenu}
      >
        {title}
      </div>
    </Dropdown>
  );
};

export default FolderTiele;
