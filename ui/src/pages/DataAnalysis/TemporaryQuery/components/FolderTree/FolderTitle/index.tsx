import { FolderEnums } from "@/pages/DataAnalysis/service/enums";
import { Dropdown, message, Popconfirm } from "antd";
import { useState } from "react";
import { useIntl, useModel } from "umi";

const FolderTitle = (props: { id: number; title: any }) => {
  const i18n = useIntl();
  const { id, title } = props;
  const [visibleDropdown, setVisibleDropdown] = useState<boolean>(false);
  const { currentInstances, temporaryQuery, doDeleteNode } =
    useModel("dataAnalysis");

  const {
    getDataList,
    doDeleteFolder,
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
      label: i18n.formatMessage({
        id: "bigdata.components.RightMenu.Scheduling.Modify",
      }),
    },
    // {
    //   key: "move",
    //   label: "移动",
    // },
    {
      key: "delete",
      label: (
        <Popconfirm
          title={`${i18n.formatMessage({
            id: "bigdata.components.FolderTree.FolderTitle.deleteTips",
          })}${
            currentFolder.nodeType == FolderEnums.node
              ? i18n.formatMessage({
                  id: "bigdata.components.FolderTree.FolderTitle.node",
                })
              : i18n.formatMessage({
                  id: "bigdata.components.FolderTree.FolderTitle.folder",
                })
          }`}
          okText={i18n.formatMessage({
            id: "alarm.rules.history.isPushed.true",
          })}
          cancelText={i18n.formatMessage({
            id: "alarm.rules.history.isPushed.false",
          })}
          onConfirm={() => handleDeleteFolder()}
        >
          <div style={{ width: "100%" }}>
            {i18n.formatMessage({ id: "delete" })}
          </div>
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
          message.success(
            i18n.formatMessage({ id: "systemSetting.role.delete.success" })
          );
          getDataList(currentInstances as number);
          setVisibleDropdown(false);
        }
      });
      return;
    }
    doDeleteFolder.run(id).then((res: any) => {
      if (res.code == 0) {
        message.success(
          i18n.formatMessage({ id: "systemSetting.role.delete.success" })
        );
        getDataList(currentInstances as number);
        setVisibleDropdown(false);
      }
    });
  };

  // const rightClickMenu = (
  //   <div
  //     onClick={(e) => {
  //       e.stopPropagation();
  //     }}
  //     style={{ borderRadius: "8px", overflow: "hidden" }}
  //   >
  //     <Menu items={rightClickMenuItem} onClick={handleRightClickMenuItem} />
  //   </div>
  // );

  const handleContextMenu = () => {
    setVisibleDropdown(true);
  };

  return (
    <Dropdown
      menu={{ items: rightClickMenuItem }}
      trigger={["contextMenu"]}
      open={visibleDropdown}
      onOpenChange={(value: any) => {
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
          overflow: "hidden", //超出的文本隐藏
          textOverflow: "ellipsis", //溢出用省略号显示
          whiteSpace: "nowrap", //溢出不换行
        }}
        id="folderTiele"
        onContextMenu={handleContextMenu}
      >
        {title}
      </div>
    </Dropdown>
  );
};

export default FolderTitle;
