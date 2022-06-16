import { Menu, message } from "antd";
import { OfflineRightMenuClickSourceEnums } from "@/pages/DataAnalysis/service/enums";
import { useCallback, useMemo } from "react";
import { ItemType } from "antd/es/menu/hooks/useItems";
import { AppstoreAddOutlined, EditOutlined } from "@ant-design/icons";
import IconFont from "@/components/IconFont";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { WorkflowInfo } from "@/services/bigDataWorkflow";
import DeletedModal from "@/components/DeletedModal";

export interface RightMenuProps {
  clickSource: OfflineRightMenuClickSourceEnums;
  currentWorkflow?: WorkflowInfo;
}
const RightMenu = (props: RightMenuProps) => {
  const i18n = useIntl();
  const { clickSource, currentWorkflow } = props;
  const { workflow, currentInstances } = useModel("dataAnalysis");
  const {
    setVisibleWorkflowEditModal,
    setEditWorkFlow,
    setIsEditWorkflow,
    getWorkflow,
    deleteWorkflow,
    getWorkflows,
    setWorkflowList,
  } = workflow;

  const handleClickAddWorkflow = useCallback(
    () => setVisibleWorkflowEditModal(true),
    []
  );

  const handleClickUpdateWorkflow = useCallback(() => {
    if (!currentWorkflow) return;
    getWorkflow.run(currentWorkflow.id).then((res) => {
      if (res?.code !== 0) return;
      setVisibleWorkflowEditModal(() => {
        setEditWorkFlow(res.data);
        setIsEditWorkflow(true);
        return true;
      });
    });
  }, [currentWorkflow]);

  const handleClickDeleteWorkflow = useCallback(() => {
    if (!currentWorkflow || !currentInstances) return;
    deleteWorkflow.run(currentWorkflow.id).then((res) => {
      if (res?.code !== 0) return;
      getWorkflows.run({ iid: currentInstances! }).then((res) => {
        if (res?.code !== 0) return;
        setWorkflowList(res.data);
      });
    });
    DeletedModal({
      content: i18n.formatMessage(
        { id: "bigdata.workflow.delete.content" },
        { workflow: currentWorkflow.name }
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
          .run(currentWorkflow.id)
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
  }, [currentWorkflow, currentInstances]);

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
      children: [{ label: "离线同步", key: "offline-sync" }],
    },
    {
      label: "新建文件夹",
      key: "add-folder",
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
        return [];
      default:
        return [];
    }
  }, [clickSource]);

  return <Menu items={menuItems} />;
};
export default RightMenu;
