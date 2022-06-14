import { Dropdown, Menu, message, Popconfirm } from "antd";
import { useEffect, useState } from "react";
import { useModel } from "umi";

const FolderTiele = (props: { id: number; parentId: number; title: any }) => {
  const { id, parentId, title } = props;
  const [visibleDropdown, setVisibleDropdown] = useState<boolean>(false);
  const { currentInstances, temporaryQuery } = useModel("dataAnalysis");

  const {
    getDataList,
    doDeleteFolder,
    changeVisibleFolder,
    changeIsUpdateFolder,
    changeCurrentFolder,
  } = temporaryQuery;
  // 右键菜单的选项
  const rightClickMenuItem = [
    {
      key: "rename",
      label: "重命名",
    },
    {
      key: "move",
      label: "移动",
    },
    {
      key: "delete",
      label: (
        <Popconfirm
          title="确认删除吗"
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
        changeIsUpdateFolder(true);
        changeVisibleFolder(true);
        setVisibleDropdown(false);
        console.log(111);

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
