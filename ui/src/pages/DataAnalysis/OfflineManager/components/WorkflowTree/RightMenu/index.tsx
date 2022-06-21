import { Menu, message } from "antd";
import {
  OfflineRightMenuClickSourceEnums,
  PrimaryEnums,
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import { useCallback, useMemo } from "react";
import { ItemType } from "antd/es/menu/hooks/useItems";
import { AppstoreAddOutlined, EditOutlined } from "@ant-design/icons";
import IconFont from "@/components/IconFont";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import DeletedModal from "@/components/DeletedModal";
import lodash from "lodash";

export interface RightMenuProps {
  clickSource: OfflineRightMenuClickSourceEnums;
  currentNode?: any;
  handleCloseNodeModal?: () => void;
}
const RightMenu = (props: RightMenuProps) => {
  const i18n = useIntl();
  const { clickSource, currentNode, handleCloseNodeModal } = props;
  const { workflow, currentInstances, manageNode } = useModel("dataAnalysis");
  const {
    setVisibleWorkflowEditModal,
    setEditWorkFlow,
    setIsEditWorkflow,
    getWorkflow,
    deleteWorkflow,
    getWorkflows,
    setWorkflowList,
  } = workflow;

  const {
    showNodeModal,
    showFolderModal,
    setExtra,
    setIsEditNode,
    setCurrentNode,
    doDeletedNode,
  } = manageNode;

  const handleClickAddWorkflow = useCallback(
    () => setVisibleWorkflowEditModal(true),
    []
  );

  const handleClickUpdateWorkflow = useCallback(() => {
    if (!currentNode) return;
    getWorkflow.run(currentNode.id).then((res) => {
      if (res?.code !== 0) return;
      setVisibleWorkflowEditModal(() => {
        setEditWorkFlow(res.data);
        setIsEditWorkflow(true);
        return true;
      });
    });
  }, [currentNode]);

  const handleClickDeleteWorkflow = useCallback(() => {
    if (!currentNode || !currentInstances) return;
    DeletedModal({
      content: i18n.formatMessage(
        { id: "bigdata.workflow.delete.content" },
        { workflow: currentNode.name }
      ),
      onOk: () => {
        const hideMessage = message.loading(
          {
            content: i18n.formatMessage({
              id: "bigdata.workflow.delete.loading",
            }),
            key: "workflow",
          },
          0
        );

        deleteWorkflow
          .run(currentNode.id)
          .then((res) => {
            if (res?.code !== 0) {
              hideMessage();
              return;
            }
            getWorkflows.run({ iid: currentInstances! }).then((res) => {
              if (res?.code !== 0) {
                hideMessage();
                return;
              }
              setWorkflowList(res.data);
              message.success(
                {
                  content: i18n.formatMessage({
                    id: "bigdata.workflow.delete.success",
                  }),
                  key: "workflow",
                },
                3
              );
            });
          })
          .catch(() => hideMessage());
      },
    });
  }, [currentNode, currentInstances]);

  const handleClickAddNode = useCallback(
    (
      primary: PrimaryEnums,
      secondary: SecondaryEnums,
      tertiary: TertiaryEnums
    ) => {
      if (!currentInstances) return;
      console.log("currentNode: ", currentNode);
      let extra: any = {
        iid: currentInstances,
        primary: primary,
        secondary: secondary,
        tertiary: tertiary,
        workflowId: currentNode?.workflowId || currentNode?.id,
      };
      extra.folderId =
        clickSource === OfflineRightMenuClickSourceEnums.folder
          ? currentNode?.id
          : currentNode?.folderId;
      setExtra(extra);
      showNodeModal(handleCloseNodeModal);
    },
    [currentNode, currentInstances]
  );

  const handleClickUpdateNode = useCallback(() => {
    if (!currentInstances) return;
    setExtra({
      id: currentNode.id,
      iid: currentInstances,
      folderId: currentNode?.folderId,
      primary: currentNode?.primary,
      secondary: currentNode?.secondary,
      tertiary: currentNode?.tertiary,
    });
    setIsEditNode(true);
    setCurrentNode(currentNode);
    showNodeModal(handleCloseNodeModal);
  }, [currentNode, currentInstances]);

  const handleClickDeleteNode = useCallback(() => {
    if (!currentNode || !currentInstances) return;
    DeletedModal({
      content: `确定删除节点${currentNode.name}吗？`,
      onOk: () => {
        const hideMessage = message.loading(
          {
            content: "删除中....",
            key: "node",
          },
          0
        );

        doDeletedNode
          .run(currentNode.id)
          .then((res) => {
            if (res?.code !== 0) {
              hideMessage();
              return;
            }
            handleCloseNodeModal?.();
            message.success(
              {
                content: "删除成功",
                key: "node",
              },
              3
            );
          })
          .catch(() => hideMessage());
      },
    });
  }, [currentNode, currentInstances]);

  const handleClickAddFolder = useCallback(
    (primary: PrimaryEnums, secondary: SecondaryEnums) => {
      if (!currentInstances) return;
      setExtra({
        iid: currentInstances,
        folderId: currentNode?.parentId,
        primary: primary,
        secondary: secondary,
        workflowId: currentNode?.id,
      });
      showFolderModal(handleCloseNodeModal);
    },
    [currentNode, currentInstances]
  );

  const workflowHeaderMenu: ItemType[] = [
    {
      label: i18n.formatMessage({ id: "bigdata.workflow.rightMenu.add" }),
      key: "add-workflow",
      icon: <AppstoreAddOutlined />,
      onClick: handleClickAddWorkflow,
    },
  ];

  const workflowMenu: ItemType[] = [
    {
      label: i18n.formatMessage({ id: "bigdata.workflow.rightMenu.update" }),
      key: "update-workflow",
      icon: <EditOutlined />,
      onClick: handleClickUpdateWorkflow,
    },
    {
      label: (
        <span style={{ color: "hsl(0,68%,59%)" }}>
          {i18n.formatMessage({ id: "bigdata.workflow.rightMenu.delete" })}
        </span>
      ),
      key: "deleted-workflow",
      icon: <IconFont type={"icon-delete"} />,
      onClick: handleClickDeleteWorkflow,
    },
  ];

  const dataIntegrationMenu: ItemType[] = [
    {
      label: "新建节点",
      key: "add-node",
      children: [
        {
          label: "离线同步",
          key: "offline-sync",
          onClick: () =>
            handleClickAddNode(
              PrimaryEnums.offline,
              SecondaryEnums.dataIntegration,
              TertiaryEnums.offline
            ),
        },
      ],
    },
    {
      label: "新建文件夹",
      key: "add-folder",
      onClick: () =>
        handleClickAddFolder(
          PrimaryEnums.offline,
          SecondaryEnums.dataIntegration
        ),
    },
  ];

  const dataDevelopmentMenu: ItemType[] = [
    {
      label: "新建节点",
      key: "add-node",
      children: [
        {
          label: "MySql",
          key: "MySql",
          onClick: () =>
            handleClickAddNode(
              PrimaryEnums.offline,
              SecondaryEnums.dataMining,
              TertiaryEnums.mysql
            ),
        },
        {
          label: "ClickHouse",
          key: "ClickHouse",
          onClick: () =>
            handleClickAddNode(
              PrimaryEnums.offline,
              SecondaryEnums.dataMining,
              TertiaryEnums.clickhouse
            ),
        },
      ],
    },
    {
      label: "新建文件夹",
      key: "add-folder",
      onClick: () =>
        handleClickAddFolder(PrimaryEnums.offline, SecondaryEnums.dataMining),
    },
  ];

  const nodeMenu: ItemType[] = [
    { label: "修改节点", key: "update-node", onClick: handleClickUpdateNode },
    { label: "删除节点", key: "delete-node", onClick: handleClickDeleteNode },
  ];

  const folderMenu: ItemType[] = [
    {
      label: "新建节点",
      key: "add-node",
      children: [
        {
          label: "离线同步",
          key: "offline-sync",
          onClick: () =>
            handleClickAddNode(
              PrimaryEnums.offline,
              SecondaryEnums.dataIntegration,
              TertiaryEnums.offline
            ),
        },
      ],
    },
    {
      label: "修改文件夹",
      key: "update-folder",
    },
    {
      label: "删除文件夹",
      key: "delete-folder",
    },
  ];

  const menuItems: ItemType[] = useMemo(() => {
    switch (clickSource) {
      case OfflineRightMenuClickSourceEnums.workflowHeader:
        return workflowHeaderMenu;
      case OfflineRightMenuClickSourceEnums.workflowItem:
        return workflowMenu;
      case OfflineRightMenuClickSourceEnums.dataIntegration:
        return dataIntegrationMenu;
      case OfflineRightMenuClickSourceEnums.dataDevelopment:
        return dataDevelopmentMenu;
      case OfflineRightMenuClickSourceEnums.node:
        return nodeMenu;
      case OfflineRightMenuClickSourceEnums.folder:
        let menu = lodash.cloneDeep(folderMenu);

        return menu;
      default:
        return [];
    }
  }, [clickSource]);

  return <Menu items={menuItems} />;
};
export default RightMenu;
